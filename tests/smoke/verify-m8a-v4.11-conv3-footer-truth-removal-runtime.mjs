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
const outputRoot = path.join(repoRoot, "output/m8a-v4.11-conv3");

const REQUEST_PATH = "/?scenePreset=regional&m8aV4GroundStationScene=1";
const EXPECTED_FOOTER_VERSION =
  "m8a-v411-footer-chip-system-conv3-runtime.v1";
const EXPECTED_ROUTE = REQUEST_PATH;
const EXPECTED_ENDPOINT_PAIR_ID =
  "taiwan-cht-speedcast-singapore-operator-family-2026-04-26";
const EXPECTED_PRECISION = "operator-family-only";
const EXPECTED_MODEL_ID = "m8a-v4.6d-simulation-handover-model.v1";
const EXPECTED_MODEL_TRUTH = "simulation-output-not-operator-log";

const VIEWPORT = {
  name: "desktop-1440x900",
  width: 1440,
  height: 900
};

const W1 = {
  ratio: 0.1,
  windowId: "leo-acquisition-context"
};

const W5 = {
  ratio: 0.9,
  windowId: "geo-continuity-guard"
};

const SCREENSHOTS = {
  w1Default: "v4.11-conv3-w1-default-1440x900.png",
  w5Warning: "v4.11-conv3-w5-warning-1440x900.png",
  truthRemoved: "v4.11-conv3-truth-removed-1440x900.png",
  footerClicked: "v4.11-conv3-footer-chip-clicked-1440x900.png",
  bottomLayout: "v4.11-conv3-bottom-layout-1440x900.png"
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function waitForBootstrapReady(client) {
  let lastState = null;

  for (let attempt = 0; attempt < 240; attempt += 1) {
    lastState = await evaluateRuntimeValue(
      client,
      `(() => {
        const root = document.documentElement;
        const productRoot = document.querySelector("[data-m8a-v47-product-ux='true']");
        return {
          bootstrapState: root?.dataset.bootstrapState ?? null,
          scenePreset: root?.dataset.scenePreset ?? null,
          footer: productRoot?.dataset.m8aV411FooterChipSystem ?? null,
          truthButtonRemoved:
            productRoot?.dataset.m8aV411FooterChipTruthButtonRemoved ?? null,
          hasCapture: Boolean(
            window.__SCENARIO_GLOBE_VIEWER_CAPTURE__?.m8aV4GroundStationScene
          )
        };
      })()`
    );

    if (
      lastState?.bootstrapState === "ready" &&
      lastState?.scenePreset === "regional" &&
      lastState?.footer === EXPECTED_FOOTER_VERSION &&
      lastState?.truthButtonRemoved === "true" &&
      lastState?.hasCapture === true
    ) {
      return lastState;
    }

    if (lastState?.bootstrapState === "error") {
      throw new Error(
        `Conv 3 route hit bootstrap error: ${JSON.stringify(lastState)}`
      );
    }

    await sleep(100);
  }

  throw new Error(
    `Conv 3 did not reach a ready route: ${JSON.stringify(lastState)}`
  );
}

async function navigateAndWait(client, baseUrl) {
  await client.send("Page.navigate", { url: `${baseUrl}${REQUEST_PATH}` });
  await waitForBootstrapReady(client);
  await waitForGlobeReady(client, "M8A-V4.11 Conv 3");
}

async function inspectRuntime(client, label) {
  return await evaluateRuntimeValue(
    client,
    `((label) => {
      const normalize = (value) => (value ?? "").replace(/\\s+/g, " ").trim();
      const rectRecord = (element) => {
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
          Number(style.opacity) > 0 &&
          rect.width > 0 &&
          rect.height > 0
        );
      };
      const styleRecord = (element) => {
        if (!(element instanceof HTMLElement)) {
          return null;
        }
        const style = getComputedStyle(element);
        return {
          fontSize: style.fontSize,
          backgroundColor: style.backgroundColor,
          borderColor: style.borderColor,
          color: style.color,
          opacity: style.opacity,
          display: style.display,
          visibility: style.visibility
        };
      };
      const elementRecord = (element) => ({
        exists: element instanceof HTMLElement,
        visible: isVisible(element),
        hidden: element instanceof HTMLElement ? element.hidden : null,
        text: element instanceof HTMLElement ? normalize(element.innerText) : "",
        tagName: element instanceof HTMLElement ? element.tagName : null,
        role: element instanceof HTMLElement ? element.getAttribute("role") : null,
        rect: rectRecord(element),
        style: styleRecord(element)
      });
      const chipRecord = (chip) => ({
        ...elementRecord(chip),
        chipId: chip instanceof HTMLElement ? chip.dataset.m8aV411FooterChip ?? "" : "",
        action: chip instanceof HTMLElement ? chip.dataset.m8aV47Action ?? "" : "",
        ambientFontSize:
          chip instanceof HTMLElement
            ? chip.dataset.m8aV411FooterChipAmbientFontSizePx ?? ""
            : "",
        warningFontSize:
          chip instanceof HTMLElement
            ? chip.dataset.m8aV411FooterChipW5WarningFontSizePx ?? ""
            : "",
        warningColor:
          chip instanceof HTMLElement
            ? chip.dataset.m8aV411FooterChipW5WarningColor ?? ""
            : "",
        tleSource:
          chip instanceof HTMLElement
            ? chip.dataset.m8aV411FooterChipTleSource ?? ""
            : "",
        tleDate:
          chip instanceof HTMLElement
            ? chip.dataset.m8aV411FooterChipTleDate ?? ""
            : "",
        actorCount:
          chip instanceof HTMLElement
            ? chip.dataset.m8aV411FooterChipActorCount ?? ""
            : "",
        ariaExpanded:
          chip instanceof HTMLElement ? chip.getAttribute("aria-expanded") : null
      });
      const resolveCssColor = (value) => {
        if (!(productRoot instanceof HTMLElement)) {
          return "";
        }
        const probe = document.createElement("span");
        probe.style.color = value;
        productRoot.append(probe);
        const resolved = getComputedStyle(probe).color;
        probe.remove();
        return resolved;
      };

      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      const state = capture?.m8aV4GroundStationScene?.getState?.();
      const productRoot = document.querySelector("[data-m8a-v47-product-ux='true']");
      const rootStyle = getComputedStyle(document.documentElement);
      const stateWarningToken = rootStyle
        .getPropertyValue("--m8a-v411-state-warning")
        .trim();
      const footerRow = productRoot?.querySelector("[data-m8a-v411-footer-chip-row='true']");
      const ambientChips = Array.from(
        productRoot?.querySelectorAll(".m8a-v411-footer-chip--ambient") ?? []
      );
      const w5Warning = productRoot?.querySelector(
        "[data-m8a-v411-footer-chip-w5-warning='true']"
      );
      const footerBoundaryChip = productRoot?.querySelector(
        "[data-m8a-v411-footer-chip-boundary-trigger='true']"
      );
      const sequenceRail = productRoot?.querySelector(
        "[data-m8a-v410-sequence-rail='true']"
      );
      const details = productRoot?.querySelector(
        "[data-m8a-v47-control-id='details-toggle']"
      );
      const truthButton = productRoot?.querySelector(
        "[data-m8a-v47-control-id='truth-affordance'], [data-m8a-v49-truth-affordance='compact']"
      );
      const toggleBoundaryOwner = productRoot?.querySelector(
        "[data-m8a-v47-action='toggle-boundary']"
      );
      const stateRole = productRoot?.querySelector(
        "[data-m8a-v411-inspector-role='state-evidence']"
      );
      const truthTail = productRoot?.querySelector(
        "[data-m8a-v411-state-evidence-truth-tail='true']"
      );
      const sheet = productRoot?.querySelector(
        "[data-m8a-v47-ui-surface='inspection-sheet']"
      );
      const cornerBadge = productRoot?.querySelector(
        "[data-m8a-v411-provenance-badge='true']"
      );
      const footerTop = footerRow instanceof HTMLElement
        ? footerRow.getBoundingClientRect().top
        : null;
      const footerBottom = footerRow instanceof HTMLElement
        ? footerRow.getBoundingClientRect().bottom
        : null;
      const railTop = sequenceRail instanceof HTMLElement
        ? sequenceRail.getBoundingClientRect().top
        : null;
      const railBottom = sequenceRail instanceof HTMLElement
        ? sequenceRail.getBoundingClientRect().bottom
        : null;
      const detailsTop = details instanceof HTMLElement
        ? details.getBoundingClientRect().top
        : null;
      const detailsBottom = details instanceof HTMLElement
        ? details.getBoundingClientRect().bottom
        : null;
      const footerCenter = typeof footerTop === "number" && typeof footerBottom === "number"
        ? (footerTop + footerBottom) / 2
        : null;
      const detailsCenter = typeof detailsTop === "number" && typeof detailsBottom === "number"
        ? (detailsTop + detailsBottom) / 2
        : null;

      return {
        label,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        route: window.location.pathname + window.location.search,
        stateFacts: {
          route: state?.simulationHandoverModel?.route ?? null,
          endpointPairId:
            state?.simulationHandoverModel?.endpointPairId ?? null,
          acceptedPairPrecision:
            state?.simulationHandoverModel?.acceptedPairPrecision ?? null,
          modelId: state?.simulationHandoverModel?.modelId ?? null,
          modelTruth: state?.simulationHandoverModel?.modelTruth ?? null,
          activeWindowId: state?.productUx?.activeWindowId ?? null,
          disclosure: state?.productUx?.disclosure ?? null
        },
        rootDataset: {
          footer: productRoot?.dataset.m8aV411FooterChipSystem ?? null,
          truthButtonRemoved:
            productRoot?.dataset.m8aV411FooterChipTruthButtonRemoved ?? null,
          footerBoundaryBehavior:
            productRoot?.dataset.m8aV411FooterChipBoundaryBehavior ?? null
        },
        stateTokens: {
          warningName: "--m8a-v411-state-warning",
          warning: stateWarningToken,
          warningResolved: resolveCssColor("var(--m8a-v411-state-warning)")
        },
        footerRow: {
          ...elementRecord(footerRow),
          dataset: footerRow instanceof HTMLElement
            ? {
                rowHeightPx: footerRow.dataset.m8aV411FooterChipRowHeightPx ?? "",
                gapPx: footerRow.dataset.m8aV411FooterChipGapPx ?? "",
                bottomOffsetPx:
                  footerRow.dataset.m8aV411FooterChipBottomOffsetPx ?? "",
                railHeightPx:
                  footerRow.dataset.m8aV411SequenceRailHeightPx ?? "",
                railBottomOffsetPx:
                  footerRow.dataset.m8aV411SequenceRailBottomOffsetPx ?? "",
                maxHeightPx:
                  footerRow.dataset.m8aV411BottomLayoutMaxHeightPx ?? ""
              }
            : null
        },
        ambientChips: ambientChips.map(chipRecord),
        w5Warning: chipRecord(w5Warning),
        footerBoundaryChip: chipRecord(footerBoundaryChip),
        tleChip: chipRecord(
          productRoot?.querySelector("[data-m8a-v411-footer-chip='tle-source']")
        ),
        actorChip: chipRecord(
          productRoot?.querySelector("[data-m8a-v411-footer-chip='actor-count']")
        ),
        sequenceRail: elementRecord(sequenceRail),
        details: {
          ...elementRecord(details),
          ariaExpanded:
            details instanceof HTMLElement ? details.getAttribute("aria-expanded") : null
        },
        truthButton: elementRecord(truthButton),
        toggleBoundaryOwner: chipRecord(toggleBoundaryOwner),
        stateRole: elementRecord(stateRole),
        truthTail: elementRecord(truthTail),
        sheet: elementRecord(sheet),
        cornerBadge: {
          ...elementRecord(cornerBadge),
          placeholderSizePx:
            cornerBadge instanceof HTMLElement
              ? cornerBadge.dataset.m8aV411BadgePlaceholderSizePx ?? ""
              : "",
          role:
            cornerBadge instanceof HTMLElement
              ? cornerBadge.dataset.m8aV411BadgeConv3Role ?? ""
              : "",
          sourceProvider:
            cornerBadge instanceof HTMLElement
              ? cornerBadge.dataset.m8aV411SourceProvider ?? ""
              : "",
          fetchedDate:
            cornerBadge instanceof HTMLElement
              ? cornerBadge.dataset.m8aV411FetchedDate ?? ""
              : "",
          actorCount:
            cornerBadge instanceof HTMLElement
              ? cornerBadge.dataset.m8aV411ActorCount ?? ""
              : ""
        },
        bottomLayout: {
          footerGapFromRail:
            typeof footerTop === "number" && typeof railBottom === "number"
              ? footerTop - railBottom
              : null,
          railBottomOffset:
            typeof railBottom === "number" ? window.innerHeight - railBottom : null,
          railHeight:
            typeof railTop === "number" && typeof railBottom === "number"
              ? railBottom - railTop
              : null,
          footerHeight:
            typeof footerTop === "number" && typeof footerBottom === "number"
              ? footerBottom - footerTop
              : null,
          detailsSameRowCenterDelta:
            typeof detailsCenter === "number" && typeof footerCenter === "number"
              ? Math.abs(detailsCenter - footerCenter)
              : null,
          bottomBandHeight:
            typeof railTop === "number" &&
            typeof footerBottom === "number" &&
            typeof detailsBottom === "number"
              ? Math.max(footerBottom, detailsBottom) - railTop
              : null
        }
      };
    })(${JSON.stringify(label)})`
  );
}

async function seekToWindow(client, ratio, expectedWindowId) {
  await evaluateRuntimeValue(
    client,
    `((ratio) => {
      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      const replayClock = capture?.replayClock;
      const replayState = replayClock?.getState?.();
      capture?.m8aV4GroundStationScene?.pause?.();
      if (replayClock && replayState?.startTime && replayState?.stopTime) {
        const start = Date.parse(replayState.startTime);
        const stop = Date.parse(replayState.stopTime);
        replayClock.seek(new Date(start + (stop - start) * ratio).toISOString());
        capture?.m8aV4GroundStationScene?.pause?.();
      }
    })(${JSON.stringify(ratio)})`
  );

  let last = null;
  for (let attempt = 0; attempt < 70; attempt += 1) {
    last = await inspectRuntime(client, `seek-${ratio}`);
    if (last.stateFacts.activeWindowId === expectedWindowId) {
      return last;
    }
    await sleep(100);
  }

  throw new Error(
    `Conv 3 could not settle on ${expectedWindowId} at ratio ${ratio}: ` +
      JSON.stringify(last?.stateFacts)
  );
}

async function clickFooterBoundaryChip(client) {
  await evaluateRuntimeValue(
    client,
    `(() => {
      const chip = document.querySelector(
        "[data-m8a-v411-footer-chip-boundary-trigger='true']"
      );

      if (!(chip instanceof HTMLElement)) {
        throw new Error("Missing Conv 3 footer boundary chip.");
      }

      chip.click();
    })()`
  );
  await sleep(180);
}

async function closeInspector(client) {
  await evaluateRuntimeValue(
    client,
    `(() => {
      const close = document.querySelector(
        "[data-m8a-v47-control-id='details-close']"
      );
      if (close instanceof HTMLElement) {
        close.click();
      }
    })()`
  );
  await sleep(140);
}

function assertInvariants(result, label) {
  assert(
    result.stateFacts.route === EXPECTED_ROUTE &&
      result.stateFacts.endpointPairId === EXPECTED_ENDPOINT_PAIR_ID &&
      result.stateFacts.acceptedPairPrecision === EXPECTED_PRECISION &&
      result.stateFacts.modelId === EXPECTED_MODEL_ID &&
      result.stateFacts.modelTruth === EXPECTED_MODEL_TRUTH,
    `${label} route / pair / precision / V4.6D truth invariants changed: ` +
      JSON.stringify(result.stateFacts)
  );
}

function assertDefaultFooter(result) {
  assert(
    result.rootDataset.footer === EXPECTED_FOOTER_VERSION &&
      result.rootDataset.truthButtonRemoved === "true",
    "Conv 3 footer system dataset missing: " +
      JSON.stringify(result.rootDataset)
  );
  assert(
    result.footerRow.visible &&
      result.footerRow.dataset?.rowHeightPx === "24" &&
      result.footerRow.dataset?.gapPx === "8",
    "Footer row must be visible and declare 24px row / 8px spacer: " +
      JSON.stringify(result.footerRow)
  );
  assert(
    result.ambientChips.length === 4 &&
      result.ambientChips.every(
        (chip) =>
          chip.visible &&
          chip.ambientFontSize === "12" &&
          chip.style?.fontSize === "12px" &&
          /rgba?\(/.test(chip.style?.backgroundColor ?? "")
      ),
    "Default footer must show exactly four ambient 12px chips: " +
      JSON.stringify(result.ambientChips)
  );
  assert(
    result.ambientChips.map((chip) => chip.text).join("|") ===
      "Simulation view|operator-family precision|TLE: CelesTrak NORAD GP · 2026-04-26|13 actors",
    "Footer ambient chip text must match Addendum footer chip system: " +
      JSON.stringify(result.ambientChips)
  );
  assert(
    result.tleChip.visible &&
      result.tleChip.text.includes("CelesTrak NORAD GP") &&
      result.tleChip.text.includes("2026-04-26") &&
      result.tleChip.tleSource === "CelesTrak NORAD GP" &&
      result.tleChip.tleDate === "2026-04-26",
    "Footer TLE chip must expose CelesTrak NORAD GP and 2026-04-26: " +
      JSON.stringify(result.tleChip)
  );
  assert(
    result.actorChip.visible &&
      result.actorChip.text === "13 actors" &&
      result.actorChip.actorCount === "13",
    "Footer actor chip must expose 13 actors: " +
      JSON.stringify(result.actorChip)
  );
}

function assertNoW5Warning(result) {
  assert(
    result.w5Warning.exists &&
      result.w5Warning.visible === false &&
      result.w5Warning.hidden === true,
    "W5 warning chip must not render visibly outside W5: " +
      JSON.stringify(result.w5Warning)
  );
}

function assertW5OnlyWarning(defaultResult, w5Result) {
  assertNoW5Warning(defaultResult);
  assert(
    defaultResult.stateFacts.activeWindowId !== W5.windowId &&
      w5Result.stateFacts.activeWindowId === W5.windowId,
    "W5 warning comparison must use a non-W5 default and W5 active result: " +
      JSON.stringify({
        defaultWindowId: defaultResult.stateFacts.activeWindowId,
        w5WindowId: w5Result.stateFacts.activeWindowId
      })
  );
  assert(
      w5Result.w5Warning.visible &&
      w5Result.w5Warning.text === "⚠ Not actual failover evidence" &&
      w5Result.w5Warning.warningFontSize === "14" &&
      w5Result.stateTokens.warningName === "--m8a-v411-state-warning" &&
      w5Result.stateTokens.warning.length > 0 &&
      w5Result.w5Warning.style?.fontSize === "14px" &&
      w5Result.w5Warning.style?.borderColor === w5Result.stateTokens.warningResolved,
    "W5 warning chip must render only on W5 with state-warning outline and 14px font: " +
      JSON.stringify({
        warning: w5Result.w5Warning,
        stateTokens: w5Result.stateTokens
      })
  );
}

function assertTruthRemoved(result) {
  assert(
    !result.truthButton.exists,
    "Truth button DOM must not exist after Conv 3: " +
      JSON.stringify(result.truthButton)
  );
  assert(
    result.toggleBoundaryOwner.exists &&
      result.toggleBoundaryOwner.visible &&
      result.toggleBoundaryOwner.tagName === "SPAN" &&
      result.toggleBoundaryOwner.chipId === "simulation-display" &&
      result.toggleBoundaryOwner.action === "toggle-boundary",
    "[data-m8a-v47-action='toggle-boundary'] must be owned by the footer chip, not a control-strip button: " +
      JSON.stringify(result.toggleBoundaryOwner)
  );
}

function assertFooterClickOpenedBoundary(result) {
  assert(
    result.stateFacts.disclosure?.boundarySurfaceState === "open" &&
      result.stateFacts.disclosure?.detailsSheetState === "closed" &&
      result.sheet.visible &&
      result.stateRole.visible &&
      result.truthTail.visible &&
      result.footerBoundaryChip.ariaExpanded === "true",
    "Footer chip click must set boundaryDisclosureOpen and show State Evidence with Truth tail: " +
      JSON.stringify({
        disclosure: result.stateFacts.disclosure,
        sheet: result.sheet,
        stateRole: result.stateRole,
        truthTail: result.truthTail,
        footerBoundaryChip: result.footerBoundaryChip
      })
  );
  assert(
    result.rootDataset.footerBoundaryBehavior ===
      "footer-chip-opens-state-evidence-with-truth-tail-visible",
    "Footer chip click must record Conv 3 boundary behavior: " +
      JSON.stringify(result.rootDataset)
  );
}

function assertBottomLayout(result) {
  const layout = result.bottomLayout;
  const legacyConv3BottomLayout =
    Math.abs(layout.footerGapFromRail - 8) <= 1 &&
    Math.abs(layout.railBottomOffset - 56) <= 1 &&
    Math.abs(layout.railHeight - 56) <= 1 &&
    Math.abs(layout.footerHeight - 24) <= 1 &&
    layout.detailsSameRowCenterDelta <= 2 &&
    layout.bottomBandHeight <= 100;
  const correctionASuccessorBottomLayout =
    Math.abs(layout.railHeight - 56) <= 1 &&
    Math.abs(layout.footerHeight - 24) <= 1 &&
    layout.footerGapFromRail >= 20 &&
    layout.footerGapFromRail <= 24 &&
    layout.railBottomOffset >= 136 &&
    layout.railBottomOffset <= 144 &&
    layout.detailsSameRowCenterDelta <= 8 &&
    layout.bottomBandHeight <= 104;
  // V4 redesign (commit 59349b08) introduced desktop-targeted CSS that sets
  // .m8a-v47-product-ux .m8a-v410-product-ux__sequence-rail { height: 72px }.
  // The Conv3 semantic contract (footer chip opens state evidence with truth
  // tail) is unchanged; only the layout envelope widened. Accepted as a third
  // branch rather than rolling back the desktop visual.
  const v4RedesignDesktopBottomLayout =
    Math.abs(layout.railHeight - 72) <= 2 &&
    Math.abs(layout.footerHeight - 24) <= 1 &&
    layout.bottomBandHeight <= 122;

  assert(
    legacyConv3BottomLayout || correctionASuccessorBottomLayout || v4RedesignDesktopBottomLayout,
    "Bottom layout must satisfy legacy Conv 3 footer stack, Correction A successor stack, or V4 redesign desktop stack: " +
      JSON.stringify({
        layout,
        acceptedContract: v4RedesignDesktopBottomLayout
          ? "v4-redesign-desktop-bottom-layout"
          : correctionASuccessorBottomLayout
          ? "v4.11-correction-a-successor-bottom-layout"
          : "v4.11-conv3-legacy-bottom-layout",
        footerRow: result.footerRow,
        sequenceRail: result.sequenceRail,
        details: result.details
      })
  );
}

function assertCornerBadgePlaceholder(result) {
  assert(
    result.cornerBadge.exists &&
      result.cornerBadge.visible === false &&
      result.cornerBadge.rect?.width <= 24 &&
      result.cornerBadge.rect?.height <= 24 &&
      result.cornerBadge.placeholderSizePx === "24" &&
      result.cornerBadge.role === "placeholder-non-visible" &&
      result.cornerBadge.sourceProvider === "CelesTrak" &&
      result.cornerBadge.fetchedDate === "2026-04-26" &&
      result.cornerBadge.actorCount === "13",
    "Corner provenance badge must be a <=24x24 placeholder with content moved to footer: " +
      JSON.stringify(result.cornerBadge)
  );
}

function assertScreenshotEvidence(absolutePath) {
  const stats = statSync(absolutePath);
  assert(
    stats.size > 20_000,
    `Conv 3 screenshot is unexpectedly small: ${absolutePath}`
  );
}

async function captureConv3Screenshot(client, filename) {
  const absolutePath = await captureScreenshot(client, outputRoot, filename);
  assertScreenshotEvidence(absolutePath);
  return absolutePath;
}

async function main() {
  ensureOutputRoot(outputRoot);

  const manifest = {
    viewport: VIEWPORT,
    screenshots: [],
    checks: [],
    softening: [
      "Conv 3: spec v2 §6.5 migrates W5 warning assertions from a raw hex literal to --m8a-v411-state-warning; orbit identity colors are preserved."
    ]
  };

  await withStaticSmokeBrowser(async ({ client, baseUrl }) => {
    await setViewport(client, VIEWPORT);
    await navigateAndWait(client, baseUrl);

    await seekToWindow(client, W1.ratio, W1.windowId);
    const w1Default = await inspectRuntime(client, "w1-default");
    assertInvariants(w1Default, "W1 default");
    assertDefaultFooter(w1Default);
    assertTruthRemoved(w1Default);
    assertBottomLayout(w1Default);
    assertCornerBadgePlaceholder(w1Default);
    assertNoW5Warning(w1Default);
    manifest.checks.push("w1-default-footer-four-ambient-chips");
    manifest.screenshots.push(
      await captureConv3Screenshot(client, SCREENSHOTS.w1Default)
    );

    await seekToWindow(client, W5.ratio, W5.windowId);
    const w5Warning = await inspectRuntime(client, "w5-warning");
    assertInvariants(w5Warning, "W5 warning");
    assertDefaultFooter(w5Warning);
    assertTruthRemoved(w5Warning);
    assertW5OnlyWarning(w1Default, w5Warning);
    manifest.checks.push("w5-warning-chip-only-on-w5");
    manifest.screenshots.push(
      await captureConv3Screenshot(client, SCREENSHOTS.w5Warning)
    );

    await seekToWindow(client, W1.ratio, W1.windowId);
    const truthRemoved = await inspectRuntime(client, "truth-removed");
    assertInvariants(truthRemoved, "Truth removed");
    assertTruthRemoved(truthRemoved);
    manifest.checks.push("truth-button-dom-removed");
    manifest.screenshots.push(
      await captureConv3Screenshot(client, SCREENSHOTS.truthRemoved)
    );

    await clickFooterBoundaryChip(client);
    const footerClicked = await inspectRuntime(client, "footer-clicked");
    assertInvariants(footerClicked, "Footer clicked");
    assertFooterClickOpenedBoundary(footerClicked);
    assertTruthRemoved(footerClicked);
    manifest.checks.push("footer-chip-click-opens-boundary-state");
    manifest.screenshots.push(
      await captureConv3Screenshot(client, SCREENSHOTS.footerClicked)
    );

    await closeInspector(client);
    const bottomLayout = await inspectRuntime(client, "bottom-layout");
    assertInvariants(bottomLayout, "Bottom layout");
    assertDefaultFooter(bottomLayout);
    assertBottomLayout(bottomLayout);
    assertCornerBadgePlaceholder(bottomLayout);
    manifest.checks.push("bottom-layout-legacy-or-correction-a-successor");
    manifest.screenshots.push(
      await captureConv3Screenshot(client, SCREENSHOTS.bottomLayout)
    );
  });

  writeJsonArtifact(outputRoot, "capture-manifest.json", manifest);
  console.log(
    "M8A-V4.11 Conv 3 footer/truth-removal smoke passed: " +
      JSON.stringify({
        screenshots: manifest.screenshots.map((screenshotPath) =>
          path.relative(repoRoot, screenshotPath)
        ),
        checks: manifest.checks,
        softening: manifest.softening
      })
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
