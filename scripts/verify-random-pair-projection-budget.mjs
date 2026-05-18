#!/usr/bin/env node
// Acceptance gate G4 — any-2-station real-time compute budget. Exercises
// 10 random pairs + 5 walkthrough pairs + 3 worst-case pairs against the
// selected-pair runtime projection worker. Asserts each compute completes
// in under 1000 ms.
//
// Requires: vite dev server on http://127.0.0.1:5173; chromium 1217.
//
// Usage:
//   node scripts/verify-random-pair-projection-budget.mjs [--port=<cdp-port>] [--seed=<int>]

import { spawn } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const moduleDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(moduleDir, "..");
const registryPath = join(
  projectRoot,
  "public/fixtures/ground-stations/multi-orbit-public-registry.json"
);
const CHROMIUM_PATH =
  "/home/u24/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome";
const COMPUTE_BUDGET_MS = 1000;
const RANDOM_PAIR_COUNT = 10;

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .map((arg) => arg.split("="))
    .map(([key, value]) => [key.replace(/^--/, ""), value])
);
const cdpPort = Number.parseInt(args.port ?? "9445", 10);
const seed = Number.parseInt(args.seed ?? "20260517", 10);
const profileDir = join(tmpdir(), `sgv-g4-${cdpPort}`);

if (!existsSync(CHROMIUM_PATH)) {
  console.error(`chromium binary missing at ${CHROMIUM_PATH}`);
  process.exit(2);
}

const registry = JSON.parse(readFileSync(registryPath, "utf-8"));
const stations = registry.stations;
const idsById = new Map(stations.map((station) => [station.id, station]));

function rng(initialSeed) {
  let value = initialSeed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0xffffffff;
  };
}

function pickRandomPairs(count, seedValue) {
  const next = rng(seedValue);
  const picks = [];
  const seen = new Set();
  while (picks.length < count) {
    const aIndex = Math.floor(next() * stations.length);
    const bIndex = Math.floor(next() * stations.length);
    if (aIndex === bIndex) continue;
    const key = aIndex < bIndex ? `${aIndex}-${bIndex}` : `${bIndex}-${aIndex}`;
    if (seen.has(key)) continue;
    seen.add(key);
    picks.push({
      label: `random/${stations[aIndex].id}-vs-${stations[bIndex].id}`,
      stationAId: stations[aIndex].id,
      stationBId: stations[bIndex].id
    });
  }
  return picks;
}

const walkthroughPairs = [
  ["ksat-svalsat-svalbard", "ksat-tromso"],
  ["ksat-svalsat-svalbard", "ksat-trollsat-antarctica"],
  ["intelsat-fuchsstadt", "intelsat-atlanta"],
  ["singtel-bukit-timah", "measat-cyberjaya"],
  ["cht-yangmingshan", "sansa-hartebeesthoek"]
].map((pair, index) => ({
  label: `walkthrough/${index + 1}/${pair[0]}-vs-${pair[1]}`,
  stationAId: pair[0],
  stationBId: pair[1]
}));

const worstCasePairs = [
  ["ksat-svalsat-svalbard", "sansa-hartebeesthoek"], // max great-circle
  ["intelsat-fuchsstadt", "measat-cyberjaya"], // cross-equator
  ["ksat-tromso", "ksat-svalsat-svalbard"] // dual-LEO-rich at high latitude
].map((pair, index) => ({
  label: `worst-case/${index + 1}/${pair[0]}-vs-${pair[1]}`,
  stationAId: pair[0],
  stationBId: pair[1]
}));

const targetPairs = [
  ...pickRandomPairs(RANDOM_PAIR_COUNT, seed),
  ...walkthroughPairs,
  ...worstCasePairs
];

for (const pair of targetPairs) {
  if (!idsById.has(pair.stationAId) || !idsById.has(pair.stationBId)) {
    console.error(
      `pair references missing station id: ${pair.label}; check registry contents`
    );
    process.exit(3);
  }
}

rmSync(profileDir, { recursive: true, force: true });
const chrome = spawn(
  CHROMIUM_PATH,
  [
    "--headless=new",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--disable-dev-shm-usage",
    "--no-sandbox",
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
if (!page) throw new Error("no page target on cdp");

const ws = new WebSocket(page.webSocketDebuggerUrl);
let messageId = 0;
const pending = new Map();

ws.addEventListener("message", (event) => {
  const data = JSON.parse(event.data.toString());
  if (data.id && pending.has(data.id)) {
    const { resolve, reject } = pending.get(data.id);
    pending.delete(data.id);
    if (data.error) reject(new Error(data.error.message));
    else resolve(data.result);
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
await send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 900,
  deviceScaleFactor: 1,
  mobile: false
});

const results = [];

async function waitForPanelReady(timeoutMs = 5_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { result } = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const panel = document.querySelector('[data-v4-projection-side-panel="true"]');
          return panel ? panel.dataset.state : null;
        })();
      `,
      returnByValue: true
    });
    if (result.value === "ready") {
      return Date.now() - start;
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error("panel did not reach ready within timeout");
}

for (const pair of targetPairs) {
  const startWall = Date.now();
  const url = new URL("http://127.0.0.1:5173/");
  url.searchParams.set("stationA", pair.stationAId);
  url.searchParams.set("stationB", pair.stationBId);
  url.searchParams.set("startUtc", "2026-05-17T00:00:00.000Z");
  url.searchParams.set("durationMinutes", "360");
  await send("Page.navigate", { url: url.href });
  try {
    const readyMs = await waitForPanelReady();
    results.push({
      label: pair.label,
      readyMs,
      passed: readyMs <= COMPUTE_BUDGET_MS
    });
  } catch (error) {
    results.push({
      label: pair.label,
      readyMs: Date.now() - startWall,
      passed: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

const failed = results.filter((entry) => !entry.passed);
const summary = {
  pairsTested: results.length,
  budgetMs: COMPUTE_BUDGET_MS,
  failures: failed.length,
  worstReadyMs: results.reduce(
    (max, entry) => Math.max(max, entry.readyMs),
    0
  ),
  results
};
console.log(JSON.stringify(summary, null, 2));

ws.close();
chrome.kill("SIGTERM");
rmSync(profileDir, { recursive: true, force: true });

process.exit(failed.length === 0 ? 0 : 1);
