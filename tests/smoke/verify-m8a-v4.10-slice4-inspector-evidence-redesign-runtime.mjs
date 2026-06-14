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

const REQUIRED_REPORT_TEXT = [
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
    screenshot: "desktop-panel-disclosures-open.png"
  },
  {
    name: "narrow-390x844",
    width: 390,
    height: 844,
    screenshot: "narrow-panel-disclosures-open.png"
  }
];

function serializeRelative(absolutePath) {
  return path.relative(repoRoot, absolutePath);
}

function assertScreenshot(absolutePath, viewport) {
  const stats = statSync(absolutePath);
  assert(
    stats.size > 10_000,
    `Selected-pair panel screenshot is unexpectedly small: ${JSON.stringify({
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
      lastState?.reportButtonCount >= 1
    ) {
      return lastState;
    }

    if (lastState?.bootstrapState === "error") {
      throw new Error(
        `Selected-pair evidence route hit bootstrap error: ${JSON.stringify(
          lastState
        )}`
      );
    }

    await sleep(100);
  }

  throw new Error(
    `Selected-pair evidence route did not become ready: ${JSON.stringify(
      lastState
    )}`
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
      const openReportButton = panel?.querySelector(
        ".v4-projection-side-panel__download-report[data-report-action='open-html']"
      );
      const csvButton = panel?.querySelector(
        ".v4-projection-side-panel__download-report[data-report-action='download-csv']"
      );
      const sourceBoundary = panel?.querySelector("[data-disclosure='sources-non-claims']");
      const policyDisclosure = panel?.querySelector("[data-policy-disclosure='true']");
      const hiddenMachineHooks = panel?.querySelector(
        ".v4-projection-side-panel__evidence-machine-hooks"
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
        drawer: {
          exists: drawer instanceof HTMLElement,
          visible: isVisible(drawer)
        },
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
        policyDisclosure: {
          ...readElement(policyDisclosure),
          open: policyDisclosure instanceof HTMLDetailsElement ? policyDisclosure.open : null
        },
        hiddenMachineHooks: readElement(hiddenMachineHooks)
      };
    })(${JSON.stringify(label)})`
  );
}

async function openDisclosures(client) {
  await evaluateRuntimeValue(
    client,
    `(() => {
      const panel = document.querySelector("[data-v4-projection-side-panel='true']");
      const policySummary = panel?.querySelector("[data-policy-disclosure='true'] summary");
      const sourceSummary = panel?.querySelector("[data-disclosure='sources-non-claims'] summary");
      if (policySummary) {
        policySummary.click();
      }
      if (sourceSummary) {
        sourceSummary.click();
      }
    })()`
  );
  await sleep(180);
}

async function captureReportOpen(client) {
  return await evaluateRuntimeValue(
    client,
    `(async () => {
      const panel = document.querySelector("[data-v4-projection-side-panel='true']");
      const button = panel?.querySelector(
        ".v4-projection-side-panel__download-report[data-report-action='open-html']"
      );
      if (!(button instanceof HTMLButtonElement)) {
        throw new Error("Missing panel evidence report button.");
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

function assertDefaultState(state, viewport) {
  assert(
    state.route === REQUEST_PATH &&
      state.sceneSourceMode === EXPECTED_SCENE_SOURCE_MODE &&
      state.panel.state === "ready" &&
      state.panel.sourceTier === EXPECTED_SOURCE_TIER,
    `${viewport.name} must load selected-pair state: ${JSON.stringify(state)}`
  );
  assert(
    state.drawer.exists === false,
    `${viewport.name} evidence drawer must not exist`
  );
  assert(
    state.policyDisclosure.exists && state.policyDisclosure.open === false,
    `${viewport.name} policy disclosure must start closed: ${JSON.stringify(state.policyDisclosure)}`
  );
  assert(
    state.sourceBoundary.exists && state.sourceBoundary.open === false,
    `${viewport.name} source boundary must start closed: ${JSON.stringify(state.sourceBoundary)}`
  );
}

function assertDisclosuresOpen(state, viewport) {
  assert(
    state.policyDisclosure.open === true,
    `${viewport.name} policy disclosure must be open after click: ${JSON.stringify(state.policyDisclosure)}`
  );
  assert(
    state.sourceBoundary.open === true,
    `${viewport.name} source boundary must be open after click: ${JSON.stringify(state.sourceBoundary)}`
  );
  assert(
    state.openReportButton.visible &&
      state.openReportButton.action === "open-html" &&
      state.csvButton.visible &&
      state.csvButton.action === "download-csv",
    `${viewport.name} report/CSV actions must be visible in panel footer`
  );
  assert(
    state.hiddenMachineHooks.exists &&
      state.hiddenMachineHooks.visible === false,
    `${viewport.name} machine evidence hooks must remain hidden`
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
    `${viewport.name} evidence report action must open a complete HTML report: ${JSON.stringify(
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

async function verifyViewport(client, baseUrl, viewport) {
  await setViewport(client, viewport);
  await client.send("Page.navigate", { url: `${baseUrl}${REQUEST_PATH}` });
  await waitForSelectedPairEvidenceReady(client);
  await waitForGlobeReady(client, "Selected-pair panel smoke");

  const closed = await inspectEvidenceDrawer(client, `${viewport.name}-closed`);
  assertDefaultState(closed, viewport);

  await openDisclosures(client);
  const open = await inspectEvidenceDrawer(client, `${viewport.name}-open`);
  assertDisclosuresOpen(open, viewport);

  const report = await captureReportOpen(client);
  assertReportOpen(report, viewport);

  const screenshotPath = await captureScreenshot(
    client,
    outputRoot,
    viewport.screenshot
  );
  assertScreenshot(screenshotPath, viewport);

  return {
    viewport: viewport.name,
    route: REQUEST_PATH,
    screenshot: serializeRelative(screenshotPath),
    sourceTier: open.panel.sourceTier,
    sceneSourceMode: open.sceneSourceMode,
    reportPrefix: report.prefix
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
    `Selected-pair panel smoke passed. Manifest: ${serializeRelative(
      manifestPath
    )}`
  );
});
