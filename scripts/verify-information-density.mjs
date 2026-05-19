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
const PANEL_READY_TIMEOUT_MS = 15_000;
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
        const details = panel ? Array.from(panel.querySelectorAll("details")) : [];
        const initialOpenCount = details.filter((detail) => detail.open).length;
        const closed = panel
          ? {
              detailsCount: details.length,
              openCount: initialOpenCount,
              panelClientHeight: panel.clientHeight,
              panelScrollHeight: panel.scrollHeight,
              panelNoScroll: panel.scrollHeight === panel.clientHeight,
              panelMaxHeight: panelStyle ? panelStyle.maxHeight : null,
              panelOverflowY: panelStyle ? panelStyle.overflowY : null,
              panelState: panel.dataset.state ?? null
            }
          : null;

        for (const detail of details) detail.open = false;

        const disclosures = [];
        for (let index = 0; index < details.length; index += 1) {
          for (const detail of details) detail.open = false;
          const detail = details[index];
          detail.open = true;
          const summary = detail.querySelector("summary");
          const body = detail.querySelector(".v4-projection-side-panel__details-body");
          const bodyStyle = body ? window.getComputedStyle(body) : null;
          const bodyRect = body ? body.getBoundingClientRect() : null;
          const children = body
            ? Array.from(body.children).map((child) => {
                const childRect = child.getBoundingClientRect();
                return {
                  tagName: child.tagName.toLowerCase(),
                  className: classText(child),
                  height: childRect.height,
                  scrollHeight: child.scrollHeight
                };
              })
            : [];
          const childMaxHeight = children.reduce(
            (max, child) => Math.max(max, child.height, child.scrollHeight),
            0
          );
          disclosures.push({
            index: index + 1,
            label: summary ? summary.textContent.trim() : "",
            open: detail.open,
            bodyClass: classText(body),
            bodyClientHeight: body ? body.clientHeight : null,
            bodyScrollHeight: body ? body.scrollHeight : null,
            bodyRectHeight: bodyRect ? bodyRect.height : null,
            childMaxHeight,
            bodyMaxHeight: bodyStyle ? bodyStyle.maxHeight : null,
            bodyPosition: bodyStyle ? bodyStyle.position : null,
            bodyOverflowY: bodyStyle ? bodyStyle.overflowY : null,
            bodyScrolls: body ? body.scrollHeight > body.clientHeight : false,
            bodyFitsContent: body ? body.clientHeight + 1 >= body.scrollHeight : false,
            panelClientHeight: panel ? panel.clientHeight : null,
            panelScrollHeight: panel ? panel.scrollHeight : null,
            panelNoScroll: panel ? panel.scrollHeight === panel.clientHeight : false,
            children
          });
        }

        for (const detail of details) detail.open = false;

        return {
          panelExists: Boolean(panel),
          closed,
          disclosures,
          rects: {
            chips: rectFor(".ground-station-selection-chips"),
            picker: rectFor(".ground-station-list-picker"),
            strip: rectFor(".m8a-v47-product-ux__strip"),
            panel: rectFor(panelSelector)
          }
        };
      })();
    `,
    returnByValue: true
  });
  return result.value;
}

async function collectWheelScrollSnapshot() {
  const { result: beforeResult } = await send("Runtime.evaluate", {
    expression: `
      (() => {
        const panel = document.querySelector('[data-v4-projection-side-panel="true"]');
        const details = panel ? Array.from(panel.querySelectorAll('[data-row="5"] details')) : [];
        if (!panel || details.length === 0) {
          return { ok: false, reason: "missing panel or disclosures" };
        }
        for (const detail of details) detail.open = false;
        const target = details[1] ?? details[0];
        target.open = true;
        panel.scrollTop = 0;
        const rect = panel.getBoundingClientRect();
        return {
          ok: true,
          beforeScrollTop: panel.scrollTop,
          panelClientHeight: panel.clientHeight,
          panelScrollHeight: panel.scrollHeight,
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
        const details = panel ? Array.from(panel.querySelectorAll('[data-row="5"] details')) : [];
        const afterScrollTop = panel ? panel.scrollTop : null;
        for (const detail of details) detail.open = false;
        return { afterScrollTop };
      })();
    `,
    returnByValue: true
  });

  return {
    ...before,
    afterScrollTop: afterResult.value?.afterScrollTop ?? null
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

function buildViewportResult(viewport, readyInfo, layout, wheelScroll) {
  const closed = layout.closed;
  const disclosures = layout.disclosures;
  const longestDisclosure = disclosures.reduce((current, next) => {
    if (!current) return next;
    const currentHeight = Math.max(
      current.bodyScrollHeight ?? 0,
      current.childMaxHeight ?? 0
    );
    const nextHeight = Math.max(next.bodyScrollHeight ?? 0, next.childMaxHeight ?? 0);
    return nextHeight > currentHeight ? next : current;
  }, null);
  const longestContentHeight = longestDisclosure
    ? Math.max(
        longestDisclosure.bodyScrollHeight ?? 0,
        longestDisclosure.childMaxHeight ?? 0
      )
    : 0;
  const longestBodyScrolls = Boolean(
    longestDisclosure &&
      longestDisclosure.bodyClientHeight !== null &&
      longestDisclosure.bodyClientHeight < longestContentHeight
  );
  const longestPanelScrolls = Boolean(
    longestDisclosure &&
      longestDisclosure.panelClientHeight !== null &&
      longestDisclosure.panelScrollHeight > longestDisclosure.panelClientHeight
  );
  const disclosureBodiesExpandInFlow = disclosures.every(
    (entry) =>
      entry.bodyFitsContent &&
      entry.bodyMaxHeight === "none" &&
      entry.bodyPosition === "static" &&
      entry.bodyOverflowY === "visible"
  );

  const pickerStripOverlap =
    isVisibleRect(layout.rects.picker) && isVisibleRect(layout.rects.strip)
      ? overlapRect(layout.rects.picker, layout.rects.strip)
      : { overlaps: true, width: null, height: null, area: null };

  const leftRects = [
    ["selection-chips", layout.rects.chips],
    ["station-list-picker", layout.rects.picker],
    ["replay-strip", layout.rects.strip]
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
      "panel-root-no-scroll-closed",
      layout.panelExists &&
        closed &&
        closed.panelState === "ready" &&
        closed.openCount === 0 &&
        closed.panelScrollHeight === closed.panelClientHeight,
      {
        panelExists: layout.panelExists,
        readyMs: readyInfo.readyMs,
        panelState: closed?.panelState ?? null,
        openCount: closed?.openCount ?? null,
        panelScrollHeight: closed?.panelScrollHeight ?? null,
        panelClientHeight: closed?.panelClientHeight ?? null,
        panelMaxHeight: closed?.panelMaxHeight ?? null,
        panelOverflowY: closed?.panelOverflowY ?? null
      }
    ),
    assertion(
      "row5-disclosure-root-scroll",
      layout.panelExists &&
        closed &&
        closed.detailsCount === 3 &&
        disclosures.length === 3 &&
        closed.panelNoScroll &&
        closed.panelOverflowY === "auto" &&
        closed.panelMaxHeight !== "none" &&
        longestPanelScrolls &&
        disclosureBodiesExpandInFlow,
      {
        detailsCount: closed?.detailsCount ?? null,
        closedPanelNoScroll: closed?.panelNoScroll ?? null,
        closedPanelMaxHeight: closed?.panelMaxHeight ?? null,
        closedPanelOverflowY: closed?.panelOverflowY ?? null,
        longestPanelScrolls,
        disclosureBodiesExpandInFlow,
        longestDisclosure: longestDisclosure
          ? {
              index: longestDisclosure.index,
              label: longestDisclosure.label,
              bodyClientHeight: longestDisclosure.bodyClientHeight,
              bodyScrollHeight: longestDisclosure.bodyScrollHeight,
              childMaxHeight: longestDisclosure.childMaxHeight,
              contentHeight: longestContentHeight,
              bodyScrolls: longestBodyScrolls,
              bodyFitsContent: longestDisclosure.bodyFitsContent,
              bodyMaxHeight: longestDisclosure.bodyMaxHeight,
              bodyPosition: longestDisclosure.bodyPosition,
              bodyOverflowY: longestDisclosure.bodyOverflowY,
              panelClientHeight: longestDisclosure.panelClientHeight,
              panelScrollHeight: longestDisclosure.panelScrollHeight
            }
          : null,
        disclosures: disclosures.map((entry) => ({
          index: entry.index,
          label: entry.label,
          bodyClass: entry.bodyClass,
          bodyClientHeight: entry.bodyClientHeight,
          bodyScrollHeight: entry.bodyScrollHeight,
          childMaxHeight: entry.childMaxHeight,
          bodyScrolls: entry.bodyScrolls,
          bodyFitsContent: entry.bodyFitsContent,
          bodyMaxHeight: entry.bodyMaxHeight,
          bodyPosition: entry.bodyPosition,
          bodyOverflowY: entry.bodyOverflowY,
          panelScrollHeight: entry.panelScrollHeight,
          panelClientHeight: entry.panelClientHeight,
          panelNoScroll: entry.panelNoScroll
        }))
      }
    ),
    assertion(
      "row5-panel-wheel-scroll",
      wheelScroll?.ok &&
        wheelScroll.panelScrollHeight > wheelScroll.panelClientHeight &&
        wheelScroll.afterScrollTop > wheelScroll.beforeScrollTop,
      {
        ok: wheelScroll?.ok ?? false,
        reason: wheelScroll?.reason ?? null,
        beforeScrollTop: wheelScroll?.beforeScrollTop ?? null,
        afterScrollTop: wheelScroll?.afterScrollTop ?? null,
        panelClientHeight: wheelScroll?.panelClientHeight ?? null,
        panelScrollHeight: wheelScroll?.panelScrollHeight ?? null
      }
    ),
    assertion(
      "station-list-picker-replay-strip-no-overlap",
      isVisibleRect(layout.rects.picker) &&
        isVisibleRect(layout.rects.strip) &&
        !pickerStripOverlap.overlaps,
      {
        picker: layout.rects.picker,
        strip: layout.rects.strip,
        overlap: pickerStripOverlap
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
  const wheelScroll = await collectWheelScrollSnapshot();
  return buildViewportResult(viewport, readyInfo, layout, wheelScroll);
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
