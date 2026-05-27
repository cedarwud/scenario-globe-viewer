#!/usr/bin/env node
// Acceptance gate G5 layout smoke.
//
// Requires: Vite dev server on http://127.0.0.1:5173 and Chromium 1217 at
// the cached Playwright path below.
//
// Usage:
//   node scripts/verify-information-density.mjs [--port=<cdp-port>]

import { spawn } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const DEFAULT_URL =
  "http://127.0.0.1:5173/?stationA=ksat-svalsat-svalbard&stationB=ksat-tromso&startUtc=2026-05-17T00%3A00%3A00.000Z&durationMinutes=360";
const CHROMIUM_PATH =
  "/home/u24/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome";
const VIEWPORTS = [
  { width: 1280, height: 800 },
  { width: 1920, height: 1080 }
];
const CDP_READY_TIMEOUT_MS = 10_000;
const PANEL_READY_TIMEOUT_MS = 50_000;
const LAYOUT_SETTLE_MS = 250;
const OVERLAP_EPSILON_PX = 0.5;

// Split only on the FIRST `=` so a value that itself contains `=` (such
// as a URL with query parameters) survives intact.
const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const splitAt = arg.indexOf("=");
    if (splitAt < 0) {
      return [arg.replace(/^--/, ""), ""];
    }
    return [
      arg.slice(0, splitAt).replace(/^--/, ""),
      arg.slice(splitAt + 1)
    ];
  })
);

const targetUrl = args.url ?? DEFAULT_URL;
const cdpPort = Number.parseInt(args.port ?? "9446", 10);
const profileDir = join(tmpdir(), `sgv-g5-${cdpPort}`);

const report = {
  script: "verify-information-density",
  url: targetUrl,
  cdpPort,
  chromiumPath: CHROMIUM_PATH,
  viewports: [],
  failures: [],
  passed: false
};

if (!existsSync(CHROMIUM_PATH)) {
  report.failures.push({
    viewport: null,
    assertion: "chromium-binary-present",
    message: `chromium binary missing at ${CHROMIUM_PATH}`
  });
  console.log(JSON.stringify(report, null, 2));
  process.exit(2);
}

let chrome = null;
let ws = null;
let messageId = 0;
const pending = new Map();

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForPort(port, timeoutMs = CDP_READY_TIMEOUT_MS) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) return;
    } catch {
      // Chrome is still starting.
    }
    await delay(250);
  }
  throw new Error(`cdp port ${port} never became ready`);
}

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++messageId;
    pending.set(id, { resolve, reject, method });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function connectToPage(port) {
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = targets.find((entry) => entry.type === "page");
  if (!page) throw new Error("no page target available on chromium");

  ws = new WebSocket(page.webSocketDebuggerUrl);
  ws.addEventListener("message", (event) => {
    const data = JSON.parse(event.data.toString());
    if (!data.id || !pending.has(data.id)) return;

    const { resolve, reject, method } = pending.get(data.id);
    pending.delete(data.id);
    if (data.error) {
      reject(new Error(`${method}: ${data.error.message}`));
    } else {
      resolve(data.result);
    }
  });
  ws.addEventListener("close", () => {
    for (const { reject, method } of pending.values()) {
      reject(new Error(`${method}: cdp socket closed`));
    }
    pending.clear();
  });

  await new Promise((resolve, reject) => {
    ws.addEventListener("open", () => resolve(), { once: true });
    ws.addEventListener(
      "error",
      () => reject(new Error("cdp socket failed to open")),
      { once: true }
    );
  });
}

async function waitForPanelReady(timeoutMs = PANEL_READY_TIMEOUT_MS) {
  const start = Date.now();
  let lastState = null;
  while (Date.now() - start < timeoutMs) {
    const { result } = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const panel = document.querySelector('[data-v4-projection-side-panel="true"]');
          return panel ? panel.dataset.state ?? null : null;
        })();
      `,
      returnByValue: true
    });
    lastState = result.value ?? null;
    if (lastState === "ready") {
      return {
        readyMs: Date.now() - start,
        state: lastState
      };
    }
    await delay(50);
  }
  throw new Error(`panel did not reach ready; last state: ${lastState}`);
}

async function collectLayoutSnapshot() {
  const { result } = await send("Runtime.evaluate", {
    expression: `
      (() => {
        const panelSelector = '[data-v4-projection-side-panel="true"]';
        const rectFor = (selector) => {
          const element = document.querySelector(selector);
          if (!element) {
            return { selector, exists: false, visible: false };
          }
          const rect = element.getBoundingClientRect();
          const style = window.getComputedStyle(element);
          return {
            selector,
            exists: true,
            visible:
              style.display !== "none" &&
              style.visibility !== "hidden" &&
              rect.width > 0 &&
              rect.height > 0,
            left: rect.left,
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            width: rect.width,
            height: rect.height
          };
        };
        const classText = (element) => {
          if (!element) return null;
          return typeof element.className === "string"
            ? element.className
            : String(element.className);
        };
        const panel = document.querySelector(panelSelector);
        const panelStyle = panel ? window.getComputedStyle(panel) : null;
        const evidenceDrawer = document.querySelector(
          ".v4-projection-side-panel__evidence-drawer"
        );
        const replayDock =
          panel?.querySelector(".v4-projection-side-panel__replay-dock") ??
          null;
        const currentMarker =
          panel?.querySelector("[data-v4-timeline-current-marker='true']") ??
          null;
        const mainChildren = panel
          ? Array.from(panel.children).filter(
              (child) => child !== evidenceDrawer
            )
          : [];
        const mainChildRects = mainChildren.map((child) => {
          const rect = child.getBoundingClientRect();
          const style = window.getComputedStyle(child);
          return {
            tagName: child.tagName.toLowerCase(),
            className: classText(child),
            row: child.getAttribute("data-row"),
            hidden: child.hidden === true || style.display === "none",
            top: rect.top,
            bottom: rect.bottom,
            left: rect.left,
            right: rect.right,
            width: rect.width,
            height: rect.height
          };
        });
        const closed = panel
          ? {
              panelClientHeight: panel.clientHeight,
              panelScrollHeight: panel.scrollHeight,
              panelNoScroll: panel.scrollHeight <= panel.clientHeight + 2,
              panelMaxHeight: panelStyle ? panelStyle.maxHeight : null,
              panelOverflowY: panelStyle ? panelStyle.overflowY : null,
              panelState: panel.dataset.state ?? null,
              decisionCardCount: panel.querySelectorAll(
                ':scope > [data-row="4"] .v4-projection-side-panel__decision-card'
              ).length,
              timelineSegmentCount: panel.querySelectorAll(
                ':scope > [data-row="3"] .v4-projection-side-panel__timeline-segment'
              ).length,
              timelineTickCount: panel.querySelectorAll(
                ':scope > [data-row="3"] .v4-projection-side-panel__timeline-tick'
              ).length,
              overviewDetailsCount: panel.querySelectorAll(
                ':scope > [data-row="3"] .v4-projection-side-panel__overview-details'
              ).length,
              timelineMapCount: panel.querySelectorAll(
                ':scope > [data-row="3"][data-timeline-map="true"]'
              ).length,
              openOverviewDetailsCount: panel.querySelectorAll(
                ':scope > [data-row="3"] .v4-projection-side-panel__overview-details[open]'
              ).length,
              defaultDetailsCount: panel.querySelectorAll(
                ':scope > details:not(.v4-projection-side-panel__overview-details), :scope > [data-row] details:not(.v4-projection-side-panel__overview-details)'
              ).length,
              summarySectionCount: panel.querySelectorAll(
                ':scope > [data-row] .v4-projection-side-panel__summary-section'
              ).length,
              replayDockExists: Boolean(replayDock),
              replayDockInPanel: replayDock ? panel.contains(replayDock) : false,
              replayProxyControlCount: panel.querySelectorAll(
                '.v4-projection-side-panel__replay-dock [data-v4-replay-proxy]'
              ).length,
              currentMarkerExists: Boolean(currentMarker),
              currentMarkerInPanel: currentMarker
                ? panel.contains(currentMarker)
                : false,
              currentMarkerState: currentMarker
                ? currentMarker.getAttribute("data-window-state")
                : null,
              currentMarkerUtc: currentMarker
                ? currentMarker.getAttribute("data-current-utc")
                : null,
              currentMarkerLeft: currentMarker
                ? window.getComputedStyle(currentMarker).getPropertyValue("--current-left").trim()
                : null,
              evidenceDrawerExists: Boolean(evidenceDrawer),
              evidenceDrawerHidden: evidenceDrawer ? evidenceDrawer.hidden === true : null,
              evidenceOpen: evidenceDrawer ? evidenceDrawer.dataset.open ?? "false" : null,
              mainChildRects,
              offscreenMainChildren: mainChildRects.filter(
                (entry) => !entry.hidden && entry.bottom > window.innerHeight + 0.5
              )
            }
          : null;

        return {
          panelExists: Boolean(panel),
          closed,
          rects: {
            chips: rectFor(".ground-station-selection-chips"),
            picker: rectFor(".ground-station-list-picker"),
            strip: rectFor(".m8a-v47-product-ux__strip"),
            cesiumToolbar: rectFor(".cesium-viewer-toolbar"),
            cesiumTimeline: rectFor(".cesium-viewer-timelineContainer"),
            cesiumAnimation: rectFor(".cesium-viewer-animationContainer"),
            replayDock: rectFor(".v4-projection-side-panel__replay-dock"),
            currentMarker: rectFor("[data-v4-timeline-current-marker='true']"),
            panel: rectFor(panelSelector)
          }
        };
      })();
    `,
    returnByValue: true
  });
  return result.value;
}

async function collectEvidenceScrollSnapshot() {
  const { result: beforeResult } = await send("Runtime.evaluate", {
    expression: `
      (() => {
        const panel = document.querySelector('[data-v4-projection-side-panel="true"]');
        const button = panel?.querySelector(".v4-projection-side-panel__evidence-button") ?? null;
        const drawer = document.querySelector(".v4-projection-side-panel__evidence-drawer");
        if (!panel || !button || !drawer) {
          return { ok: false, reason: "missing panel, evidence button, or drawer" };
        }
        const defaultHidden = drawer.hidden === true;
        if (drawer.hidden) {
          button.click();
        }
        for (const detail of drawer.querySelectorAll("details")) {
          detail.open = true;
        }
        drawer.scrollTop = 0;
        const rect = drawer.getBoundingClientRect();
        return {
          ok: true,
          defaultHidden,
          beforeScrollTop: drawer.scrollTop,
          drawerClientHeight: drawer.clientHeight,
          drawerScrollHeight: drawer.scrollHeight,
          drawerHiddenAfterOpen: drawer.hidden === true,
          x: Math.max(rect.left + 4, Math.min(rect.left + rect.width / 2, rect.right - 4)),
          y: Math.max(rect.top + 4, Math.min(rect.top + rect.height / 2, rect.bottom - 4))
        };
      })();
    `,
    returnByValue: true
  });
  const before = beforeResult.value;
  if (!before?.ok) {
    return before;
  }

  await send("Input.dispatchMouseEvent", {
    type: "mouseWheel",
    x: before.x,
    y: before.y,
    deltaX: 0,
    deltaY: 600
  });
  await delay(150);

  const { result: afterResult } = await send("Runtime.evaluate", {
    expression: `
      (() => {
        const panel = document.querySelector('[data-v4-projection-side-panel="true"]');
        const button = panel?.querySelector(".v4-projection-side-panel__evidence-button") ?? null;
        const drawer = document.querySelector(".v4-projection-side-panel__evidence-drawer");
        if (drawer) {
          drawer.scrollTop = 600;
        }
        const afterScrollTop = drawer ? drawer.scrollTop : null;
        if (drawer && !drawer.hidden && button) {
          button.click();
        }
        return {
          afterScrollTop,
          drawerHiddenAfterClose: drawer ? drawer.hidden === true : null
        };
      })();
    `,
    returnByValue: true
  });

  return {
    ...before,
    afterScrollTop: afterResult.value?.afterScrollTop ?? null,
    drawerHiddenAfterClose: afterResult.value?.drawerHiddenAfterClose ?? null
  };
}

async function collectReplayDockInteractionSnapshot() {
  const readExpression = `
    (() => {
      const panel = document.querySelector('[data-v4-projection-side-panel="true"]');
      const proxy = panel?.querySelector('[data-v4-replay-proxy="play-pause"]') ?? null;
      const source = document.querySelector(
        '.m8a-v47-product-ux__strip [data-m8a-v47-control-id="play-pause"]'
      );
      if (!panel || !proxy || !source) {
        return {
          ok: false,
          reason: "missing panel, proxy play button, or source play button",
          panelExists: Boolean(panel),
          proxyExists: Boolean(proxy),
          sourceExists: Boolean(source)
        };
      }
      return {
        ok: true,
        proxyDisabled: proxy.disabled === true || proxy.getAttribute("aria-disabled") === "true",
        proxyText: proxy.textContent?.trim() ?? "",
        proxyAriaLabel: proxy.getAttribute("aria-label") ?? "",
        sourceAction: source.dataset.m8aV47Action ?? "",
        sourceText: source.textContent?.trim() ?? "",
        sourceAriaLabel: source.getAttribute("aria-label") ?? ""
      };
    })();
  `;
  const { result: beforeResult } = await send("Runtime.evaluate", {
    expression: readExpression,
    returnByValue: true
  });
  const before = beforeResult.value;
  if (!before?.ok || before.proxyDisabled) {
    return {
      ok: false,
      reason: before?.reason ?? "proxy play button unavailable",
      before
    };
  }

  await send("Runtime.evaluate", {
    expression: `
      (() => {
        const proxy = document.querySelector(
          '[data-v4-projection-side-panel="true"] [data-v4-replay-proxy="play-pause"]'
        );
        proxy?.click();
        return Boolean(proxy);
      })();
    `,
    returnByValue: true
  });
  await delay(200);

  const { result: afterResult } = await send("Runtime.evaluate", {
    expression: readExpression,
    returnByValue: true
  });
  const after = afterResult.value;

  if (
    after?.ok &&
    before.sourceAction &&
    after.sourceAction &&
    after.sourceAction !== before.sourceAction
  ) {
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const proxy = document.querySelector(
            '[data-v4-projection-side-panel="true"] [data-v4-replay-proxy="play-pause"]'
          );
          proxy?.click();
          return Boolean(proxy);
        })();
      `,
      returnByValue: true
    });
    await delay(100);
  }

  return {
    ok: true,
    before,
    after
  };
}

function isVisibleRect(rect) {
  return Boolean(rect && rect.exists && rect.visible);
}

function overlapRect(a, b) {
  const width = Math.max(
    0,
    Math.min(a.right, b.right) - Math.max(a.left, b.left)
  );
  const height = Math.max(
    0,
    Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
  );
  if (width <= OVERLAP_EPSILON_PX || height <= OVERLAP_EPSILON_PX) {
    return { overlaps: false, width, height, area: 0 };
  }
  return { overlaps: true, width, height, area: width * height };
}

function assertion(name, passed, details) {
  return { name, passed: Boolean(passed), details };
}

function buildViewportResult(
  viewport,
  readyInfo,
  layout,
  evidenceScroll,
  replayDockInteraction
) {
  const closed = layout.closed;

  const toolbarPanelOverlap =
    isVisibleRect(layout.rects.cesiumToolbar) && isVisibleRect(layout.rects.panel)
      ? overlapRect(layout.rects.cesiumToolbar, layout.rects.panel)
      : { overlaps: true, width: null, height: null, area: null };
  const nativeBottomPairs = [
    ["cesium-timeline", layout.rects.cesiumTimeline],
    ["cesium-animation", layout.rects.cesiumAnimation]
  ].map(([name, rect]) => {
    const visible = isVisibleRect(rect) && isVisibleRect(layout.rects.panel);
    const overlap = visible
      ? overlapRect(rect, layout.rects.panel)
      : { overlaps: false, width: null, height: null, area: null };
    return {
      name,
      visible: isVisibleRect(rect),
      panelVisible: isVisibleRect(layout.rects.panel),
      ...overlap
    };
  });
  const replayDockWithinPanel =
    isVisibleRect(layout.rects.replayDock) && isVisibleRect(layout.rects.panel)
      ? {
          within:
            layout.rects.replayDock.top >=
              layout.rects.panel.top - OVERLAP_EPSILON_PX &&
            layout.rects.replayDock.bottom <=
              layout.rects.panel.bottom + OVERLAP_EPSILON_PX &&
            layout.rects.replayDock.left >=
              layout.rects.panel.left - OVERLAP_EPSILON_PX &&
            layout.rects.replayDock.right <=
              layout.rects.panel.right + OVERLAP_EPSILON_PX,
          topGap: layout.rects.replayDock.top - layout.rects.panel.top,
          bottomGap: layout.rects.panel.bottom - layout.rects.replayDock.bottom
        }
      : { within: false, topGap: null, bottomGap: null };

  const leftRects = [
    ["selection-chips", layout.rects.chips],
    ["station-list-picker", layout.rects.picker]
  ];
  const rightRects = [["projection-side-panel", layout.rects.panel]];
  const topPairs = [];
  for (const [leftName, leftRect] of leftRects) {
    for (const [rightName, rightRect] of rightRects) {
      const visible = isVisibleRect(leftRect) && isVisibleRect(rightRect);
      const overlap = visible
        ? overlapRect(leftRect, rightRect)
        : { overlaps: true, width: null, height: null, area: null };
      topPairs.push({
        left: leftName,
        right: rightName,
        leftVisible: isVisibleRect(leftRect),
        rightVisible: isVisibleRect(rightRect),
        ...overlap
      });
    }
  }

  const assertions = [
    assertion(
      "panel-root-bounded-above-native-bottom",
      layout.panelExists &&
        closed &&
        closed.panelState === "ready" &&
        isVisibleRect(layout.rects.panel) &&
        nativeBottomPairs.every((pair) => !pair.overlaps),
      {
        panelExists: layout.panelExists,
        readyMs: readyInfo.readyMs,
        panelState: closed?.panelState ?? null,
        panelNoScroll: closed?.panelNoScroll ?? null,
        panelScrollHeight: closed?.panelScrollHeight ?? null,
        panelClientHeight: closed?.panelClientHeight ?? null,
        panelMaxHeight: closed?.panelMaxHeight ?? null,
        panelOverflowY: closed?.panelOverflowY ?? null,
        panel: layout.rects.panel,
        nativeBottomPairs
      }
    ),
    assertion(
      "main-panel-bounded-decision-surface",
      layout.panelExists &&
        closed &&
        closed.decisionCardCount <= 3 &&
        closed.timelineSegmentCount <= 18 &&
        closed.timelineTickCount <= 12 &&
        closed.timelineMapCount === 1 &&
        closed.overviewDetailsCount === 0 &&
        closed.openOverviewDetailsCount === 0 &&
        closed.defaultDetailsCount === 0 &&
        closed.summarySectionCount === 0,
      {
        offscreenMainChildren: closed?.offscreenMainChildren ?? null,
        decisionCardCount: closed?.decisionCardCount ?? null,
        timelineSegmentCount: closed?.timelineSegmentCount ?? null,
        timelineTickCount: closed?.timelineTickCount ?? null,
        timelineMapCount: closed?.timelineMapCount ?? null,
        overviewDetailsCount: closed?.overviewDetailsCount ?? null,
        openOverviewDetailsCount: closed?.openOverviewDetailsCount ?? null,
        defaultDetailsCount: closed?.defaultDetailsCount ?? null,
        summarySectionCount: closed?.summarySectionCount ?? null,
        mainChildRects: closed?.mainChildRects ?? null
      }
    ),
    assertion(
      "evidence-drawer-closed-default-and-scrolls",
      evidenceScroll?.ok &&
        evidenceScroll.defaultHidden === true &&
        evidenceScroll.drawerHiddenAfterOpen === false &&
        evidenceScroll.drawerScrollHeight > evidenceScroll.drawerClientHeight &&
        evidenceScroll.afterScrollTop > evidenceScroll.beforeScrollTop &&
        evidenceScroll.drawerHiddenAfterClose === true,
      {
        ok: evidenceScroll?.ok ?? false,
        reason: evidenceScroll?.reason ?? null,
        defaultHidden: evidenceScroll?.defaultHidden ?? null,
        drawerHiddenAfterOpen: evidenceScroll?.drawerHiddenAfterOpen ?? null,
        beforeScrollTop: evidenceScroll?.beforeScrollTop ?? null,
        afterScrollTop: evidenceScroll?.afterScrollTop ?? null,
        drawerClientHeight: evidenceScroll?.drawerClientHeight ?? null,
        drawerScrollHeight: evidenceScroll?.drawerScrollHeight ?? null,
        drawerHiddenAfterClose: evidenceScroll?.drawerHiddenAfterClose ?? null
      }
    ),
    assertion(
      "cesium-toolbar-projection-panel-no-overlap",
      isVisibleRect(layout.rects.cesiumToolbar) &&
        isVisibleRect(layout.rects.panel) &&
        !toolbarPanelOverlap.overlaps,
      {
        toolbar: layout.rects.cesiumToolbar,
        panel: layout.rects.panel,
        overlap: toolbarPanelOverlap
      }
    ),
    assertion(
      "replay-controls-integrated-in-panel",
      layout.panelExists &&
        closed &&
        closed.replayDockExists === true &&
        closed.replayDockInPanel === true &&
        closed.replayProxyControlCount === 5 &&
        isVisibleRect(layout.rects.replayDock) &&
        replayDockWithinPanel.within &&
        !isVisibleRect(layout.rects.strip),
      {
        replayDockExists: closed?.replayDockExists ?? null,
        replayDockInPanel: closed?.replayDockInPanel ?? null,
        replayProxyControlCount: closed?.replayProxyControlCount ?? null,
        replayDockWithinPanel,
        replayDock: layout.rects.replayDock,
        sourceStrip: layout.rects.strip
      }
    ),
    assertion(
      "replay-dock-proxy-click-controls-replay",
      replayDockInteraction?.ok &&
        replayDockInteraction.before?.proxyDisabled === false &&
        replayDockInteraction.before?.sourceAction &&
        replayDockInteraction.after?.sourceAction &&
        replayDockInteraction.after.sourceAction !==
          replayDockInteraction.before.sourceAction,
      {
        ok: replayDockInteraction?.ok ?? false,
        reason: replayDockInteraction?.reason ?? null,
        before: replayDockInteraction?.before ?? null,
        after: replayDockInteraction?.after ?? null
      }
    ),
    assertion(
      "timeline-current-marker-mounted",
      layout.panelExists &&
        closed &&
        closed.currentMarkerExists === true &&
        closed.currentMarkerInPanel === true &&
        isVisibleRect(layout.rects.currentMarker) &&
        ["before", "inside", "after"].includes(closed.currentMarkerState) &&
        Number.isFinite(
          Number.parseFloat(String(closed.currentMarkerLeft ?? ""))
        ) &&
        typeof closed.currentMarkerUtc === "string" &&
        closed.currentMarkerUtc.length > 0,
      {
        currentMarkerExists: closed?.currentMarkerExists ?? null,
        currentMarkerInPanel: closed?.currentMarkerInPanel ?? null,
        currentMarkerState: closed?.currentMarkerState ?? null,
        currentMarkerUtc: closed?.currentMarkerUtc ?? null,
        currentMarkerLeft: closed?.currentMarkerLeft ?? null,
        currentMarker: layout.rects.currentMarker
      }
    ),
    assertion(
      "top-left-top-right-no-overlap",
      topPairs.every(
        (pair) => pair.leftVisible && pair.rightVisible && !pair.overlaps
      ),
      { pairs: topPairs }
    )
  ];

  return {
    viewport,
    panelReadyMs: readyInfo.readyMs,
    assertions,
    passed: assertions.every((entry) => entry.passed)
  };
}

async function runViewport(viewport) {
  await send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: false
  });
  await send("Page.navigate", { url: targetUrl });
  const readyInfo = await waitForPanelReady();
  await delay(LAYOUT_SETTLE_MS);
  const layout = await collectLayoutSnapshot();
  const replayDockInteraction = await collectReplayDockInteractionSnapshot();
  const evidenceScroll = await collectEvidenceScrollSnapshot();
  return buildViewportResult(
    viewport,
    readyInfo,
    layout,
    evidenceScroll,
    replayDockInteraction
  );
}

try {
  rmSync(profileDir, { recursive: true, force: true });
  chrome = spawn(
    CHROMIUM_PATH,
    [
      "--headless=new",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      "--disable-dev-shm-usage",
      "--no-sandbox",
      `--user-data-dir=${profileDir}`,
      `--remote-debugging-port=${cdpPort}`,
      "--window-size=1920,1080",
      "about:blank"
    ],
    { stdio: ["ignore", "ignore", "ignore"] }
  );
  chrome.unref();

  await waitForPort(cdpPort);
  await connectToPage(cdpPort);
  await send("Page.enable");
  await send("Runtime.enable");

  for (const viewport of VIEWPORTS) {
    report.viewports.push(await runViewport(viewport));
  }

  report.failures = report.viewports.flatMap((entry) =>
    entry.assertions
      .filter((item) => !item.passed)
      .map((item) => ({
        viewport: entry.viewport,
        assertion: item.name,
        details: item.details
      }))
  );
  report.passed = report.failures.length === 0;
} catch (error) {
  report.failures.push({
    viewport: null,
    assertion: "driver-fatal",
    message: error instanceof Error ? error.message : String(error)
  });
  report.passed = false;
} finally {
  if (ws) ws.close();
  if (chrome) chrome.kill("SIGTERM");
  // chrome may still be releasing handles when we hit rmSync; retry a few
  // times to avoid an ENOTEMPTY from this finally block masking the actual
  // smoke verdict in the report below.
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      rmSync(profileDir, { recursive: true, force: true, maxRetries: 4 });
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
}

console.log(JSON.stringify(report, null, 2));
process.exit(report.passed ? 0 : 1);
