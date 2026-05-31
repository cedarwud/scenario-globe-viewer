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
const outputRoot = path.join(repoRoot, "output/selected-pair-boundary-affordance");

const REQUEST_PATH = SELECTED_PAIR_DEMO_REQUEST_PATH;
const EXPECTED_SCENE_SOURCE_MODE = "tle-first-runtime";
const EXPECTED_SOURCE_TIER = "geometric-derived";
const EXPECTED_EVIDENCE_KIND = "cross-family-geometric";
const REQUIRED_SOURCE_TEXT = [
  "Source boundary",
  "TLE source summary",
  "Standards references",
  "TR 38.821",
  "ITU-R P.618-14",
  "ITU-R P.676-13"
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
    screenshot: "desktop-source-boundary-open.png"
  },
  {
    name: "narrow-390x844",
    width: 390,
    height: 844,
    screenshot: "narrow-source-boundary-open.png"
  }
];

function serializeRelative(absolutePath) {
  return path.relative(repoRoot, absolutePath);
}

function assertScreenshot(absolutePath, viewport) {
  const stats = statSync(absolutePath);
  assert(
    stats.size > 10_000,
    `Selected-pair source-boundary screenshot is unexpectedly small: ${JSON.stringify({
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

async function waitForSelectedPairBoundaryReady(client) {
  let lastState = null;

  for (let attempt = 0; attempt < 240; attempt += 1) {
    lastState = await evaluateRuntimeValue(
      client,
      `(() => {
        const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
        const state = capture?.m8aV4GroundStationScene?.getState?.();
        const panel = document.querySelector("[data-v4-projection-side-panel='true']");
        const footer = panel?.querySelector(
          ".v4-projection-side-panel__footer[data-station-precision-disclosure='true']"
        );
        const drawer = document.getElementById("v4-selected-pair-evidence");
        const trigger = panel?.querySelector(".v4-projection-side-panel__evidence-button");

        return {
          bootstrapState: document.documentElement?.dataset.bootstrapState ?? null,
          scenePreset: document.documentElement?.dataset.scenePreset ?? null,
          route: window.location.pathname + window.location.search,
          hasViewer: Boolean(capture?.viewer),
          hasScene: Boolean(state),
          sceneSourceMode: state?.sceneSourceMode ?? null,
          selectedPairOverlayStatus: state?.selectedPairOverlay?.status ?? null,
          panelState: panel?.dataset.state ?? null,
          panelSourceTier: panel?.dataset.sourceTier ?? null,
          footerExists: footer instanceof HTMLElement,
          drawerExists: drawer instanceof HTMLElement,
          drawerHidden: drawer instanceof HTMLElement ? drawer.hidden : null,
          triggerExists: trigger instanceof HTMLButtonElement
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
      lastState?.panelSourceTier === EXPECTED_SOURCE_TIER &&
      lastState?.footerExists &&
      lastState?.drawerExists &&
      lastState?.drawerHidden === true &&
      lastState?.triggerExists
    ) {
      return lastState;
    }

    if (lastState?.bootstrapState === "error") {
      throw new Error(
        `Selected-pair boundary route hit bootstrap error: ${JSON.stringify(
          lastState
        )}`
      );
    }

    await sleep(100);
  }

  throw new Error(
    `Selected-pair boundary route did not become ready: ${JSON.stringify(
      lastState
    )}`
  );
}

async function installOverlayEventRecorder(client) {
  await evaluateRuntimeValue(
    client,
    `(() => {
      window.__SELECTED_PAIR_BOUNDARY_EVENTS__ = [];
      document.addEventListener("selected-pair-overlay-change", (event) => {
        window.__SELECTED_PAIR_BOUNDARY_EVENTS__.push({
          evidenceDrawerOpen: Boolean(event.detail?.evidenceDrawerOpen),
          stationInfoCardOpen: Boolean(event.detail?.stationInfoCardOpen),
          productInspectorOpen: Boolean(event.detail?.productInspectorOpen),
          blocksTransientHover: Boolean(event.detail?.blocksTransientHover)
        });
      });
    })()`
  );
}

async function inspectBoundaryState(client, label) {
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
      const footer = panel?.querySelector(
        ".v4-projection-side-panel__footer[data-station-precision-disclosure='true']"
      );
      const drawer = document.getElementById("v4-selected-pair-evidence");
      const trigger = panel?.querySelector(".v4-projection-side-panel__evidence-button");
      const close = drawer?.querySelector(".v4-projection-side-panel__evidence-close");
      const sourceBoundary = drawer?.querySelector("[data-disclosure='sources-non-claims']");
      const sourceSummary = sourceBoundary?.querySelector("summary");
      const evidencePackage = Array.from(
        drawer?.querySelectorAll(".v4-projection-side-panel__evidence-card") ?? []
      ).find((card) => /Evidence package/i.test(normalize(card.textContent)));
      const openReportButton = drawer?.querySelector(
        ".v4-projection-side-panel__download-report[data-report-action='open-html']"
      );
      const hiddenMachineHooks = drawer?.querySelector(
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
        footer: {
          ...readElement(footer),
          sourceTier:
            footer instanceof HTMLElement ? footer.dataset.sourceTier ?? null : null,
          evidenceKind:
            footer instanceof HTMLElement ? footer.dataset.evidenceKind ?? null : null,
          badgeLabel:
            footer instanceof HTMLElement ? footer.dataset.badgeLabel ?? null : null,
          stationAPrecision:
            footer instanceof HTMLElement ? footer.dataset.stationAPrecision ?? null : null,
          stationBPrecision:
            footer instanceof HTMLElement ? footer.dataset.stationBPrecision ?? null : null,
          stationARenderPositionIsSourceTruth:
            footer instanceof HTMLElement
              ? footer.dataset.stationARenderPositionIsSourceTruth ?? null
              : null,
          stationBRenderPositionIsSourceTruth:
            footer instanceof HTMLElement
              ? footer.dataset.stationBRenderPositionIsSourceTruth ?? null
              : null
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
          datasetOpen:
            drawer instanceof HTMLElement ? drawer.dataset.open ?? null : null
        },
        close: readElement(close),
        sourceBoundary: {
          ...readElement(sourceBoundary),
          open: sourceBoundary instanceof HTMLDetailsElement ? sourceBoundary.open : null,
          summaryText: normalize(sourceSummary?.textContent),
          summaryVisible: isVisible(sourceSummary)
        },
        evidencePackage: readElement(evidencePackage),
        openReportButton: {
          ...readElement(openReportButton),
          action:
            openReportButton instanceof HTMLElement
              ? openReportButton.dataset.reportAction ?? null
              : null
        },
        hiddenMachineHooks: readElement(hiddenMachineHooks),
        activeElement:
          document.activeElement === close
            ? "close"
            : document.activeElement === trigger
              ? "trigger"
              : document.activeElement === sourceSummary
                ? "source-summary"
                : document.activeElement?.tagName?.toLowerCase() ?? null,
        overlayEvents: window.__SELECTED_PAIR_BOUNDARY_EVENTS__ ?? []
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

async function openSourceBoundary(client) {
  await evaluateRuntimeValue(
    client,
    `(() => {
      const sourceBoundary = document.querySelector("[data-disclosure='sources-non-claims']");
      const summary = sourceBoundary?.querySelector("summary");
      if (!(sourceBoundary instanceof HTMLDetailsElement) || !(summary instanceof HTMLElement)) {
        throw new Error("Missing selected-pair source-boundary disclosure.");
      }
      if (!sourceBoundary.open) {
        summary.click();
      }
    })()`
  );
  await sleep(180);
}

function assertDefaultBoundaryAffordance(state, viewport) {
  const claimHits = collectPositiveClaimHits(
    [state.footer.visibleText, state.panel.visibleText].join(" ")
  );

  assert(
    state.route === REQUEST_PATH &&
      state.sceneSourceMode === EXPECTED_SCENE_SOURCE_MODE &&
      state.panel.state === "ready" &&
      state.panel.sourceTier === EXPECTED_SOURCE_TIER,
    `${viewport.name} must load selected-pair runtime boundary state: ${JSON.stringify(
      state
    )}`
  );
  assert(
    state.footer.visible &&
      state.footer.sourceTier === EXPECTED_SOURCE_TIER &&
      state.footer.evidenceKind === EXPECTED_EVIDENCE_KIND &&
      /Modeled coords/i.test(state.footer.text) &&
      /Geometry only/i.test(state.footer.text) &&
      Boolean(state.footer.stationAPrecision) &&
      Boolean(state.footer.stationBPrecision) &&
      ["true", "false"].includes(
        state.footer.stationARenderPositionIsSourceTruth
      ) &&
      ["true", "false"].includes(
        state.footer.stationBRenderPositionIsSourceTruth
      ),
    `${viewport.name} footer must expose a compact selected-pair source boundary, not full provenance: ${JSON.stringify(
      state.footer
    )}`
  );
  assert(
    state.drawer.hidden === true &&
      state.drawer.visible === false &&
      state.trigger.ariaControls === "v4-selected-pair-evidence" &&
      state.trigger.ariaExpanded === "false" &&
      state.trigger.text === "Details & sources",
    `${viewport.name} boundary detail drawer must stay closed by default: ${JSON.stringify(
      {
        drawer: state.drawer,
        trigger: state.trigger
      }
    )}`
  );
  assert(
    !/TLE source summary|Standards references|Raw JSON payload/i.test(
      state.footer.visibleText
    ),
    `${viewport.name} compact boundary affordance must not expose row-level source details in the main panel: ${JSON.stringify(
      state.footer
    )}`
  );
  assert(
    claimHits.length === 0,
    `${viewport.name} default selected-pair boundary text must not promote operator or measured-service claims: ${JSON.stringify(
      claimHits
    )}`
  );
}

function assertDrawerBoundaryClosed(state, viewport) {
  assert(
    state.drawer.visible &&
      state.drawer.hidden === false &&
      state.drawer.datasetOpen === "true" &&
      state.trigger.ariaExpanded === "true" &&
      state.trigger.text === "Hide details" &&
      state.activeElement === "close",
    `${viewport.name} Details & sources must open the drawer and focus close: ${JSON.stringify(
      {
        drawer: state.drawer,
        trigger: state.trigger,
        activeElement: state.activeElement
      }
    )}`
  );
  assert(
    state.sourceBoundary.exists &&
      state.sourceBoundary.summaryVisible &&
      state.sourceBoundary.summaryText === "Source boundary" &&
      state.sourceBoundary.open === false &&
      /Geometric pair|visibility-derived|Source boundary/i.test(
        state.sourceBoundary.text
      ),
    `${viewport.name} source boundary must be a collapsed secondary disclosure when drawer opens: ${JSON.stringify(
      state.sourceBoundary
    )}`
  );
  assert(
    state.evidencePackage.visible &&
      state.openReportButton.visible &&
      state.openReportButton.action === "open-html",
    `${viewport.name} report action must stay separate from source-boundary disclosure: ${JSON.stringify(
      {
        evidencePackage: state.evidencePackage,
        openReportButton: state.openReportButton
      }
    )}`
  );
  assert(
    state.hiddenMachineHooks.exists &&
      state.hiddenMachineHooks.hidden === true &&
      state.hiddenMachineHooks.visible === false,
    `${viewport.name} hidden machine evidence hooks must not become the boundary affordance: ${JSON.stringify(
      state.hiddenMachineHooks
    )}`
  );
  assert(
    state.overlayEvents.some(
      (event) =>
        event.evidenceDrawerOpen === true &&
        event.blocksTransientHover === true &&
        event.productInspectorOpen === false
    ),
    `${viewport.name} drawer open must publish blocking overlay state without opening product inspector: ${JSON.stringify(
      state.overlayEvents
    )}`
  );
}

function assertSourceBoundaryOpen(state, viewport) {
  const missingText = REQUIRED_SOURCE_TEXT.filter(
    (text) => !state.sourceBoundary.visibleText.includes(text)
  );
  const claimHits = collectPositiveClaimHits(state.sourceBoundary.visibleText);

  assert(
    state.drawer.visible &&
      state.drawer.datasetOpen === "true" &&
      state.trigger.ariaExpanded === "true" &&
      state.sourceBoundary.open === true,
    `${viewport.name} Source boundary must open inside the already-open evidence drawer: ${JSON.stringify(
      {
        drawer: state.drawer,
        trigger: state.trigger,
        sourceBoundary: state.sourceBoundary
      }
    )}`
  );
  assertRectInsideViewport(
    state.drawer.rect,
    viewport,
    "selected-pair source-boundary drawer",
    "Selected-pair boundary affordance smoke"
  );
  assert(
    missingText.length === 0,
    `${viewport.name} opened source boundary must expose source, standards, and health evidence: ${JSON.stringify(
      {
        missingText,
        sourceBoundary: state.sourceBoundary
      }
    )}`
  );
  assert(
    state.evidencePackage.visible &&
      state.openReportButton.visible &&
      state.openReportButton.action === "open-html",
    `${viewport.name} source-boundary disclosure must not replace the report action: ${JSON.stringify(
      {
        evidencePackage: state.evidencePackage,
        openReportButton: state.openReportButton
      }
    )}`
  );
  assert(
    claimHits.length === 0,
    `${viewport.name} opened source-boundary text must not promote operator or measured-service claims: ${JSON.stringify(
      claimHits
    )}`
  );
}

async function verifyViewport(client, baseUrl, viewport) {
  await setViewport(client, viewport);
  await client.send("Page.navigate", { url: `${baseUrl}${REQUEST_PATH}` });
  await waitForSelectedPairBoundaryReady(client);
  await waitForGlobeReady(client, "Selected-pair boundary affordance smoke");
  await installOverlayEventRecorder(client);

  const defaultState = await inspectBoundaryState(
    client,
    `${viewport.name}-default`
  );
  assertDefaultBoundaryAffordance(defaultState, viewport);

  await openEvidenceDrawer(client);
  const drawerOpen = await inspectBoundaryState(
    client,
    `${viewport.name}-drawer-open`
  );
  assertDrawerBoundaryClosed(drawerOpen, viewport);

  await openSourceBoundary(client);
  const sourceOpen = await inspectBoundaryState(
    client,
    `${viewport.name}-source-boundary-open`
  );
  assertSourceBoundaryOpen(sourceOpen, viewport);

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
    sourceTier: sourceOpen.footer.sourceTier,
    evidenceKind: sourceOpen.footer.evidenceKind,
    footerText: sourceOpen.footer.text,
    sourceBoundaryText: sourceOpen.sourceBoundary.visibleText,
    overlayEvents: sourceOpen.overlayEvents
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
    `Selected-pair source-boundary affordance smoke passed. Manifest: ${serializeRelative(
      manifestPath
    )}`
  );
});
