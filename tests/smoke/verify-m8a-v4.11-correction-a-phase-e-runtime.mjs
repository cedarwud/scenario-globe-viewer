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
const outputRoot = path.join(repoRoot, "output/m8a-v4.11-correction-a-phase-e");

const REQUEST_PATH = "/?scenePreset=regional&m8aV4GroundStationScene=1";
const EXPECTED_VISUAL_TOKEN_DATA_SOURCE =
  "m8a-v4.11-visual-tokens-conv1";
const W4_WINDOW_ID = "leo-reentry-candidate";
const W4_LABEL = "候選 LEO";
const CJK_FONT_FACE = "Noto Sans TC M8A V411 Subset";

const VIEWPORT_DESKTOP = {
  name: "desktop-1440x900",
  width: 1440,
  height: 900
};

const VIEWPORT_LAPTOP = {
  name: "laptop-1280x720",
  width: 1280,
  height: 720
};

const VIEWPORT_NARROW = {
  name: "narrow-390x844",
  width: 390,
  height: 844
};

const WINDOW_CHECKS = [
  {
    label: "W1",
    ratio: 0.1,
    windowId: "leo-acquisition-context"
  },
  {
    label: "W2",
    ratio: 0.3,
    windowId: "leo-aging-pressure"
  },
  {
    label: "W3",
    ratio: 0.5,
    windowId: "meo-continuity-hold"
  },
  {
    label: "W4",
    ratio: 0.7,
    windowId: W4_WINDOW_ID
  },
  {
    label: "W5",
    ratio: 0.9,
    windowId: "geo-continuity-guard"
  }
];

const FORBIDDEN_FAKE_MEASURED_VALUE_PATTERNS = [
  /\b\d+(?:\.\d+)?\s*(?:ms|Mbps|Gbps|dB)\b/i,
  /\b(?:latency|jitter|throughput|packet[- ]loss|rain attenuation)\s*[:=]\s*\d/i,
  /\b\d+(?:\.\d+)?\s*%\s*(?:packet|loss)/i
];

const TOFU_TEXT_PATTERN = /[\uFFFD\u25A1\u25A0\u2B1A□�]/u;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertScreenshot(absolutePath) {
  const stat = statSync(absolutePath);
  assert(stat.size > 10_000, `Screenshot is unexpectedly small: ${absolutePath}`);
}

function rectsOverlap(left, right) {
  if (!left || !right) {
    return false;
  }

  return !(
    left.right <= right.left ||
    left.left >= right.right ||
    left.bottom <= right.top ||
    left.top >= right.bottom
  );
}

function visibleSurfaceEntries(surfaces) {
  return Object.entries(surfaces ?? {}).filter(([, surface]) => {
    return (
      surface?.exists &&
      surface.visible &&
      surface.rect?.width > 0 &&
      surface.rect?.height > 0
    );
  });
}

function assertNoBottomOverlap(layout, label) {
  const productSurfaces = {
    footerRow: layout.footerRow,
    footerExplicit: layout.footerExplicit,
    detailsBtn: layout.detailsBtn,
    sequenceRail: layout.sequenceRail,
    controlStrip: layout.controlStrip
  };
  const productEntries = visibleSurfaceEntries(productSurfaces);
  const nativeEntries = visibleSurfaceEntries(layout.nativeSurfaces);
  const nativeCollisions = [];

  for (const [productName, productSurface] of productEntries) {
    for (const [nativeName, nativeSurface] of nativeEntries) {
      if (rectsOverlap(productSurface.rect, nativeSurface.rect)) {
        nativeCollisions.push({
          productName,
          nativeName,
          productRect: productSurface.rect,
          nativeRect: nativeSurface.rect
        });
      }
    }
  }

  assert(
    nativeCollisions.length === 0,
    `${label} product bottom UI must not overlap Cesium timeline, animation, or credits: ` +
      JSON.stringify({
        nativeCollisions,
        productSurfaces,
        nativeSurfaces: layout.nativeSurfaces
      })
  );

  const productCollisions = [];
  for (let index = 0; index < productEntries.length; index += 1) {
    const [leftName, leftSurface] = productEntries[index];

    for (let nextIndex = index + 1; nextIndex < productEntries.length; nextIndex += 1) {
      const [rightName, rightSurface] = productEntries[nextIndex];

      if (
        leftName === "footerRow" &&
        rightName === "footerExplicit"
      ) {
        continue;
      }

      if (
        (leftName === "controlStrip" && rightName === "detailsBtn") ||
        (leftName === "detailsBtn" && rightName === "controlStrip")
      ) {
        continue;
      }

      if (rectsOverlap(leftSurface.rect, rightSurface.rect)) {
        productCollisions.push({
          leftName,
          rightName,
          leftRect: leftSurface.rect,
          rightRect: rightSurface.rect
        });
      }
    }
  }

  assert(
    productCollisions.length === 0,
    `${label} product bottom UI surfaces must not overlap each other: ` +
      JSON.stringify({ productCollisions, productSurfaces })
  );

  assert(
    nativeEntries.length >= 2,
    `${label} must inspect existing Cesium native chrome surfaces: ` +
      JSON.stringify(layout.nativeSurfaces)
  );
}

function assertNoFakeMeasuredValues(text, label) {
  const hits = FORBIDDEN_FAKE_MEASURED_VALUE_PATTERNS.filter((pattern) =>
    pattern.test(text)
  ).map((pattern) => String(pattern));

  assert(
    hits.length === 0,
    `${label} contains fake measured values: ${JSON.stringify({ hits, text })}`
  );
}

function assertNoTofuText(text, label) {
  assert(!TOFU_TEXT_PATTERN.test(text), `${label} contains tofu text: ${text}`);
}

function assertVisible(surface, label, minWidth = 1, minHeight = 1) {
  assert(surface?.exists, `${label} must exist`);
  assert(surface.visible, `${label} must be visible`);
  assert(
    surface.rect.width >= minWidth && surface.rect.height >= minHeight,
    `${label} must have a readable box: ${JSON.stringify(surface?.rect)}`
  );
}

function assertHitVisible(layout, key, label) {
  assert(
    layout.pointHits?.[key] === true,
    `${label} must not be hidden behind another surface: ${JSON.stringify(layout.pointHits)}`
  );
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
          hasCapture: Boolean(
            window.__SCENARIO_GLOBE_VIEWER_CAPTURE__?.m8aV4GroundStationScene
          ),
          visualTokens: productRoot?.dataset.m8aV411VisualTokens ?? null
        };
      })()`
    );

    if (
      lastState?.bootstrapState === "ready" &&
      lastState?.scenePreset === "regional" &&
      lastState?.hasCapture === true &&
      lastState?.visualTokens === "m8a-v4.11-visual-tokens-conv1-runtime.v1"
    ) {
      return lastState;
    }

    if (lastState?.bootstrapState === "error") {
      throw new Error(`Bootstrap error: ${JSON.stringify(lastState)}`);
    }

    await sleep(100);
  }

  throw new Error(`Timeout waiting for bootstrap: ${JSON.stringify(lastState)}`);
}

async function navigateAndWait(client, baseUrl) {
  await client.send("Page.navigate", { url: `${baseUrl}${REQUEST_PATH}` });
  await waitForBootstrapReady(client);
  await waitForGlobeReady(client, "Phase E");
}

async function clickSelector(client, selector) {
  await evaluateRuntimeValue(
    client,
    `((selector) => {
      const target = document.querySelector(selector);
      if (target) {
        target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }));
        target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, button: 0 }));
        target.click();
      }
    })(${JSON.stringify(selector)})`
  );
  await sleep(180);
}

async function closeDisclosureSurfaces(client) {
  await clickSelector(client, 'button[data-m8a-v47-control-id="details-close"]');
  await clickSelector(client, 'button[data-m8a-v47-control-id="boundary-close"]');
}

async function seekReplayRatio(client, ratio, settleMs = 320) {
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
  await sleep(settleMs);
}

async function inspectLayout(client) {
  return await evaluateRuntimeValue(
    client,
    `(() => {
      const normalize = (value) => (value ?? "").replace(/\\s+/g, " ").trim();
      const rectToPlain = (rect) => ({
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height
      });
      const isVisible = (el) => {
        if (!(el instanceof HTMLElement)) return false;
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return !el.hidden && style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
      };
      const pointVisible = (el) => {
        if (!(el instanceof HTMLElement) || !isVisible(el)) return false;
        const rect = el.getBoundingClientRect();
        const x = Math.min(window.innerWidth - 1, Math.max(0, rect.left + rect.width / 2));
        const y = Math.min(window.innerHeight - 1, Math.max(0, rect.top + rect.height / 2));
        const hit = document.elementFromPoint(x, y);
        return hit === el || Boolean(hit && el.contains(hit));
      };
      const qs = (sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const rect = el instanceof HTMLElement
          ? el.getBoundingClientRect()
          : { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
        const style = el instanceof HTMLElement ? getComputedStyle(el) : null;
        return {
          exists: true,
          visible: isVisible(el),
          text: normalize(el.innerText ?? el.textContent ?? ""),
          rect: rectToPlain(rect),
          fontSizePx: style ? Number.parseFloat(style.fontSize) : 0,
          fontFamily: style?.fontFamily ?? "",
          scrollWidth: el instanceof HTMLElement ? el.scrollWidth : 0,
          clientWidth: el instanceof HTMLElement ? el.clientWidth : 0,
          scrollHeight: el instanceof HTMLElement ? el.scrollHeight : 0,
          clientHeight: el instanceof HTMLElement ? el.clientHeight : 0
        };
      };

      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      const state = capture?.m8aV4GroundStationScene?.getState?.();
      const activeTab = document.querySelector(
        '[data-m8a-v411-inspector-tab][aria-selected="true"]'
      )?.dataset.m8aV411InspectorTab ?? null;
      const panels = Array.from(
        document.querySelectorAll("[data-m8a-v411-inspector-panel]")
      ).map((panel) => ({
        id: panel.dataset.m8aV411InspectorPanel,
        visible: isVisible(panel),
        text: normalize(panel.innerText)
      }));
      const tabs = Array.from(
        document.querySelectorAll("[data-m8a-v411-inspector-tab]")
      ).map((tab) => ({
        id: tab.dataset.m8aV411InspectorTab,
        selected: tab.getAttribute("aria-selected"),
        text: normalize(tab.innerText),
        rect: rectToPlain(tab.getBoundingClientRect())
      }));
      const disabledMetricTiles = Array.from(
        document.querySelectorAll("[data-m8a-v411-disabled-metric-tile='true']")
      ).map((tile) => {
        const style = tile instanceof HTMLElement ? getComputedStyle(tile) : null;
        return {
          id: tile.dataset.m8aV411DisabledMetricId ?? "",
          ariaDisabled: tile.getAttribute("aria-disabled"),
          tabIndex: tile instanceof HTMLElement ? tile.tabIndex : null,
          cursor: style?.cursor ?? "",
          focusableDescendantCount: tile.querySelectorAll(
            "a[href], button, input, select, textarea, [tabindex]:not([tabindex='-1'])"
          ).length,
          text: normalize(tile.textContent)
        };
      });
      const availableMetricTiles = Array.from(
        document.querySelectorAll("[data-m8a-v411-available-metric-tile]")
      ).map((tile) => {
        const value = tile.querySelector(".m8a-v411-metrics__value");
        const valueStyle = value instanceof HTMLElement ? getComputedStyle(value) : null;
        return {
          id: tile.dataset.m8aV411AvailableMetricTile ?? "",
          text: normalize(tile.textContent),
          fontFamily: valueStyle?.fontFamily ?? "",
          fontVariantNumeric: valueStyle?.fontVariantNumeric ?? "",
          minWidth: valueStyle?.minWidth ?? ""
        };
      });

      const topStrip = document.querySelector("[data-m8a-v411-top-strip='true']");
      const leftRail = document.querySelector("[data-m8a-v411-handover-rail='true']");
      const footerRow = document.querySelector("[data-m8a-v411-footer-chip-row='true']");
      const footerExplicit = document.querySelector("[data-m8a-v411-footer-chip='explicit-disclosure']");
      const detailsBtn = document.querySelector("[data-m8a-v47-control-id='details-toggle']");
      const sheet = document.querySelector("[data-m8a-v48-inspector='true']");
      const controlStrip = document.querySelector("[data-m8a-v47-control-strip='true']");
      const tabsContainer = document.querySelector("[data-m8a-v411-inspector-tabs='true']");
      const evidenceArchive = document.querySelector("[data-m8a-v411-evidence-archive='true']");
      const creditWrappers = Array.from(
        document.querySelectorAll(".cesium-widget-credits .cesium-credit-wrapper")
      );
      const nativeDefaultTokenNotice = creditWrappers.find((element) =>
        /default access token|Cesium ion/i.test(normalize(element.innerText ?? element.textContent ?? ""))
      );

      return {
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        stateSummary: {
          activeWindowId: state?.productUx?.activeWindowId ?? null,
          actorCount: state?.actorCount ?? null,
          orbitActorCounts: state?.orbitActorCounts ?? null,
          projectionSourceAuthority: state?.projectionSourceAuthority ?? null,
          rawPackageSideReadOwnership:
            state?.sourceLineage?.rawPackageSideReadOwnership ?? null,
          relationCues: state?.relationCues ?? null,
          nonClaims: state?.nonClaims ?? null,
          serviceState: state?.serviceState ?? null,
          forbiddenClaimScan:
            state?.simulationHandoverModel?.forbiddenClaimScan ?? null
        },
        activeTab,
        topStrip: qs("[data-m8a-v411-top-strip='true']"),
        topStripScope: qs("[data-m8a-v411-top-strip-slot='scope']"),
        topStripReplay: qs("[data-m8a-v411-top-strip-slot='replay']"),
        topStripPrecision: qs("[data-m8a-v411-top-strip-slot='precision']"),
        topStripBoundary: qs("[data-m8a-v411-top-strip-slot='boundary']"),
        leftRail: qs("[data-m8a-v411-handover-rail='true']"),
        railDecision: qs("[data-m8a-v411-rail-slot='decision']"),
        footerRow: qs("[data-m8a-v411-footer-chip-row='true']"),
        footerExplicit: qs("[data-m8a-v411-footer-chip='explicit-disclosure']"),
        detailsBtn: qs("[data-m8a-v47-control-id='details-toggle']"),
        sheet: qs("[data-m8a-v48-inspector='true']"),
        boundaryStrip: qs("[data-m8a-v411-inspector-boundary-strip='true']"),
        validationBadge: qs("[data-m8a-v411-inspector-validation-badge='true']"),
        controlStrip: qs("[data-m8a-v47-control-strip='true']"),
        sequenceRail: qs("[data-m8a-v410-sequence-rail='true']"),
        nativeSurfaces: {
          timeline: qs(".cesium-viewer-timelineContainer"),
          animation: qs(".cesium-viewer-animationContainer"),
          viewerBottom: qs(".cesium-viewer-bottom"),
          credits: qs(".cesium-widget-credits"),
          creditText: qs(".cesium-credit-textContainer"),
          creditLogo: qs(".cesium-credit-logoContainer"),
          defaultTokenNotice: nativeDefaultTokenNotice
            ? {
                exists: true,
                visible: isVisible(nativeDefaultTokenNotice),
                text: normalize(nativeDefaultTokenNotice.innerText ?? nativeDefaultTokenNotice.textContent ?? ""),
                rect: rectToPlain(nativeDefaultTokenNotice.getBoundingClientRect()),
                fontSizePx: Number.parseFloat(getComputedStyle(nativeDefaultTokenNotice).fontSize),
                fontFamily: getComputedStyle(nativeDefaultTokenNotice).fontFamily,
                scrollWidth: nativeDefaultTokenNotice.scrollWidth,
                clientWidth: nativeDefaultTokenNotice.clientWidth,
                scrollHeight: nativeDefaultTokenNotice.scrollHeight,
                clientHeight: nativeDefaultTokenNotice.clientHeight
              }
            : null
        },
        tabsContainer: qs("[data-m8a-v411-inspector-tabs='true']"),
        activePanel: qs("[data-m8a-v411-inspector-panel]:not([hidden])"),
        panels,
        tabs,
        evidenceArchive: evidenceArchive instanceof HTMLDetailsElement
          ? {
              exists: true,
              open: evidenceArchive.open,
              defaultOpen: evidenceArchive.dataset.m8aV411EvidenceArchiveDefaultOpen ?? "",
              text: normalize(evidenceArchive.innerText)
            }
          : { exists: false, open: false, defaultOpen: "", text: "" },
        disabledMetricTiles,
        availableMetricTiles,
        pointHits: {
          footerExplicit: pointVisible(footerExplicit),
          detailsBtn: pointVisible(detailsBtn),
          sheet: pointVisible(sheet),
          controlStrip: pointVisible(controlStrip),
          tabsContainer: pointVisible(tabsContainer)
        },
        textSurfaces: {
          topStrip: normalize(topStrip?.innerText),
          leftRail: normalize(leftRail?.innerText),
          footer: normalize(footerRow?.innerText),
          inspector: normalize(sheet?.innerText),
          allProduct: normalize(document.querySelector("[data-m8a-v47-product-ux='true']")?.innerText)
        }
      };
    })()`,
    { awaitPromise: true }
  );
}

async function inspectW4Token(client) {
  return await evaluateRuntimeValue(
    client,
    `(() => {
      const productRoot = document.querySelector("[data-m8a-v47-product-ux='true']");
      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      const viewer = capture?.viewer;
      const evalTime = viewer?.clock?.currentTime;
      const tokenDataSource = viewer?.dataSources?.getByName(
        "${EXPECTED_VISUAL_TOKEN_DATA_SOURCE}"
      )?.[0];
      const readProp = (prop) => {
        if (prop == null) return null;
        return typeof prop.getValue === "function" ? prop.getValue(evalTime) : prop;
      };
      const readEntity = (id) => {
        const entity = tokenDataSource?.entities?.getById?.(id);
        if (!entity) return null;
        return {
          id: entity.id,
          isShowing: entity.isShowing,
          billboardShow: entity.billboard ? readProp(entity.billboard.show) : null,
          labelText: entity.label ? readProp(entity.label.text) : null,
          labelFont: entity.label ? readProp(entity.label.font) : null
        };
      };
      return {
        rootDataset: {
          w4CueMode:
            productRoot?.dataset.m8aV411VisualTokenW4CueMode ?? null,
          w4EntryCueActive:
            productRoot?.dataset.m8aV411VisualTokenW4EntryCueActive ?? null,
          w4EntryCueCompleted:
            productRoot?.dataset.m8aV411VisualTokenW4EntryCueCompleted ?? null,
          w4Label:
            productRoot?.dataset.m8aV411VisualTokenW4Label ?? null,
          w4PermanentPulse:
            productRoot?.dataset.m8aV411VisualTokenW4PermanentPulse ?? null,
          w4PulseHz:
            productRoot?.dataset.m8aV411VisualTokenW4PulseHz ?? null,
          w4ServingClaim:
            productRoot?.dataset.m8aV411VisualTokenW4ServingClaim ?? null
        },
        entryCue: readEntity("m8a-v4.11-w4-candidate-entry-cue"),
        halo: readEntity("m8a-v4.11-w4-candidate-halo"),
        label: readEntity("m8a-v4.11-w4-candidate-label")
      };
    })()`,
    { awaitPromise: true }
  );
}

async function inspectCjkGlyphRendering(client) {
  return await evaluateRuntimeValue(
    client,
    `(async () => {
      const fontFace = ${JSON.stringify(CJK_FONT_FACE)};
      const fontStack = '"' + fontFace + '", "Noto Sans TC", sans-serif';
      const text = "候選 位置條件恢復 模擬展示";
      const loadFont = document.fonts?.load
        ? await document.fonts.load("600 24px " + fontStack, text)
        : [];
      await document.fonts?.ready;

      const signature = (sample) => {
        const canvas = document.createElement("canvas");
        canvas.width = 420;
        canvas.height = 84;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return { inkPixels: 0, hash: "", alphas: [] };
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#fff";
        ctx.font = "600 28px " + fontStack;
        ctx.textBaseline = "top";
        ctx.fillText(sample, 4, 8);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        const alphas = [];
        let inkPixels = 0;
        let hash = 2166136261;
        for (let index = 3; index < data.length; index += 4) {
          const alpha = data[index];
          alphas.push(alpha);
          if (alpha > 24) {
            inkPixels += 1;
            hash ^= alpha + index;
            hash = Math.imul(hash, 16777619) >>> 0;
          }
        }
        return { inkPixels, hash: hash.toString(16), alphas };
      };

      const target = signature("候選");
      const tofu = signature("□□");
      let pixelDiffFromTofu = 0;
      for (let index = 0; index < target.alphas.length; index += 1) {
        if (Math.abs(target.alphas[index] - tofu.alphas[index]) > 32) {
          pixelDiffFromTofu += 1;
        }
      }
      delete target.alphas;
      delete tofu.alphas;

      const productRoot = document.querySelector("[data-m8a-v47-product-ux='true']");
      const topStrip = document.querySelector("[data-m8a-v411-top-strip='true']");
      const leftRail = document.querySelector("[data-m8a-v411-handover-rail='true']");
      const inspector = document.querySelector("[data-m8a-v48-inspector='true']");

      return {
        loadedFaces: loadFont.map((face) => ({
          family: face.family,
          weight: face.weight,
          status: face.status
        })),
        fontCheck: document.fonts?.check
          ? document.fonts.check("600 24px " + fontStack, text)
          : false,
        productFontFamily: productRoot ? getComputedStyle(productRoot).fontFamily : "",
        topStripFontFamily: topStrip ? getComputedStyle(topStrip).fontFamily : "",
        leftRailFontFamily: leftRail ? getComputedStyle(leftRail).fontFamily : "",
        inspectorFontFamily: inspector ? getComputedStyle(inspector).fontFamily : "",
        target,
        tofu,
        pixelDiffFromTofu,
        targetDiffersFromTofu:
          target.hash !== tofu.hash && pixelDiffFromTofu > 300
      };
    })()`,
    { awaitPromise: true }
  );
}

function findPanel(layout, panelId) {
  return layout.panels.find((panel) => panel.id === panelId);
}

function assertCoreDesktopLayout(layout, label) {
  assertVisible(layout.topStrip, `${label} top strip`, 900, 30);
  assertVisible(layout.leftRail, `${label} left rail`, 260, 500);
  assertVisible(layout.footerRow, `${label} footer source strip`, 420, 20);
  assertVisible(layout.footerExplicit, `${label} footer disclosure button`, 110, 20);
  assertVisible(layout.detailsBtn, `${label} Details button`, 60, 30);
  assertHitVisible(layout, "footerExplicit", `${label} footer disclosure`);
  assertHitVisible(layout, "detailsBtn", `${label} Details button`);
  assertNoBottomOverlap(layout, label);
  assert(!rectsOverlap(layout.leftRail.rect, layout.controlStrip.rect), `${label} left rail overlaps control strip`);
  assert(!rectsOverlap(layout.footerExplicit.rect, layout.detailsBtn.rect), `${label} footer disclosure overlaps Details button`);
  assert(layout.topStripScope.text.includes("13-actor demo"), `${label} top strip must keep 13-actor scope`);
  assert(layout.topStripScope.text.includes("LEO/MEO/GEO"), `${label} top strip must keep orbit scope`);
  assert(layout.topStripReplay.text.includes("replay"), `${label} top strip must keep replay mode`);
  assert(layout.topStripReplay.text.includes("x"), `${label} top strip must keep speed multiplier`);
  assert(layout.topStripPrecision.text.includes("operator-family precision"), `${label} top strip must keep precision boundary`);
  assert(layout.topStripBoundary.text.includes("repo-owned projection"), `${label} top strip must keep repo-owned boundary`);
  assert(layout.topStripBoundary.text.includes("not measured truth"), `${label} top strip must keep non-measured boundary`);
  assert(layout.leftRail.text.length > 90, `${label} left rail must remain readable`);
  assert(layout.footerRow.text.includes("模擬展示"), `${label} footer must keep simulation disclosure`);
  assert(layout.footerRow.text.includes("CelesTrak"), `${label} footer must keep TLE disclosure`);
  assert(layout.footerRow.text.includes("13 actors"), `${label} footer must keep actor count`);
}

function assertInspectorTabsFit(layout, label) {
  assertVisible(layout.tabsContainer, `${label} inspector tabs`, 250, 28);
  assert(
    JSON.stringify(layout.tabs.map((tab) => tab.text)) ===
      JSON.stringify(["Decision", "Metrics", "Evidence"]),
    `${label} inspector tabs must follow spec v2 §4.1 / §4.4 three-tab order: ` +
      JSON.stringify(layout.tabs)
  );
  assert(
    !layout.tabs.some((tab) => tab.id === "boundary" || tab.text === "Boundary"),
    `${label} must not expose a Boundary tab after spec v2 §4.1 / §4.4: ` +
      JSON.stringify(layout.tabs)
  );
  assert(
    layout.boundaryStrip.visible &&
      layout.boundaryStrip.text.includes("13-actor demo") &&
      layout.boundaryStrip.text.includes("operator-family precision"),
    `${label} boundary strip must own scale and endpoint chips after spec v2 §4.4: ` +
      JSON.stringify(layout.boundaryStrip)
  );
  assert(
    layout.validationBadge.visible &&
      layout.validationBadge.text.includes("驗證狀態：待補"),
    `${label} validation badge must be visible in inspector header: ` +
      JSON.stringify(layout.validationBadge)
  );
  for (const tab of layout.tabs) {
    assert(tab.text.length > 0, `${label} inspector tab text missing`);
    assert(
      tab.rect.left >= layout.tabsContainer.rect.left - 1 &&
        tab.rect.right <= layout.tabsContainer.rect.right + 1,
      `${label} inspector tab clipped: ${JSON.stringify({ tab, tabsContainer: layout.tabsContainer.rect })}`
    );
  }
}

function assertRuntimeBoundaries(layout, label) {
  const state = layout.stateSummary;
  assert(state.actorCount === 13, `${label} must stay a 13-actor demo`);
  assert(
    state.orbitActorCounts?.leo === 6 &&
      state.orbitActorCounts?.meo === 5 &&
      state.orbitActorCounts?.geo === 2,
    `${label} must keep 6 LEO / 5 MEO / 2 GEO actor set: ${JSON.stringify(state.orbitActorCounts)}`
  );
  assert(
    state.rawPackageSideReadOwnership === "forbidden",
    `${label} must keep raw package side-read forbidden`
  );
  assert(
    state.relationCues?.activeSatelliteTruth === "not-claimed" &&
      state.relationCues?.activeGatewayTruth === "not-claimed" &&
      state.relationCues?.pairSpecificTeleportPathTruth === "not-claimed" &&
      state.relationCues?.nativeRfHandoverTruth === "not-claimed",
    `${label} must keep relation-cue non-claims: ${JSON.stringify(state.relationCues)}`
  );
  assert(
    state.serviceState?.isNativeRfHandover === false &&
      state.serviceState?.measuredLatency !== true &&
      state.serviceState?.measuredJitter !== true &&
      state.serviceState?.measuredThroughput !== true,
    `${label} must keep service-state measurement/native-RF boundaries: ${JSON.stringify(state.serviceState)}`
  );
  assert(
    state.forbiddenClaimScan?.scanPositiveClaimFields === true &&
      Array.isArray(state.forbiddenClaimScan?.negatedFieldNames) &&
      state.forbiddenClaimScan.negatedFieldNames.includes("nonClaims") &&
      Array.isArray(state.forbiddenClaimScan?.forbiddenModelKeys) &&
      state.forbiddenClaimScan.forbiddenModelKeys.includes("latencyMs") &&
      state.forbiddenClaimScan.forbiddenModelKeys.includes("throughputMbps") &&
      state.forbiddenClaimScan.forbiddenModelKeys.includes("activeGatewayId"),
    `${label} must keep forbidden-claim scan metadata: ${JSON.stringify(state.forbiddenClaimScan)}`
  );
}

function assertNoTofuOnSurfaces(layout, label, extraText = "") {
  for (const [surfaceLabel, text] of Object.entries(layout.textSurfaces)) {
    assertNoTofuText(text, `${label} ${surfaceLabel}`);
  }

  assertNoTofuText(extraText, `${label} W4 label`);
}

function assertCjkProbe(result, label) {
  assert(
    result.fontCheck === true && result.loadedFaces.length >= 1,
    `${label}: CJK subset font must load: ${JSON.stringify(result)}`
  );
  assert(
    result.productFontFamily.includes(CJK_FONT_FACE) &&
      result.topStripFontFamily.includes(CJK_FONT_FACE) &&
      result.leftRailFontFamily.includes(CJK_FONT_FACE) &&
      result.inspectorFontFamily.includes(CJK_FONT_FACE),
    `${label}: core Phase E surfaces must use the CJK-capable font stack: ${JSON.stringify(result)}`
  );
  assert(
    result.target.inkPixels > 100 && result.targetDiffersFromTofu === true,
    `${label}: Chinese glyph probe must not match tofu rendering: ${JSON.stringify(result)}`
  );
}

function assertW4SteadyToken(tokenState, label) {
  assert(
    tokenState.rootDataset.w4CueMode === "steady-candidate-halo",
    `${label}: W4 must settle to steady candidate halo: ${JSON.stringify(tokenState.rootDataset)}`
  );
  assert(
    tokenState.rootDataset.w4EntryCueActive === "false" &&
      tokenState.rootDataset.w4EntryCueCompleted === "true",
    `${label}: W4 entry cue must be complete: ${JSON.stringify(tokenState.rootDataset)}`
  );
  assert(
    tokenState.rootDataset.w4PermanentPulse === "false" &&
      tokenState.rootDataset.w4PulseHz === "one-shot-entry-only",
    `${label}: W4 must not expose permanent fast pulse: ${JSON.stringify(tokenState.rootDataset)}`
  );
  assert(
    tokenState.rootDataset.w4Label === W4_LABEL &&
      tokenState.label?.labelText === W4_LABEL,
    `${label}: W4 must show stable candidate label: ${JSON.stringify(tokenState)}`
  );
  assert(
    tokenState.label?.labelFont?.includes(CJK_FONT_FACE),
    `${label}: W4 label must use CJK-capable font: ${JSON.stringify(tokenState.label)}`
  );
  assert(
    tokenState.rootDataset.w4ServingClaim === "not-active-serving-satellite",
    `${label}: W4 must not claim active serving satellite: ${JSON.stringify(tokenState.rootDataset)}`
  );
  assert(
    tokenState.entryCue?.isShowing === false ||
      tokenState.entryCue?.billboardShow === false,
    `${label}: W4 entry cue must stop automatically: ${JSON.stringify(tokenState.entryCue)}`
  );
  assert(
    tokenState.halo?.isShowing === true && tokenState.label?.isShowing === true,
    `${label}: W4 halo and label must remain visible: ${JSON.stringify(tokenState)}`
  );
}

async function captureAndRecord(client, manifest, filename) {
  const screenshot = await captureScreenshot(client, outputRoot, filename);
  assertScreenshot(screenshot);
  manifest.screenshots.push(screenshot);
}

async function main() {
  ensureOutputRoot(outputRoot);

  const manifest = {
    screenshots: [],
    checks: [],
    softening: []
  };

  await withStaticSmokeBrowser(async ({ client, baseUrl }) => {
    await setViewport(client, VIEWPORT_DESKTOP);
    await navigateAndWait(client, baseUrl);

    await closeDisclosureSurfaces(client);
    await seekReplayRatio(client, WINDOW_CHECKS[0].ratio);
    let layout = await inspectLayout(client);
    assert(layout.stateSummary.activeWindowId === WINDOW_CHECKS[0].windowId, "W1 must be active for default screenshot");
    assertCoreDesktopLayout(layout, "W1 default");
    assertRuntimeBoundaries(layout, "W1 default");
    assertNoTofuOnSurfaces(layout, "W1 default");
    await captureAndRecord(client, manifest, "w1-default-1440x900.png");

    await clickSelector(client, 'button[data-m8a-v411-footer-chip="explicit-disclosure"]');
    layout = await inspectLayout(client);
    assertVisible(layout.sheet, "footer disclosure inspector", 300, 220);
    // Smoke Softening Disclosure: spec v2 §4.1 / §4.4 supersedes the
    // legacy footer-disclosure -> Boundary-tab expectation. Footer
    // disclosure may open the inspector, but Boundary is no longer a tab.
    manifest.softening.push("Correction A Phase E: spec v2 §4.1 / §4.4 supersedes Boundary tab; footer disclosure keeps Decision selected and boundary ownership moves to strip/footer.");
    assert(layout.activeTab === "decision", "Footer disclosure must keep Decision selected after Boundary tab removal");
    assert(findPanel(layout, "decision")?.visible, "Footer disclosure must show Decision panel after Boundary tab removal");
    assert(!layout.tabs.some((tab) => tab.id === "boundary" || tab.text === "Boundary"), "Footer disclosure must not expose Boundary tab");
    assertHitVisible(layout, "sheet", "footer disclosure inspector");
    manifest.checks.push("footer-disclosure-opens-inspector-without-boundary-tab");

    await closeDisclosureSurfaces(client);
    await clickSelector(client, 'button[data-m8a-v47-control-id="details-toggle"]');
    layout = await inspectLayout(client);
    assertVisible(layout.sheet, "Details inspector", 300, 220);
    assert(layout.activeTab === "decision", "Details button must open Decision tab by default");
    assert(findPanel(layout, "decision")?.visible, "Details button must show Decision panel");
    assertInspectorTabsFit(layout, "Details default");
    manifest.checks.push("details-button-opens-decision");

    await seekReplayRatio(client, WINDOW_CHECKS[1].ratio);
    await clickSelector(client, 'button[data-m8a-v411-inspector-tab="metrics"]');
    layout = await inspectLayout(client);
    assert(layout.stateSummary.activeWindowId === WINDOW_CHECKS[1].windowId, "W2 must be active for Metrics screenshot");
    assertCoreDesktopLayout(layout, "W2 Metrics");
    assertInspectorTabsFit(layout, "W2 Metrics");
    const metricsPanel = findPanel(layout, "metrics");
    assert(metricsPanel?.visible, "W2 Metrics panel must be visible");
    assert(metricsPanel.text.includes("Available in this scene"), "Metrics must show Available group");
    assert(metricsPanel.text.includes("Not connected in this scene"), "Metrics must show Not connected group");
    assert(!metricsPanel.text.includes("Unavailable measured data"), "Metrics must not keep old unavailable measured-data heading");
    assert(metricsPanel.text.includes("Communication Time"), "Metrics must name Communication Time hookpoint");
    assert(metricsPanel.text.includes("Handover Decision"), "Metrics must name Handover Decision hookpoint");
    assert(metricsPanel.text.includes("Physical Inputs"), "Metrics must name Physical Inputs hookpoint");
    assert(metricsPanel.text.includes("Validation State"), "Metrics must name Validation State hookpoint");
    assert(metricsPanel.text.includes("ping/iPerf"), "Metrics must disclose ping/iPerf absence");
    assert(metricsPanel.text.includes("ESTNeT/INET"), "Metrics must disclose ESTNeT/INET absence");
    assert(metricsPanel.text.includes("DUT"), "Metrics must disclose DUT absence");
    assert(layout.availableMetricTiles.length === 4, "Metrics must render four available tiles");
    assert(layout.availableMetricTiles.every((tile) => tile.fontFamily.includes("IBM Plex Mono") || tile.fontFamily.includes("monospace")), "Available tile values must use data typography");
    assert(layout.availableMetricTiles.every((tile) => tile.fontVariantNumeric.includes("tabular-nums")), "Available tile values must use tabular figures");
    assert(layout.disabledMetricTiles.length === 13, "Metrics must render 13 disabled tiles");
    assert(
      layout.disabledMetricTiles.every(
        (tile) =>
          tile.ariaDisabled === "true" &&
          tile.tabIndex < 0 &&
          tile.cursor === "not-allowed" &&
          tile.focusableDescendantCount === 0
      ),
      `Disabled metric tiles must be aria-disabled, non-focusable, not-allowed, and contain no focusable children: ${JSON.stringify(layout.disabledMetricTiles)}`
    );
    assertNoFakeMeasuredValues(metricsPanel.text, "W2 Metrics panel");
    assertNoTofuOnSurfaces(layout, "W2 Metrics");
    await captureAndRecord(client, manifest, "w2-metrics-tab-1440x900.png");

    await seekReplayRatio(client, WINDOW_CHECKS[2].ratio);
    await clickSelector(client, 'button[data-m8a-v411-inspector-tab="decision"]');
    layout = await inspectLayout(client);
    assert(layout.stateSummary.activeWindowId === WINDOW_CHECKS[2].windowId, "W3 must be active for Decision screenshot");
    assertCoreDesktopLayout(layout, "W3 Decision");
    assertInspectorTabsFit(layout, "W3 Decision");
    const decisionPanel = findPanel(layout, "decision");
    assert(decisionPanel?.visible, "W3 Decision panel must be visible");
    assert(decisionPanel.text.includes("Now") && decisionPanel.text.includes("Why"), "Decision tab must expose Now/Why modules");
    assert(decisionPanel.text.includes("MEO"), "W3 Decision panel must describe MEO hold");
    assertNoTofuOnSurfaces(layout, "W3 Decision");
    await captureAndRecord(client, manifest, "w3-decision-tab-1440x900.png");

    await closeDisclosureSurfaces(client);
    await seekReplayRatio(client, WINDOW_CHECKS[3].ratio, 220);
    const entryToken = await inspectW4Token(client);
    assert(
      entryToken.rootDataset.w4CueMode === "entry-cue" &&
        entryToken.rootDataset.w4EntryCueActive === "true",
      `W4 must expose an entry cue before settling: ${JSON.stringify(entryToken.rootDataset)}`
    );
    await sleep(1900);
    const steadyToken = await inspectW4Token(client);
    assertW4SteadyToken(steadyToken, "W4 steady");
    layout = await inspectLayout(client);
    assert(layout.stateSummary.activeWindowId === WINDOW_CHECKS[3].windowId, "W4 must stay active for halo screenshot");
    assertCoreDesktopLayout(layout, "W4 steady");
    assertNoTofuOnSurfaces(layout, "W4 steady", steadyToken.label?.labelText ?? "");
    assertCjkProbe(await inspectCjkGlyphRendering(client), "W4 steady");
    await captureAndRecord(client, manifest, "w4-steady-candidate-halo-1440x900.png");

    await seekReplayRatio(client, WINDOW_CHECKS[4].ratio);
    await clickSelector(client, 'button[data-m8a-v47-control-id="details-toggle"]');
    await clickSelector(client, 'button[data-m8a-v411-inspector-tab="evidence"]');
    layout = await inspectLayout(client);
    assert(layout.stateSummary.activeWindowId === WINDOW_CHECKS[4].windowId, "W5 must be active for Evidence Archive screenshot");
    assertCoreDesktopLayout(layout, "W5 Evidence Archive");
    assertInspectorTabsFit(layout, "W5 Evidence Archive");
    assertInspectorTabsFit(layout, "Evidence");
    const evidencePanel = findPanel(layout, "evidence");
    assert(evidencePanel?.visible, "Evidence panel must be visible");
    assert(evidencePanel.text.includes("TLE: CelesTrak NORAD GP · 13 actors · fetched 2026-04-26"), "Evidence must show v2 §4.6 TLE summary line");
    assert(evidencePanel.text.includes("R2: 5 candidate endpoints (read-only catalog)"), "Evidence must show v2 §4.6 R2 summary line");
    assert(layout.evidenceArchive.open === true && layout.evidenceArchive.defaultOpen === "true", "W5 Evidence Archive must be expanded by default");
    assert(layout.evidenceArchive.text.includes("Satellite TLE provenance"), "Evidence Archive must reveal TLE table");
    assert(layout.evidenceArchive.text.includes("R2 read-only candidate catalog"), "Evidence Archive must reveal R2 table");
    assertNoTofuOnSurfaces(layout, "Evidence");
    await captureAndRecord(client, manifest, "w5-evidence-archive-expanded-1440x900.png");

    await setViewport(client, VIEWPORT_LAPTOP);
    await sleep(280);
    layout = await inspectLayout(client);
    assertVisible(layout.topStrip, "1280 top strip", 760, 30);
    assertVisible(layout.leftRail, "1280 left rail", 260, 460);
    assertVisible(layout.footerRow, "1280 footer", 320, 20);
    assertVisible(layout.detailsBtn, "1280 Details button", 60, 30);
    assertVisible(layout.sheet, "1280 inspector", 280, 200);
    assertInspectorTabsFit(layout, "1280 inspector");
    assertNoBottomOverlap(layout, "1280 overlap");
    assert(!rectsOverlap(layout.sheet.rect, layout.controlStrip.rect), "1280 inspector must not overlap control strip");
    assert(!rectsOverlap(layout.leftRail.rect, layout.controlStrip.rect), "1280 left rail must not overlap control strip");
    assertNoTofuOnSurfaces(layout, "1280 overlap");
    await captureAndRecord(client, manifest, "overlap-check-1280x720.png");

    await setViewport(client, VIEWPORT_NARROW);
    await closeDisclosureSurfaces(client);
    await sleep(280);
    layout = await inspectLayout(client);
    assertVisible(layout.footerRow, "narrow footer", 180, 18);
    assertVisible(layout.detailsBtn, "narrow Details button", 56, 38);
    assert(layout.topStrip?.visible === false, "narrow fallback intentionally hides desktop top strip");
    assert(layout.leftRail?.visible === false, "narrow fallback intentionally hides desktop left rail");
    assertHitVisible(layout, "detailsBtn", "narrow Details button");
    assertHitVisible(layout, "footerExplicit", "narrow footer disclosure");
    assertNoBottomOverlap(layout, "narrow fallback");
    assertNoTofuOnSurfaces(layout, "narrow fallback");
    await captureAndRecord(client, manifest, "narrow-fallback-390x844.png");

    manifest.checks.push("w1-w5-holistic-visual-acceptance");
    manifest.checks.push("bottom-domrects-clear-of-cesium-timeline-animation-credits");
    manifest.checks.push("no-fake-measured-values");
    manifest.checks.push("no-cjk-tofu-glyphs");
    manifest.checks.push("w4-entry-cue-then-steady-candidate-halo");
    manifest.checks.push("source-boundary-and-runtime-forbidden-claim-boundaries");
  });

  writeJsonArtifact(outputRoot, "capture-manifest.json", manifest);
  console.log("Phase E smoke passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
