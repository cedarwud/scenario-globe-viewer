import { statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  captureScreenshot,
  ensureOutputRoot,
  evaluateRuntimeValue,
  setViewport,
  sleep,
  waitForGlobeReady,
  withStaticSmokeBrowser,
  writeJsonArtifact
} from "./helpers/m8a-v4-browser-capture-harness.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const outputRoot = path.join(repoRoot, "output/itri-demo-view-default-focus");

const REQUEST_PATH = "/?scenePreset=regional&m8aV4GroundStationScene=1";
const EXPECTED_VERSION = "itri-demo-view-default-focus-runtime.v1";
const VIEWPORT_DESKTOP = {
  name: "desktop-1440x900",
  width: 1440,
  height: 900
};
const FORBIDDEN_DEFAULT_TEXT = [
  "measured throughput",
  "live iperf",
  "iperf closure",
  "external report truth ready",
  ">=500 leo validated",
  "500 leo validated"
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertScreenshot(absolutePath) {
  const stat = statSync(absolutePath);
  assert(stat.size > 10_000, `Screenshot is unexpectedly small: ${absolutePath}`);
}

async function waitForDefaultFocusReady(client) {
  let lastState = null;

  for (let attempt = 0; attempt < 240; attempt += 1) {
    lastState = await evaluateRuntimeValue(
      client,
      `(() => {
        const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
        const state = capture?.m8aV4GroundStationScene?.getState?.();
        const root = document.querySelector("[data-m8a-v47-product-ux='true']");
        const card = root?.querySelector("[data-itri-demo-l0-briefing-card='true']");

        return {
          bootstrapState: document.documentElement.dataset.bootstrapState ?? null,
          scenePreset: document.documentElement.dataset.scenePreset ?? null,
          hasViewer: Boolean(capture?.viewer),
          hasV4Scene: Boolean(state),
          productVersion: root?.dataset.m8aV4ItriDemoViewDefaultFocus ?? null,
          cardVersion: card?.dataset.itriDemoL0Version ?? null,
          cardText: card?.textContent ?? ""
        };
      })()`
    );

    if (
      lastState?.bootstrapState === "ready" &&
      lastState?.scenePreset === "regional" &&
      lastState?.hasViewer &&
      lastState?.hasV4Scene &&
      lastState?.productVersion === EXPECTED_VERSION &&
      lastState?.cardVersion === EXPECTED_VERSION &&
      lastState?.cardText.trim().length > 0
    ) {
      return lastState;
    }

    await sleep(100);
  }

  throw new Error(`ITRI default-focus view did not become ready: ${JSON.stringify(lastState)}`);
}

async function inspectDefaultFocus(client) {
  await evaluateRuntimeValue(client, `document.fonts.ready.then(() => true)`, {
    awaitPromise: true
  });

  return await evaluateRuntimeValue(
    client,
    `(() => {
      const normalize = (value) => String(value ?? "").replace(/\\s+/g, " ").trim();
      const rectToPlain = (rect) => ({
        left: Math.round(rect.left),
        top: Math.round(rect.top),
        right: Math.round(rect.right),
        bottom: Math.round(rect.bottom),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      });
      const isVisible = (element) => {
        if (!(element instanceof HTMLElement)) {
          return false;
        }

        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();

        return (
          !element.hidden &&
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          Number(style.opacity) > 0 &&
          rect.width > 0 &&
          rect.height > 0 &&
          rect.bottom >= 0 &&
          rect.right >= 0 &&
          rect.top <= window.innerHeight &&
          rect.left <= window.innerWidth
        );
      };
      const fontSizePx = (element) =>
        element instanceof HTMLElement
          ? Number.parseFloat(window.getComputedStyle(element).fontSize)
          : null;
      const visibleText = (root) => {
        if (!root) {
          return "";
        }

        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        const chunks = [];

        while (walker.nextNode()) {
          const node = walker.currentNode;
          const parent = node.parentElement;
          const text = normalize(node.textContent);

          if (text && parent instanceof HTMLElement && isVisible(parent)) {
            chunks.push(text);
          }
        }

        return chunks.join(" ");
      };

      const productRoot = document.querySelector("[data-m8a-v47-product-ux='true']");
      const l0Card = productRoot?.querySelector("[data-itri-demo-l0-briefing-card='true']");
      const l0Primary = productRoot?.querySelector("[data-itri-demo-l0-primary-surface='true']");
      const currentState = productRoot?.querySelector("[data-itri-demo-l0-current-state='true']");
      const currentReason = productRoot?.querySelector("[data-itri-demo-l0-current-reason='true']");
      const activeOrbit = productRoot?.querySelector("[data-itri-demo-l0-active-orbit='true']");
      const rateClass = productRoot?.querySelector("[data-itri-demo-l0-rate-class='true']");
      const nextState = productRoot?.querySelector("[data-itri-demo-l0-next-state='true']");
      const truthBoundary = productRoot?.querySelector("[data-itri-demo-l0-truth-boundary='true']");
      const detailsButton = productRoot?.querySelector("[data-m8a-v47-control-id='details-toggle']");
      const evidenceButton = productRoot?.querySelector("[data-m8a-v47-control-id='evidence-toggle']");
      const sheet = productRoot?.querySelector("[data-m8a-v48-inspector='true']");
      const requirementGap = productRoot?.querySelector("[data-itri-requirement-gap-surface='true']");
      const f16Surface = productRoot?.querySelector("[data-itri-f16-export-surface='true']");
      const f09Surface = productRoot?.querySelector("[data-itri-f09-rate-surface='true']");
      const policySurface = productRoot?.querySelector("[data-itri-policy-rule-controls-surface='true']");
      const sequenceRail = productRoot?.querySelector("[data-m8a-v410-sequence-rail='true']");
      const sequenceActive = productRoot?.querySelector("[data-m8a-v410-sequence-active-summary='true']");
      const sequenceNext = productRoot?.querySelector("[data-m8a-v410-sequence-next-summary='true']");

      return {
        route: window.location.pathname + window.location.search,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        documentTelemetry: {
          version: document.documentElement.dataset.m8aV4ItriDemoViewDefaultFocus ?? null,
          layer: document.documentElement.dataset.m8aV4ItriDemoViewDefaultLayer ?? null,
          inspectorOpen:
            document.documentElement.dataset.m8aV4ItriDemoViewDefaultInspectorOpen ?? null,
          requirementMatrixVisible:
            document.documentElement.dataset.m8aV4ItriDemoViewDefaultRequirementMatrixVisible ?? null,
          rateClass: document.documentElement.dataset.m8aV4ItriDemoViewDefaultRateClass ?? null,
          truthBoundary:
            document.documentElement.dataset.m8aV4ItriDemoViewDefaultTruthBoundary ?? null
        },
        productTelemetry: {
          version: productRoot?.dataset.m8aV4ItriDemoViewDefaultFocus ?? null,
          layer: productRoot?.dataset.m8aV4ItriDemoViewDefaultLayer ?? null,
          inspectorOpen:
            productRoot?.dataset.m8aV4ItriDemoViewDefaultInspectorOpen ?? null,
          requirementMatrixVisible:
            productRoot?.dataset.m8aV4ItriDemoViewDefaultRequirementMatrixVisible ?? null,
          currentState:
            productRoot?.dataset.m8aV4ItriDemoViewDefaultCurrentState ?? null,
          nextState:
            productRoot?.dataset.m8aV4ItriDemoViewDefaultNextState ?? null,
          orbitClass:
            productRoot?.dataset.m8aV4ItriDemoViewDefaultOrbitClass ?? null,
          rateClass:
            productRoot?.dataset.m8aV4ItriDemoViewDefaultRateClass ?? null,
          truthBoundary:
            productRoot?.dataset.m8aV4ItriDemoViewDefaultTruthBoundary ?? null
        },
        surfaces: {
          l0CardVisible: isVisible(l0Card),
          l0PrimaryVisible: isVisible(l0Primary),
          detailsVisible: isVisible(detailsButton),
          evidenceVisible: isVisible(evidenceButton),
          sheetHidden: sheet instanceof HTMLElement ? sheet.hidden : null,
          sheetVisible: isVisible(sheet),
          requirementGapVisible: isVisible(requirementGap),
          f16Visible: isVisible(f16Surface),
          f09Visible: isVisible(f09Surface),
          policyVisible: isVisible(policySurface),
          sequenceRailVisible: isVisible(sequenceRail),
          cardRect: l0Card instanceof HTMLElement
            ? rectToPlain(l0Card.getBoundingClientRect())
            : null,
          primaryRect: l0Primary instanceof HTMLElement
            ? rectToPlain(l0Primary.getBoundingClientRect())
            : null
        },
        copy: {
          currentState: normalize(currentState?.textContent),
          currentReason: normalize(currentReason?.textContent),
          activeOrbit: normalize(activeOrbit?.textContent),
          rateClass: normalize(rateClass?.textContent),
          nextState: normalize(nextState?.textContent),
          truthBoundary: normalize(truthBoundary?.textContent),
          sequenceActive: normalize(sequenceActive?.textContent),
          sequenceNext: normalize(sequenceNext?.textContent)
        },
        typography: {
          currentState: fontSizePx(currentState),
          currentReason: fontSizePx(currentReason),
          activeOrbit: fontSizePx(activeOrbit),
          rateClass: fontSizePx(rateClass),
          nextState: fontSizePx(nextState),
          truthBoundary: fontSizePx(truthBoundary),
          sequenceActive: fontSizePx(sequenceActive),
          sequenceNext: fontSizePx(sequenceNext)
        },
        visibleRouteText: visibleText(productRoot)
      };
    })()`
  );
}

async function openEvidence(client) {
  let lastState = null;

  for (let attempt = 0; attempt < 30; attempt += 1) {
    lastState = await evaluateRuntimeValue(
      client,
      `(() => {
        const productRoot = document.querySelector("[data-m8a-v47-product-ux='true']");
        const evidenceButton = productRoot?.querySelector("[data-m8a-v47-control-id='evidence-toggle']");
        const sheet = productRoot?.querySelector("[data-m8a-v48-inspector='true']");
        const evidencePanel = productRoot?.querySelector("[data-m8a-v411-inspector-panel='evidence']");
        const requirementGap = productRoot?.querySelector("[data-itri-requirement-gap-surface='true']");

        if (evidenceButton instanceof HTMLButtonElement && sheet?.hidden) {
          evidenceButton.click();
        }

        const isVisible = (element) => {
          if (!(element instanceof HTMLElement)) {
            return false;
          }

          const style = window.getComputedStyle(element);
          const rect = element.getBoundingClientRect();

          return (
            !element.hidden &&
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            rect.width > 0 &&
            rect.height > 0
          );
        };

        return {
          evidenceExpanded: evidenceButton?.getAttribute("aria-expanded") ?? null,
          sheetHidden: sheet instanceof HTMLElement ? sheet.hidden : null,
          activeTab: productRoot?.dataset.m8aV411InspectorActiveTab ?? null,
          evidencePanelVisible: isVisible(evidencePanel),
          requirementGapVisible: isVisible(requirementGap)
        };
      })()`
    );

    if (
      lastState?.evidenceExpanded === "true" &&
      lastState?.sheetHidden === false &&
      lastState?.activeTab === "evidence" &&
      lastState?.evidencePanelVisible &&
      lastState?.requirementGapVisible
    ) {
      return lastState;
    }

    await sleep(100);
  }

  throw new Error(`Evidence surface did not open: ${JSON.stringify(lastState)}`);
}

function assertDefaultFocus(inspection) {
  assert(
    inspection.route === REQUEST_PATH,
    `Route path changed: ${JSON.stringify(inspection.route)}`
  );
  assert(
    inspection.documentTelemetry.version === EXPECTED_VERSION &&
      inspection.productTelemetry.version === EXPECTED_VERSION,
    `Default-focus version telemetry mismatch: ${JSON.stringify({
      documentTelemetry: inspection.documentTelemetry,
      productTelemetry: inspection.productTelemetry
    })}`
  );
  assert(
    inspection.productTelemetry.layer === "L0-first-read-demo-stage",
    `Default-focus layer mismatch: ${JSON.stringify(inspection.productTelemetry)}`
  );
  assert(
    inspection.productTelemetry.inspectorOpen === "false" &&
      inspection.documentTelemetry.inspectorOpen === "false",
    `Inspector must be closed by default: ${JSON.stringify({
      documentTelemetry: inspection.documentTelemetry,
      productTelemetry: inspection.productTelemetry,
      surfaces: inspection.surfaces
    })}`
  );
  assert(
    inspection.surfaces.l0CardVisible &&
      inspection.surfaces.l0PrimaryVisible &&
      inspection.surfaces.sequenceRailVisible,
    `L0 briefing and sequence rail must be visible: ${JSON.stringify(inspection.surfaces)}`
  );
  assert(
    inspection.surfaces.detailsVisible && inspection.surfaces.evidenceVisible,
    `Details and Evidence actions must remain reachable: ${JSON.stringify(inspection.surfaces)}`
  );
  assert(
    inspection.surfaces.sheetHidden === true &&
      !inspection.surfaces.sheetVisible &&
      !inspection.surfaces.requirementGapVisible &&
      !inspection.surfaces.f16Visible &&
      !inspection.surfaces.f09Visible &&
      !inspection.surfaces.policyVisible,
    `Evidence surfaces must not be visible in the default viewport: ${JSON.stringify(
      inspection.surfaces
    )}`
  );
  assert(
    inspection.surfaces.cardRect?.width >= 320 &&
      inspection.surfaces.cardRect?.height >= 250,
    `Briefing card is too small to carry first-read content: ${JSON.stringify(
      inspection.surfaces.cardRect
    )}`
  );
  assert(
    inspection.copy.currentState &&
      inspection.copy.currentReason &&
      inspection.copy.activeOrbit.includes("Active orbit:") &&
      inspection.copy.rateClass.includes("Modeled rate:") &&
      inspection.copy.nextState &&
      inspection.copy.truthBoundary === "Modeled route review; no live traffic metric.",
    `L0 briefing copy incomplete: ${JSON.stringify(inspection.copy)}`
  );
  assert(
    inspection.typography.currentState >= 18 &&
      inspection.typography.currentReason >= 14 &&
      inspection.typography.activeOrbit >= 14 &&
      inspection.typography.rateClass >= 14 &&
      inspection.typography.nextState >= 14 &&
      inspection.typography.truthBoundary >= 14 &&
      inspection.typography.sequenceActive >= 14 &&
      inspection.typography.sequenceNext >= 14,
    `First-read typography below Phase 1 thresholds: ${JSON.stringify(
      inspection.typography
    )}`
  );

  const visibleRouteText = String(inspection.visibleRouteText ?? "").toLowerCase();
  const hits = FORBIDDEN_DEFAULT_TEXT.filter((text) =>
    visibleRouteText.includes(text)
  );
  assert(
    hits.length === 0,
    `Default viewport contains forbidden claim text: ${JSON.stringify({
      hits,
      visibleRouteText: inspection.visibleRouteText
    })}`
  );
}

async function main() {
  ensureOutputRoot(outputRoot);

  await withStaticSmokeBrowser(async ({ client, baseUrl }) => {
    await setViewport(client, VIEWPORT_DESKTOP);
    await client.send("Page.navigate", {
      url: `${baseUrl}${REQUEST_PATH}`
    });
    await waitForDefaultFocusReady(client);
    await waitForGlobeReady(client, "ITRI demo view default focus");
    await evaluateRuntimeValue(
      client,
      `window.__SCENARIO_GLOBE_VIEWER_CAPTURE__?.m8aV4GroundStationScene?.pause?.()`
    );
    await sleep(500);

    const inspection = await inspectDefaultFocus(client);
    assertDefaultFocus(inspection);

    writeJsonArtifact(
      outputRoot,
      `${VIEWPORT_DESKTOP.name}-inspection.json`,
      inspection
    );

    const screenshot = await captureScreenshot(
      client,
      outputRoot,
      `${VIEWPORT_DESKTOP.name}.png`
    );
    assertScreenshot(screenshot);

    const evidenceState = await openEvidence(client);
    writeJsonArtifact(
      outputRoot,
      `${VIEWPORT_DESKTOP.name}-evidence-open.json`,
      evidenceState
    );
  });

  console.log(`ITRI demo view default focus validated. Output: ${outputRoot}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

