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
const outputRoot = path.join(repoRoot, "output/itri-demo-view-narrow");

const REQUEST_PATH = "/?scenePreset=regional&m8aV4GroundStationScene=1";
const EXPECTED_NARROW_VERSION = "itri-demo-view-narrow-runtime.v1";
const EXPECTED_DEFAULT_VERSION = "itri-demo-view-default-focus-runtime.v1";
const EXPECTED_ACCEPTANCE_VERSION = "itri-demo-view-acceptance-layer-runtime.v1";
const VIEWPORT_MOBILE = {
  name: "mobile-390x844",
  width: 390,
  height: 844
};
const EXPECTED_EXTERNAL_FAIL_IDS = ["V-02", "V-03", "V-04", "V-05", "V-06"];
const EXPECTED_BOUNDED_ROUTE_IDS = ["F-09", "F-10", "F-11", "F-16"];
const FORBIDDEN_POSITIVE_CLAIMS = [
  "500 leo validated",
  ">=500 leo validated",
  "measured throughput passed",
  "measured throughput ready",
  "live iperf",
  "live ping",
  "external report truth ready",
  "v-02 passed",
  "v-03 passed",
  "v-04 passed",
  "v-05 passed",
  "v-06 passed"
];
const FORBIDDEN_TRANSLATED_POSITIVE_CLAIMS = [
  "full validation",
  "complete validation",
  "complete ≥500 leo multi-orbit validation",
  "complete >=500 leo multi-orbit validation",
  "500 leo full validation",
  "500leo full validation",
  ">=500 leo full validation",
  ">=500leo full validation",
  "≥500 leo full validation",
  "≥500leo full validation",
  "full multi-orbit validation",
  "multi-orbit validation complete",
  "multi-orbit validation completed",
  "≥500 leo validated",
  ">=500 leo validated",
  "500 leo validated",
  "500 leo validation passed",
  "500 leo validation complete",
  "at least 500 leo validated",
  "external validation complete",
  "external validation completed",
  "external validation passed",
  "external validation closed",
  "external test complete",
  "external test completed",
  "external test passed",
  "all requirements complete",
  "all requirements completed",
  "measured throughput passed",
  "measured throughput ready",
  "live iperf",
  "live ping",
  "live policy control",
  "arbitrary rule editing",
  "external report truth",
  "external report validated",
  "dut validation complete",
  ...EXPECTED_EXTERNAL_FAIL_IDS.flatMap((id) => {
    const normalizedId = id.toLowerCase();

    return [
      `${normalizedId} passed`,
      `${normalizedId} completed`,
      `${normalizedId} complete`
    ];
  })
];
const FORBIDDEN_VISIBLE_CLAIMS = [
  ...FORBIDDEN_POSITIVE_CLAIMS,
  ...FORBIDDEN_TRANSLATED_POSITIVE_CLAIMS
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

function assertNoOverlap(first, second, label) {
  const separated =
    first.right <= second.left ||
    second.right <= first.left ||
    first.bottom <= second.top ||
    second.bottom <= first.top;

  assert(
    separated,
    `${label} overlap: ${JSON.stringify({ first, second })}`
  );
}

function assertIncludesAll(actual, expected, label) {
  const missing = expected.filter((item) => !actual.includes(item));
  assert(missing.length === 0, `${label} missing: ${JSON.stringify(missing)}`);
}

async function waitForNarrowReady(client) {
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
          viewportClass: state?.productUx?.layout?.viewportClass ?? null,
          productNarrowVersion: root?.dataset.m8aV4ItriDemoViewNarrow ?? null,
          cardDefaultVersion: card?.dataset.itriDemoL0Version ?? null
        };
      })()`
    );

    if (
      lastState?.bootstrapState === "ready" &&
      lastState?.scenePreset === "regional" &&
      lastState?.hasViewer &&
      lastState?.hasV4Scene &&
      lastState?.viewportClass === "narrow" &&
      lastState?.productNarrowVersion === EXPECTED_NARROW_VERSION &&
      lastState?.cardDefaultVersion === EXPECTED_DEFAULT_VERSION
    ) {
      return lastState;
    }

    await sleep(100);
  }

  throw new Error(`customer narrow view did not become ready: ${JSON.stringify(lastState)}`);
}

async function inspectNarrowDefault(client) {
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
          rect.width > 1 &&
          rect.height > 1 &&
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
      const topStrip = productRoot?.querySelector("[data-m8a-v411-top-strip='true']");
      const controlStrip = productRoot?.querySelector("[data-m8a-v47-control-strip='true']");
      const l0Card = productRoot?.querySelector("[data-itri-demo-l0-briefing-card='true']");
      const l0Primary = productRoot?.querySelector("[data-itri-demo-l0-primary-surface='true']");
      const currentState = productRoot?.querySelector("[data-itri-demo-l0-current-state='true']");
      const currentReason = productRoot?.querySelector("[data-itri-demo-l0-current-reason='true']");
      const activeOrbit = productRoot?.querySelector("[data-itri-demo-l0-active-orbit='true']");
      const rateClass = productRoot?.querySelector("[data-itri-demo-l0-rate-class='true']");
      const nextState = productRoot?.querySelector("[data-itri-demo-l0-next-state='true']");
      const truthBoundary = productRoot?.querySelector("[data-itri-demo-l0-truth-boundary='true']");
      const sequenceRail = productRoot?.querySelector("[data-m8a-v410-sequence-rail='true']");
      const sequenceTrack = productRoot?.querySelector(".m8a-v410-sequence-rail__track");
      const sequenceMarks = Array.from(
        productRoot?.querySelectorAll("[data-m8a-v410-sequence-mark='true']") ?? []
      );
      const activeSequence = productRoot?.querySelector("[data-m8a-v410-sequence-active-summary='true']");
      const nextSequence = productRoot?.querySelector("[data-m8a-v410-sequence-next-summary='true']");
      const detailsButton = productRoot?.querySelector("[data-m8a-v47-control-id='details-toggle']");
      const evidenceButton = productRoot?.querySelector("[data-m8a-v47-control-id='evidence-toggle']");
      const railTrigger = productRoot?.querySelector("[data-m8a-v411-narrow-rail-trigger='true']");
      const sheet = productRoot?.querySelector("[data-m8a-v48-inspector='true']");
      const footerRow = productRoot?.querySelector(".m8a-v411-footer-chip__row");
      const sceneAnnotation = productRoot?.querySelector(".m8a-v47-product-ux__scene-annotation");
      const visibleTinyText = Array.from(productRoot?.querySelectorAll("*") ?? [])
        .filter((element) => {
          if (!(element instanceof HTMLElement) || !isVisible(element)) {
            return false;
          }

          return normalize(element.textContent).length > 0;
        })
        .map((element) => ({
          tag: element.tagName.toLowerCase(),
          className: element.className,
          text: normalize(element.textContent).slice(0, 90),
          fontSize: Number.parseFloat(window.getComputedStyle(element).fontSize),
          rect: rectToPlain(element.getBoundingClientRect())
        }))
        .filter((item) => item.fontSize < 11.95);

      return {
        route: window.location.pathname + window.location.search,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        productDataset: {
          narrowVersion: productRoot?.dataset.m8aV4ItriDemoViewNarrow ?? null,
          defaultVersion: productRoot?.dataset.m8aV4ItriDemoViewDefaultFocus ?? null,
          defaultLayer: productRoot?.dataset.m8aV4ItriDemoViewDefaultLayer ?? null,
          inspectorOpen:
            productRoot?.dataset.m8aV4ItriDemoViewDefaultInspectorOpen ?? null,
          requirementMatrixVisible:
            productRoot?.dataset.m8aV4ItriDemoViewDefaultRequirementMatrixVisible ?? null,
          railDrawerState: productRoot?.dataset.m8aV411HandoverRailDrawerState ?? null
        },
        documentDataset: {
          narrowVersion: document.documentElement.dataset.m8aV4ItriDemoViewNarrow ?? null,
          defaultVersion:
            document.documentElement.dataset.m8aV4ItriDemoViewDefaultFocus ?? null,
          inspectorOpen:
            document.documentElement.dataset.m8aV4ItriDemoViewDefaultInspectorOpen ?? null
        },
        surfaces: {
          topStripVisible: isVisible(topStrip),
          controlStripVisible: isVisible(controlStrip),
          l0CardVisible: isVisible(l0Card),
          l0PrimaryVisible: isVisible(l0Primary),
          sequenceRailVisible: isVisible(sequenceRail),
          sequenceTrackScrollable:
            sequenceTrack instanceof HTMLElement
              ? sequenceTrack.scrollWidth > sequenceTrack.clientWidth
              : false,
          detailsVisible: isVisible(detailsButton),
          evidenceVisible: isVisible(evidenceButton),
          railTriggerVisible: isVisible(railTrigger),
          footerRowVisible: isVisible(footerRow),
          sceneAnnotationVisible: isVisible(sceneAnnotation),
          sheetHidden: sheet instanceof HTMLElement ? sheet.hidden : null,
          sheetVisible: isVisible(sheet)
        },
        rects: {
          topStrip: topStrip instanceof HTMLElement
            ? rectToPlain(topStrip.getBoundingClientRect())
            : null,
          controlStrip: controlStrip instanceof HTMLElement
            ? rectToPlain(controlStrip.getBoundingClientRect())
            : null,
          l0Card: l0Card instanceof HTMLElement
            ? rectToPlain(l0Card.getBoundingClientRect())
            : null,
          sequenceRail: sequenceRail instanceof HTMLElement
            ? rectToPlain(sequenceRail.getBoundingClientRect())
            : null,
          detailsButton: detailsButton instanceof HTMLElement
            ? rectToPlain(detailsButton.getBoundingClientRect())
            : null,
          evidenceButton: evidenceButton instanceof HTMLElement
            ? rectToPlain(evidenceButton.getBoundingClientRect())
            : null,
          railTrigger: railTrigger instanceof HTMLElement
            ? rectToPlain(railTrigger.getBoundingClientRect())
            : null
        },
        copy: {
          currentState: normalize(currentState?.textContent),
          currentReason: normalize(currentReason?.textContent),
          activeOrbit: normalize(activeOrbit?.textContent),
          rateClass: normalize(rateClass?.textContent),
          nextState: normalize(nextState?.textContent),
          truthBoundary: normalize(truthBoundary?.textContent),
          activeSequence: normalize(activeSequence?.textContent),
          nextSequence: normalize(nextSequence?.textContent)
        },
        typography: {
          currentState: fontSizePx(currentState),
          currentReason: fontSizePx(currentReason),
          activeOrbit: fontSizePx(activeOrbit),
          rateClass: fontSizePx(rateClass),
          nextState: fontSizePx(nextState),
          truthBoundary: fontSizePx(truthBoundary),
          activeSequence: fontSizePx(activeSequence),
          nextSequence: fontSizePx(nextSequence),
          markLabelMin: Math.min(
            ...sequenceMarks.map((mark) =>
              fontSizePx(mark.querySelector(".m8a-v410-sequence-rail__label"))
            )
          ),
          markOrbitMin: Math.min(
            ...sequenceMarks.map((mark) =>
              fontSizePx(mark.querySelector(".m8a-v410-sequence-rail__orbit"))
            )
          )
        },
        visibleTinyText,
        visibleRouteText: visibleText(productRoot)
      };
    })()`
  );
}

async function expandBriefingSheet(client) {
  let lastState = null;

  for (let attempt = 0; attempt < 40; attempt += 1) {
    lastState = await evaluateRuntimeValue(
      client,
      `(() => {
        const productRoot = document.querySelector("[data-m8a-v47-product-ux='true']");
        const trigger = productRoot?.querySelector("[data-m8a-v411-narrow-rail-trigger='true']");
        const rail = productRoot?.querySelector("[data-m8a-v411-handover-rail='true']");
        const close = productRoot?.querySelector("[data-m8a-v411-handover-rail-close='true']");
        const scrim = productRoot?.querySelector("[data-m8a-v411-handover-rail-scrim='true']");
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
            rect.width > 1 &&
            rect.height > 1
          );
        };

        if (trigger instanceof HTMLButtonElement && trigger.getAttribute("aria-expanded") !== "true") {
          trigger.click();
        }

        return {
          expanded: trigger?.getAttribute("aria-expanded") ?? null,
          railState: rail?.dataset.m8aV411HandoverRailDrawerState ?? null,
          railPresentation: rail?.dataset.m8aV4ItriDemoViewNarrowPresentation ?? null,
          railHeight: rail instanceof HTMLElement
            ? Math.round(rail.getBoundingClientRect().height)
            : null,
          closeVisible: isVisible(close),
          scrimVisible: isVisible(scrim)
        };
      })()`
    );

    if (
      lastState?.expanded === "true" &&
      lastState?.railState === "open" &&
      lastState?.railPresentation === "bottom-sheet-briefing" &&
      lastState?.closeVisible &&
      lastState?.scrimVisible
    ) {
      return lastState;
    }

    await sleep(100);
  }

  throw new Error(`Briefing sheet did not expand: ${JSON.stringify(lastState)}`);
}

async function closeBriefingSheet(client) {
  await evaluateRuntimeValue(
    client,
    `(() => {
      const close = document.querySelector("[data-m8a-v411-handover-rail-close='true']");
      if (close instanceof HTMLButtonElement) {
        close.click();
      }
    })()`
  );
  await sleep(160);
}

async function openInspector(client, action) {
  let lastState = null;

  for (let attempt = 0; attempt < 50; attempt += 1) {
    lastState = await evaluateRuntimeValue(
      client,
      `((action) => {
        const productRoot = document.querySelector("[data-m8a-v47-product-ux='true']");
        const control = productRoot?.querySelector(
          action === "evidence"
            ? "[data-m8a-v47-control-id='evidence-toggle']"
            : "[data-m8a-v47-control-id='details-toggle']"
        );
        const sheet = productRoot?.querySelector("[data-m8a-v48-inspector='true']");
        const panel = productRoot?.querySelector(
          action === "evidence"
            ? "[data-m8a-v411-inspector-panel='evidence']"
            : "[data-m8a-v411-inspector-panel='decision']"
        );
        const layer = productRoot?.querySelector("[data-itri-demo-l2-acceptance-layer='true']");
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
            rect.width > 1 &&
            rect.height > 1
          );
        };

        if (control instanceof HTMLButtonElement && sheet?.hidden) {
          control.click();
        }

        return {
          action,
          sheetHidden: sheet instanceof HTMLElement ? sheet.hidden : null,
          sheetVisible: isVisible(sheet),
          role: sheet?.getAttribute("role") ?? null,
          ariaModal: sheet?.getAttribute("aria-modal") ?? null,
          presentation: sheet?.dataset.m8aV4ItriDemoViewNarrowPresentation ?? null,
          activeTab: productRoot?.dataset.m8aV411InspectorActiveTab ?? null,
          panelVisible: isVisible(panel),
          layerVisible: isVisible(layer),
          sheetRect: sheet instanceof HTMLElement
            ? rectToPlain(sheet.getBoundingClientRect())
            : null
        };
      })(${JSON.stringify(action)})`
    );

    if (
      lastState?.sheetHidden === false &&
      lastState?.sheetVisible &&
      lastState?.role === "dialog" &&
      lastState?.ariaModal === "true" &&
      lastState?.presentation === "modal-sheet" &&
      lastState?.panelVisible &&
      (action !== "evidence" || lastState?.activeTab === "evidence")
    ) {
      return lastState;
    }

    await sleep(100);
  }

  throw new Error(`${action} inspector did not open as a modal: ${JSON.stringify(lastState)}`);
}

async function closeInspector(client) {
  await evaluateRuntimeValue(
    client,
    `(() => {
      const close = document.querySelector("[data-m8a-v47-control-id='details-close']");
      if (close instanceof HTMLButtonElement) {
        close.click();
      }
    })()`
  );
  await sleep(180);
}

async function inspectEvidence(client) {
  return await evaluateRuntimeValue(
    client,
    `(() => {
      const normalize = (value) => String(value ?? "").replace(/\\s+/g, " ").trim();
      const toList = (value) => String(value ?? "").split("|").filter(Boolean);
      const productRoot = document.querySelector("[data-m8a-v47-product-ux='true']");
      const layer = productRoot?.querySelector("[data-itri-demo-l2-acceptance-layer='true']");
      const coverageItems = Array.from(
        layer?.querySelectorAll("[data-itri-acceptance-requirement='true']") ?? []
      ).map((item) => ({
        id: item.dataset.itriAcceptanceRequirementId ?? null,
        status: item.dataset.itriAcceptanceStatus ?? null,
        disposition: item.dataset.itriAcceptanceDisposition ?? null,
        text: normalize(item.textContent)
      }));

      return {
        layerDataset: {
          version: layer?.dataset.itriDemoL2Version ?? null,
          open: layer?.dataset.itriDemoL2Open ?? null,
          externalFailIds: toList(layer?.dataset.itriDemoL2ExternalFailIds),
          boundedRouteIds: toList(layer?.dataset.itriDemoL2BoundedRouteIds),
          f13RouteNativeScaleClaimed:
            layer?.dataset.itriDemoL2F13RouteNativeScaleClaimed ?? null,
          externalValidationStatus:
            layer?.dataset.itriDemoL2ExternalValidationStatus ?? null
        },
        coverageItems,
        layerText: normalize(layer?.textContent)
      };
    })()`
  );
}

function assertNarrowDefault(inspection) {
  assert(
    inspection.route === REQUEST_PATH,
    `Route path changed: ${JSON.stringify(inspection.route)}`
  );
  assert(
    inspection.viewport.width === VIEWPORT_MOBILE.width &&
      inspection.viewport.height === VIEWPORT_MOBILE.height,
    `Viewport mismatch: ${JSON.stringify(inspection.viewport)}`
  );
  assert(
    inspection.productDataset.narrowVersion === EXPECTED_NARROW_VERSION &&
      inspection.documentDataset.narrowVersion === EXPECTED_NARROW_VERSION &&
      inspection.productDataset.defaultVersion === EXPECTED_DEFAULT_VERSION,
    `Narrow/default version telemetry mismatch: ${JSON.stringify({
      product: inspection.productDataset,
      document: inspection.documentDataset
    })}`
  );
  assert(
    inspection.productDataset.defaultLayer === "L0-first-read-demo-stage" &&
      inspection.productDataset.inspectorOpen === "false" &&
      inspection.productDataset.requirementMatrixVisible === "false",
    `Narrow default must preserve L0 focus: ${JSON.stringify(inspection.productDataset)}`
  );
  assert(
    inspection.surfaces.topStripVisible &&
      inspection.surfaces.controlStripVisible &&
      inspection.surfaces.l0CardVisible &&
      inspection.surfaces.l0PrimaryVisible &&
      inspection.surfaces.sequenceRailVisible &&
      inspection.surfaces.railTriggerVisible &&
      inspection.surfaces.detailsVisible &&
      inspection.surfaces.evidenceVisible,
    `Required narrow surfaces are not visible: ${JSON.stringify(inspection.surfaces)}`
  );
  assert(
    !inspection.surfaces.footerRowVisible &&
      !inspection.surfaces.sceneAnnotationVisible &&
      inspection.surfaces.sheetHidden === true &&
      !inspection.surfaces.sheetVisible,
    `Narrow default should not show tiny persistent text or inspector: ${JSON.stringify(
      inspection.surfaces
    )}`
  );
  assert(
    inspection.surfaces.sequenceTrackScrollable,
    `Sequence rail must become horizontal on narrow: ${JSON.stringify(inspection.surfaces)}`
  );
  assert(
    inspection.rects.l0Card?.width >= 360 &&
      inspection.rects.l0Card?.bottom >= VIEWPORT_MOBILE.height - 2 &&
      inspection.rects.l0Card?.top >= VIEWPORT_MOBILE.height - 320,
    `Briefing card must be a bottom sheet: ${JSON.stringify(inspection.rects.l0Card)}`
  );
  assert(
    inspection.rects.detailsButton?.height >= 44 &&
      inspection.rects.evidenceButton?.height >= 44 &&
      inspection.rects.railTrigger?.height >= 44,
    `Narrow controls must keep 44px targets: ${JSON.stringify(inspection.rects)}`
  );
  assertNoOverlap(
    inspection.rects.controlStrip,
    inspection.rects.sequenceRail,
    "control strip and sequence rail"
  );
  assert(
    inspection.rects.sequenceRail.bottom <= inspection.rects.l0Card.top + 2,
    `Sequence rail must sit above the bottom sheet: ${JSON.stringify(inspection.rects)}`
  );
  assert(
    inspection.copy.currentState &&
      inspection.copy.currentReason &&
      inspection.copy.activeOrbit.includes("Active orbit:") &&
      inspection.copy.rateClass.includes("Modeled rate:") &&
      inspection.copy.nextState &&
      inspection.copy.truthBoundary === "Modeled route review; no live traffic metric.",
    `L0 narrow copy incomplete: ${JSON.stringify(inspection.copy)}`
  );
  assert(
    inspection.typography.currentState >= 18 &&
      inspection.typography.currentReason >= 14 &&
      inspection.typography.activeOrbit >= 14 &&
      inspection.typography.rateClass >= 14 &&
      inspection.typography.nextState >= 14 &&
      inspection.typography.truthBoundary >= 14 &&
      inspection.typography.activeSequence >= 14 &&
      inspection.typography.nextSequence >= 14 &&
      inspection.typography.markLabelMin >= 12 &&
      inspection.typography.markOrbitMin >= 12,
    `Narrow first-read typography is too small: ${JSON.stringify(
      inspection.typography
    )}`
  );
  assert(
    inspection.visibleTinyText.length === 0,
    `Narrow view has visible text below 12px: ${JSON.stringify(
      inspection.visibleTinyText
    )}`
  );

  const visibleRouteText = String(inspection.visibleRouteText ?? "").toLowerCase();
  const hits = FORBIDDEN_VISIBLE_CLAIMS.filter((claim) =>
    visibleRouteText.includes(claim)
  );
  assert(
    hits.length === 0,
    `Narrow default contains forbidden positive claims: ${JSON.stringify({ hits })}`
  );
}

function assertInspectorModal(state, action) {
  assert(
    state.sheetRect?.width >= VIEWPORT_MOBILE.width - 2 &&
      state.sheetRect?.height >= VIEWPORT_MOBILE.height - 2,
    `${action} inspector is not a full mobile modal: ${JSON.stringify(state)}`
  );
}

function assertEvidence(inspection) {
  assert(
    inspection.layerDataset.version === EXPECTED_ACCEPTANCE_VERSION &&
      inspection.layerDataset.open === "true",
    `Acceptance layer version/open mismatch: ${JSON.stringify(inspection.layerDataset)}`
  );
  assertIncludesAll(
    inspection.layerDataset.externalFailIds,
    EXPECTED_EXTERNAL_FAIL_IDS,
    "external fail IDs"
  );
  assertIncludesAll(
    inspection.layerDataset.boundedRouteIds,
    EXPECTED_BOUNDED_ROUTE_IDS,
    "bounded route IDs"
  );
  assert(
    inspection.layerDataset.f13RouteNativeScaleClaimed === "false" &&
      inspection.layerDataset.externalValidationStatus ===
        "explicit-fail-no-retained-pass",
    `Acceptance truth boundary changed: ${JSON.stringify(inspection.layerDataset)}`
  );

  for (const id of EXPECTED_EXTERNAL_FAIL_IDS) {
    const item = inspection.coverageItems.find((entry) => entry.id === id);
    assert(item, `Missing coverage item for ${id}`);
    assert(
      item.status === "external-fail" || item.status === "external-gap",
      `${id} must stay explicit fail/gap: ${JSON.stringify(item)}`
    );
  }

  const layerText = String(inspection.layerText ?? "").toLowerCase();
  const hits = FORBIDDEN_VISIBLE_CLAIMS.filter((claim) =>
    layerText.includes(claim)
  );
  assert(
    hits.length === 0,
    `Acceptance layer contains forbidden positive claims: ${JSON.stringify({ hits })}`
  );
}

async function main() {
  ensureOutputRoot(outputRoot);

  await withStaticSmokeBrowser(async ({ client, baseUrl }) => {
    await setViewport(client, VIEWPORT_MOBILE);
    await client.send("Page.navigate", {
      url: `${baseUrl}${REQUEST_PATH}`
    });
    await waitForNarrowReady(client);
    await waitForGlobeReady(client, "customer demo view narrow");
    await evaluateRuntimeValue(
      client,
      `window.__SCENARIO_GLOBE_VIEWER_CAPTURE__?.m8aV4GroundStationScene?.pause?.()`
    );
    await sleep(500);

    const defaultInspection = await inspectNarrowDefault(client);
    assertNarrowDefault(defaultInspection);
    writeJsonArtifact(
      outputRoot,
      `${VIEWPORT_MOBILE.name}-default-inspection.json`,
      defaultInspection
    );

    const defaultScreenshot = await captureScreenshot(
      client,
      outputRoot,
      `${VIEWPORT_MOBILE.name}-default.png`
    );
    assertScreenshot(defaultScreenshot);

    const expandedBriefing = await expandBriefingSheet(client);
    assert(
      expandedBriefing.railHeight > defaultInspection.rects.l0Card.height,
      `Expanded briefing should expose more content: ${JSON.stringify(expandedBriefing)}`
    );
    writeJsonArtifact(
      outputRoot,
      `${VIEWPORT_MOBILE.name}-briefing-expanded.json`,
      expandedBriefing
    );
    await closeBriefingSheet(client);

    const detailsModal = await openInspector(client, "details");
    assertInspectorModal(detailsModal, "details");
    writeJsonArtifact(
      outputRoot,
      `${VIEWPORT_MOBILE.name}-details-modal.json`,
      detailsModal
    );
    await closeInspector(client);

    const evidenceModal = await openInspector(client, "evidence");
    assertInspectorModal(evidenceModal, "evidence");
    const evidenceInspection = await inspectEvidence(client);
    assertEvidence(evidenceInspection);
    writeJsonArtifact(
      outputRoot,
      `${VIEWPORT_MOBILE.name}-evidence-modal.json`,
      {
        modal: evidenceModal,
        evidence: evidenceInspection
      }
    );

    const evidenceScreenshot = await captureScreenshot(
      client,
      outputRoot,
      `${VIEWPORT_MOBILE.name}-evidence.png`
    );
    assertScreenshot(evidenceScreenshot);
  });

  console.log(`customer demo view narrow validated. Output: ${outputRoot}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
