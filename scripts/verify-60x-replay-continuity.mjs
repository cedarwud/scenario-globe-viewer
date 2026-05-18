#!/usr/bin/env node
// Acceptance gate G3 — 60x replay continuity. Walks the surface through a
// 6-minute wall-clock 60x playback and asserts the four conditions in
// docs/sdd/multi-station-selector/acceptance-criteria.md §G3.
//
// Requires: vite dev server already running on http://127.0.0.1:5173,
// chromium 1217 binary at the cached playwright path, no other browser
// holding the picked debugging port.
//
// Usage:
//   node scripts/verify-60x-replay-continuity.mjs [--url=<demo-url>] [--port=<cdp-port>]

import { spawn } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const DEFAULT_URL =
  "http://127.0.0.1:5173/?stationA=ksat-svalsat-svalbard&stationB=ksat-tromso&startUtc=2026-05-17T00%3A00%3A00.000Z&durationMinutes=360";
const CHROMIUM_PATH =
  "/home/u24/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome";
const WALL_CLOCK_RUN_SECONDS = 360; // 6 min == 60x of 6 h window
const SAMPLE_INTERVAL_SECONDS = 5;
const FPS_AVG_FLOOR = 45;
const FPS_P95_FLOOR = 28;
const NO_FRAME_STARVATION_MS = 200;

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
const cdpPort = Number.parseInt(args.port ?? "9444", 10);
const profileDir = join(tmpdir(), `sgv-g3-${cdpPort}`);

if (!existsSync(CHROMIUM_PATH)) {
  console.error(`chromium binary missing at ${CHROMIUM_PATH}`);
  process.exit(2);
}

rmSync(profileDir, { recursive: true, force: true });

const chrome = spawn(
  CHROMIUM_PATH,
  [
    "--headless=new",
    // The G3 spec pins `--use-gl=swiftshader`; the previous
    // `--use-angle=swiftshader` switch routes through ANGLE which
    // throttles raf to ~1Hz in headless on this WSL2 host. The
    // direct-gl path keeps raf at native cadence under focus
    // emulation.
    "--use-gl=swiftshader",
    "--disable-dev-shm-usage",
    "--no-sandbox",
    // Headless Chromium throttles requestAnimationFrame in
    // background / occluded tabs (down to ~1Hz). The G3 smoke samples
    // raf rate to derive fps, so the throttling makes every run fail
    // regardless of actual replay performance. Disable the three
    // background-throttling code paths so the active tab keeps
    // running at full raf cadence.
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
    "--disable-backgrounding-occluded-windows",
    `--user-data-dir=${profileDir}`,
    `--remote-debugging-port=${cdpPort}`,
    "--window-size=1440,900",
    "about:blank"
  ],
  { stdio: ["ignore", "ignore", "ignore"] }
);
chrome.unref();

async function waitForPort(port, timeoutMs = 10_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) return;
    } catch {
      // not ready
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`cdp port ${port} never became ready`);
}

await waitForPort(cdpPort);

const targets = await (
  await fetch(`http://127.0.0.1:${cdpPort}/json/list`)
).json();
const page = targets.find((entry) => entry.type === "page");
if (!page) {
  throw new Error("no page target available on chromium");
}

const ws = new WebSocket(page.webSocketDebuggerUrl);
let messageId = 0;
const pending = new Map();
const consoleErrors = [];
const pageErrors = [];

ws.addEventListener("message", (event) => {
  const data = JSON.parse(event.data.toString());
  if (data.id && pending.has(data.id)) {
    const { resolve, reject } = pending.get(data.id);
    pending.delete(data.id);
    if (data.error) reject(new Error(data.error.message));
    else resolve(data.result);
    return;
  }
  if (data.method === "Runtime.consoleAPICalled" && data.params.type === "error") {
    consoleErrors.push(
      data.params.args.map((arg) => arg.value ?? arg.description ?? "").join(" ")
    );
  } else if (data.method === "Runtime.exceptionThrown") {
    pageErrors.push(data.params.exceptionDetails.text);
  }
});

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++messageId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

await new Promise((resolve) => ws.addEventListener("open", () => resolve(), { once: true }));

await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 900,
  deviceScaleFactor: 1,
  mobile: false
});
// Headless chromium throttles raf in inactive tabs to ~1Hz; focus
// emulation flags the tab as focused so raf runs at native cadence.
await send("Emulation.setFocusEmulationEnabled", { enabled: true });
await send("Page.navigate", { url: targetUrl });
await new Promise((resolve) => setTimeout(resolve, 8_000));

// Click the 60x button. The button data attribute pattern is
// data-m8a-v47-multiplier="60" inside the replay strip's speed group.
await send("Runtime.evaluate", {
  expression: `
    (() => {
      const button = document.querySelector(
        '[data-m8a-v47-control-group="speed"] button[data-m8a-v47-playback-multiplier="60"]'
      );
      if (!button) return { ok: false, reason: 'no 60x button' };
      button.click();
      return { ok: true };
    })();
  `,
  returnByValue: true
});

await send("Runtime.evaluate", {
  expression: `
    (() => {
      window.__SGV_FRAME_STAMPS__ = [];
      window.__SGV_PANEL_STATE_SAMPLES__ = [];
      const tick = (timestamp) => {
        window.__SGV_FRAME_STAMPS__.push(timestamp);
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      setInterval(() => {
        const panel = document.querySelector('[data-v4-projection-side-panel="true"]');
        window.__SGV_PANEL_STATE_SAMPLES__.push(
          panel ? panel.dataset.state ?? null : null
        );
      }, ${SAMPLE_INTERVAL_SECONDS * 1000});
      return true;
    })();
  `,
  returnByValue: true
});

await new Promise((resolve) =>
  setTimeout(resolve, WALL_CLOCK_RUN_SECONDS * 1000)
);

const { result: framesResult } = await send("Runtime.evaluate", {
  expression: "JSON.stringify(window.__SGV_FRAME_STAMPS__)",
  returnByValue: true
});
const { result: stateResult } = await send("Runtime.evaluate", {
  expression: "JSON.stringify(window.__SGV_PANEL_STATE_SAMPLES__)",
  returnByValue: true
});

const frameTimes = JSON.parse(framesResult.value);
const panelStates = JSON.parse(stateResult.value);

const intervals = [];
for (let index = 1; index < frameTimes.length; index += 1) {
  intervals.push(frameTimes[index] - frameTimes[index - 1]);
}
intervals.sort((left, right) => left - right);
const p95Index = Math.floor(intervals.length * 0.95);
const p95IntervalMs = intervals[p95Index];

const windowCount = Math.floor(WALL_CLOCK_RUN_SECONDS / SAMPLE_INTERVAL_SECONDS);
const fpsPerWindow = [];
for (let windowIndex = 0; windowIndex < windowCount; windowIndex += 1) {
  const windowStart = windowIndex * SAMPLE_INTERVAL_SECONDS * 1000;
  const windowEnd = windowStart + SAMPLE_INTERVAL_SECONDS * 1000;
  const frames = frameTimes.filter(
    (timestamp) => timestamp >= windowStart && timestamp < windowEnd
  );
  fpsPerWindow.push(frames.length / SAMPLE_INTERVAL_SECONDS);
}
const fpsAvg =
  fpsPerWindow.reduce((sum, current) => sum + current, 0) / fpsPerWindow.length;

const p95FpsFromInterval = p95IntervalMs > 0 ? 1000 / p95IntervalMs : 0;
const maxGapMs = intervals.length > 0 ? intervals[intervals.length - 1] : 0;
const sawStarvation = maxGapMs > NO_FRAME_STARVATION_MS;
const allReady = panelStates.every((state) => state === "ready");
const noErrors = consoleErrors.length === 0 && pageErrors.length === 0;

const verdict = {
  url: targetUrl,
  fpsAvg,
  fpsP95FromInterval: p95FpsFromInterval,
  maxFrameGapMs: maxGapMs,
  panelStateSampleCount: panelStates.length,
  panelAllReady: allReady,
  panelStateNonReadyValues: panelStates.filter((state) => state !== "ready"),
  consoleErrorCount: consoleErrors.length,
  consoleErrorMessages: consoleErrors.slice(0, 10),
  pageErrorCount: pageErrors.length,
  pageErrorMessages: pageErrors.slice(0, 10),
  pass:
    fpsAvg >= FPS_AVG_FLOOR &&
    p95FpsFromInterval >= FPS_P95_FLOOR &&
    !sawStarvation &&
    allReady &&
    noErrors
};
console.log(JSON.stringify(verdict, null, 2));

ws.close();
chrome.kill("SIGTERM");
for (let attempt = 0; attempt < 8; attempt += 1) {
  try {
    rmSync(profileDir, { recursive: true, force: true, maxRetries: 4 });
    break;
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
}

process.exit(verdict.pass ? 0 : 1);
