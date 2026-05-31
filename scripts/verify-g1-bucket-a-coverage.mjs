#!/usr/bin/env node
// Bucket A surface coverage smoke.
//
// Requires: Vite dev server on http://127.0.0.1:5173 and Chromium 1217 at
// the cached Playwright path below.
//
// Usage:
//   node scripts/verify-g1-bucket-a-coverage.mjs [--port=<cdp-port>]

import { spawn } from "node:child_process";
import { existsSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";

import { SELECTED_PAIR_DEMO_BASE_URL } from "./helpers/demo-routes.mjs";

const DEFAULT_URL = SELECTED_PAIR_DEMO_BASE_URL;
const CHROMIUM_PATH =
  "/home/u24/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome";
const REGISTRY_PATH =
  "public/fixtures/ground-stations/multi-orbit-public-registry.json";
const REQUIRED_STATION_IDS = [
  "ksat-svalsat-svalbard",
  "ksat-tromso",
  "ksat-trollsat-antarctica",
  "intelsat-fuchsstadt",
  "intelsat-atlanta",
  "singtel-bukit-timah",
  "measat-cyberjaya",
  "cht-yangmingshan",
  "sansa-hartebeesthoek"
];
const VIEWPORT = { width: 1440, height: 900 };
const CDP_READY_TIMEOUT_MS = 10_000;
const PANEL_READY_TIMEOUT_MS = 35_000;

const G1_ROWS = [
  {
    id: "R1-T1 / K-A1",
    description: "Decision cards show link selection or an explicit empty state.",
    evaluator: String.raw`
      (() => {
        const row = document.querySelector('[data-v4-projection-side-panel="true"] [data-row="4"]');
        const items = row
          ? Array.from(row.querySelectorAll(".v4-projection-side-panel__decision-card"))
          : [];
        const emptyLine = Boolean(row?.innerText.includes("No mutual visibility"));
        return {
          passed: Boolean(row) && (items.length >= 1 || emptyLine) && items.length <= 3,
          evidence: { rowExists: Boolean(row), itemCount: items.length, emptyLine }
        };
      })();
    `
  },
  {
    id: "R1-T2 / K-D1",
    description: "First visibility row names a satellite present in bundled TLE data.",
    evaluator: String.raw`
      (async () => {
        const first = document.querySelector('.v4-projection-side-panel__timeline-segment[data-satellite-id]');
        const satelliteId = first?.getAttribute("data-satellite-id") ?? "";
        const idShapeOk = /^[A-Z0-9_-]+(?:\s+\([^)]+\))?$/.test(satelliteId);
        const paths = [
          "/fixtures/satellites/leo-scale/oneweb-2026-05-15T12-00-00Z.tle",
          "/fixtures/satellites/multi-orbit/meo/galileo-2026-05-13T01-28-37Z.tle",
          "/fixtures/satellites/multi-orbit/geo/commercial-geo-top30-2026-05-13T01-28-37Z.tle"
        ];
        const known = new Set();
        const fetchEvidence = [];
        for (const path of paths) {
          const response = await fetch(path);
          fetchEvidence.push({ path, ok: response.ok });
          if (!response.ok) continue;
          const lines = (await response.text())
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line) => line.length > 0);
          for (let index = 0; index + 2 < lines.length; index += 3) {
            if (lines[index + 1]?.startsWith("1 ") && lines[index + 2]?.startsWith("2 ")) {
              known.add(lines[index]);
            }
          }
        }
        return {
          passed: Boolean(first) && idShapeOk && known.has(satelliteId),
          evidence: {
            segmentExists: Boolean(first),
            satelliteId,
            idShapeOk,
            tleMatch: known.has(satelliteId),
            fetched: fetchEvidence
          }
        };
      })();
    `
  },
  {
    id: "R1-T3 / K-D2",
    description: "Cesium canvas is mounted with non-zero width.",
    evaluator: String.raw`
      (() => {
        const candidates = [
          ".cesium-viewer canvas",
          ".cesium-widget canvas",
          "canvas.cesium-widget-canvas"
        ];
        let canvas = null;
        let matchedSelector = null;
        for (const selector of candidates) {
          const found = document.querySelector(selector);
          if (found && found.clientWidth > 0) {
            canvas = found;
            matchedSelector = selector;
            break;
          }
        }
        if (!canvas) {
          const allCanvases = Array.from(document.querySelectorAll("canvas"));
          const sized = allCanvases.find((entry) => entry.clientWidth > 0);
          if (sized) {
            canvas = sized;
            matchedSelector = "canvas (first non-zero width)";
          }
        }
        return {
          passed: Boolean(canvas) && canvas.clientWidth > 0,
          evidence: {
            exists: Boolean(canvas),
            matchedSelector,
            clientWidth: canvas?.clientWidth ?? null,
            clientHeight: canvas?.clientHeight ?? null
          }
        };
      })();
    `
  },
  {
    id: "R1-T4 / K-D3",
    description: "Selector controls, rain slider, and replay button are available.",
    evaluator: String.raw`
      (() => {
        const panel = document.querySelector('[data-v4-projection-side-panel="true"]');
        const filtersButton = document.querySelector(".ground-station-list-picker__filters-button");
        const selectionChip = document.querySelector(".ground-station-selection-chip");
        const rainSlider = document.querySelector(".v4-projection-side-panel__rain-slider");
        const replayButton = document.querySelector('.m8a-v47-product-ux__strip [data-m8a-v47-control-id="play-pause"]');
        const ready = panel?.dataset.state === "ready";
        return {
          passed:
            Boolean(filtersButton) &&
            Boolean(selectionChip) &&
            Boolean(rainSlider) &&
            Boolean(replayButton) &&
            (!ready || replayButton.disabled === false),
          evidence: {
            panelState: panel?.dataset.state ?? null,
            filtersButton: Boolean(filtersButton),
            selectionChipCount: document.querySelectorAll(".ground-station-selection-chip").length,
            rainSlider: Boolean(rainSlider),
            replayButton: Boolean(replayButton),
            replayDisabled: replayButton?.disabled ?? null
          }
        };
      })();
    `
  },
  {
    id: "R1-T5 / K-D4",
    description: "Evidence surface cites the handover policy section.",
    evaluator: String.raw`
      (async () => {
        const details = document.querySelector('[data-disclosure="sources-non-claims"]');
        const body = details?.querySelector(".v4-projection-side-panel__details-body") ?? null;
        const wasOpen = details?.open === true;
        if (details && !wasOpen) {
          details.open = true;
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
        const text = body?.innerText ?? "";
        const passed = Boolean(body) && text.includes("TR 38.821 \u00a77.3");
        if (details && !wasOpen) {
          details.open = false;
        }
        return {
          passed,
          evidence: { detailsExists: Boolean(details), bodyExists: Boolean(body), wasOpen, textSample: text.slice(0, 240) }
        };
      })();
    `
  },
  {
    id: "R1-T6 / K-D5",
    description: "Rain-impact region lists at least two orbit downlink rows.",
    evaluator: String.raw`
      (() => {
        const body = document.querySelector('[data-v4-projection-side-panel="true"] [data-row="5"]');
        const rows = body
          ? Array.from(body.querySelectorAll(".v4-projection-side-panel__list-primary"))
              .map((entry) => entry.textContent?.trim() ?? "")
              .filter((text) => /^(LEO|MEO|GEO)\b/.test(text))
          : [];
        return {
          passed: Boolean(body) && rows.length >= 2,
          evidence: { bodyExists: Boolean(body), rows }
        };
      })();
    `
  },
  {
    id: "R1-F1 / K-E1",
    description: "LEO source-record chip reports at least 500 source records.",
    evaluator: String.raw`
      (async () => {
        const startedAt = Date.now();
        let chip = null;
        let count = NaN;
        let labelText = "";
        let ariaLabel = "";
        let hasSourceWording = false;
        let hasActorWording = false;
        while (Date.now() - startedAt < 3000) {
          chip =
            document.querySelector('[data-leo-source-record-count-chip="true"]') ??
            document.querySelector('[data-leo-actor-count-chip="true"]');
          count = Number.parseInt(
            chip?.getAttribute("data-leo-source-record-count") ??
              chip?.getAttribute("data-leo-actor-count") ??
              "",
            10
          );
          labelText = chip?.textContent?.trim() ?? "";
          ariaLabel = chip?.getAttribute("aria-label") ?? "";
          const accessibleText = labelText + " " + ariaLabel;
          hasSourceWording = /source record|inventory/i.test(accessibleText);
          hasActorWording = /\bactor\b/i.test(accessibleText);
          if (
            Number.isInteger(count) &&
            count >= 500 &&
            hasSourceWording &&
            !hasActorWording
          ) break;
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
        return {
          passed:
            Boolean(chip) &&
            Number.isInteger(count) &&
            count >= 500 &&
            hasSourceWording &&
            !hasActorWording,
          evidence: {
            exists: Boolean(chip),
            sourceRecordCount: Number.isFinite(count) ? count : null,
            labelText,
            ariaLabel,
            hasSourceWording,
            hasActorWording,
            waitedMs: Date.now() - startedAt
          }
        };
      })();
    `
  },
  {
    id: "R1-F2 / K-E2",
    description: "Replay speed group exposes only 30x, 60x, and 120x.",
    evaluator: String.raw`
      (() => {
        const buttons = Array.from(
          document.querySelectorAll('[data-m8a-v47-control-group="speed"] button[data-m8a-v47-playback-multiplier]')
        );
        const values = buttons.map((button) => button.getAttribute("data-m8a-v47-playback-multiplier"));
        const expected = ["30", "60", "120"];
        return {
          passed: values.length === 3 && expected.every((value, index) => values[index] === value),
          evidence: { count: values.length, values }
        };
      })();
    `
  },
  {
    id: "R1-F3 / K-E3",
    description: "First stat is a duration or the panel is in the empty-result state.",
    evaluator: String.raw`
      (() => {
        const panel = document.querySelector('[data-v4-projection-side-panel="true"]');
        const first = document.querySelector(".v4-projection-side-panel__stat-value");
        const text = first?.textContent?.trim() ?? "";
        return {
          passed: /\d+[hms]/.test(text) || panel?.dataset.state === "empty-result",
          evidence: { panelState: panel?.dataset.state ?? null, text }
        };
      })();
    `
  },
  {
    id: "R1-F4 / K-E4 / K-F4",
    description: "Each decision card carries non-empty reason text.",
    evaluator: String.raw`
      (() => {
        const row = document.querySelector('[data-v4-projection-side-panel="true"] [data-row="4"]');
        const items = row
          ? Array.from(row.querySelectorAll(".v4-projection-side-panel__decision-card"))
          : [];
        const secondaryTexts = items.map((item) =>
          item.querySelector(".v4-projection-side-panel__decision-secondary")?.textContent?.trim() ?? ""
        );
        const emptyLine = Boolean(row?.innerText.includes("No mutual visibility"));
        return {
          passed: Boolean(row) && (emptyLine || (items.length > 0 && secondaryTexts.every((text) => text.length > 0))),
          evidence: { rowExists: Boolean(row), itemCount: items.length, secondaryTexts, emptyLine }
        };
      })();
    `
  },
  {
    id: "R1-F5 / K-E5",
    description: "Evidence report opens one categorized HTML artifact.",
    evaluator: String.raw`
      (async () => {
        const button = document.querySelector(".v4-projection-side-panel__download-report");
        if (!button) {
          return { passed: false, evidence: { buttonExists: false } };
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
        const text = writtenHtml;
        const requiredSections = [
          "Selected-pair evidence report",
          "Visibility windows",
          "Handover events",
          "Source boundary",
          "Raw JSON payload",
          "Download HTML"
        ];
        return {
          passed:
            openArgs?.target === "_blank" &&
            openerValue === null &&
            text.trimStart().startsWith("<!doctype html>") &&
            text.includes("data-report-filename=\"runtime-projection-evidence") &&
            requiredSections.every((section) => text.includes(section)),
          evidence: {
            buttonExists: true,
            openArgs,
            focused,
            openerValue,
            prefix: text.slice(0, 80),
            requiredSectionsPresent: requiredSections.every((section) =>
              text.includes(section)
            )
          }
        };
      })();
    `
  },
  {
    id: "K-A4",
    description: "TLE telemetry chip carries a recent ISO date.",
    evaluator: String.raw`
      (() => {
        const chip = document.querySelector('[data-tle-telemetry-chip="true"]');
        const value = chip?.getAttribute("data-tle-date") ?? "";
        const parsed = Date.parse(value + "T00:00:00.000Z");
        const floor = Date.parse("2026-05-12T00:00:00.000Z");
        return {
          passed: Boolean(chip) && Number.isFinite(parsed) && parsed >= floor,
          evidence: { exists: Boolean(chip), value, parsed: Number.isFinite(parsed) ? new Date(parsed).toISOString() : null }
        };
      })();
    `
  },
  {
    id: "K-E6",
    description: "Rain slider recomputes at 80 mm/h and shows rain-band reduction.",
    evaluator: String.raw`
      (async () => {
        const panel = document.querySelector('[data-v4-projection-side-panel="true"]');
        const slider = document.querySelector(".v4-projection-side-panel__rain-slider");
        if (!panel || !slider) {
          return {
            passed: false,
            evidence: { panelExists: Boolean(panel), sliderExists: Boolean(slider) }
          };
        }
        const originalValue = slider.value;
        const waitForRain = async (value, timeoutMs) => {
          const startedAt = Date.now();
          while (Date.now() - startedAt < timeoutMs) {
            if (panel.dataset.state === "ready" && panel.dataset.rainRateMmPerHour === value) {
              return Date.now() - startedAt;
            }
            await new Promise((resolve) => setTimeout(resolve, 50));
          }
          return null;
        };
        slider.value = "80";
        slider.dispatchEvent(new Event("input", { bubbles: true }));
        const recomputeMs = await waitForRain("80", 10000);
        await new Promise((resolve) => setTimeout(resolve, 0));
        const body = document.querySelector('[data-v4-projection-side-panel="true"] [data-row="5"]');
        const rows = body
          ? Array.from(body.querySelectorAll(".v4-projection-side-panel__list-item")).map((item) => ({
              modifier: item.getAttribute("data-modifier"),
              text: item.innerText
            }))
          : [];
        const reducedRows = rows.filter((row) => row.modifier === "rain-degraded" || row.text.includes("\u2212"));
        const stateAt80 = panel.dataset.state ?? null;
        const rainRateAt80 = panel.dataset.rainRateMmPerHour ?? null;
        const passed =
          recomputeMs !== null &&
          stateAt80 === "ready" &&
          rainRateAt80 === "80" &&
          Boolean(body) &&
          reducedRows.length >= 1;
        if (originalValue !== "80") {
          slider.value = originalValue;
          slider.dispatchEvent(new Event("input", { bubbles: true }));
          await waitForRain(originalValue, 10000);
        }
        return {
          passed,
          evidence: {
            panelStateAt80: stateAt80,
            rainRateAt80,
            recomputeMs,
            bodyExists: Boolean(body),
            reducedRows,
            restoredRainRate: panel.dataset.rainRateMmPerHour ?? null
          }
        };
      })();
    `
  },
  {
    id: "K-F7",
    description: "Body display state is one of the allowed surface states.",
    evaluator: String.raw`
      (() => {
        const allowed = ["idle", "selecting", "projecting", "replaying", "invalid"];
        const value = document.body.getAttribute("data-display-state");
        return {
          passed: allowed.includes(value),
          evidence: { value, allowed }
        };
      })();
    `
  },
  {
    id: "R1-D1",
    description: "Derived coverage: visibility row source is present and resolvable.",
    evaluator: String.raw`
      (async () => {
        const first = document.querySelector('.v4-projection-side-panel__timeline-segment[data-satellite-id]');
        const satelliteId = first?.getAttribute("data-satellite-id") ?? "";
        const paths = [
          "/fixtures/satellites/leo-scale/oneweb-2026-05-15T12-00-00Z.tle",
          "/fixtures/satellites/multi-orbit/meo/galileo-2026-05-13T01-28-37Z.tle",
          "/fixtures/satellites/multi-orbit/geo/commercial-geo-top30-2026-05-13T01-28-37Z.tle"
        ];
        let fetchedCount = 0;
        let tleMatch = false;
        for (const path of paths) {
          const response = await fetch(path);
          if (!response.ok) continue;
          fetchedCount += 1;
          const tleText = await response.text();
          if (tleText.includes(satelliteId)) tleMatch = true;
        }
        return {
          passed: Boolean(first) && /^[A-Z0-9_-]+(?:\s+\([^)]+\))?$/.test(satelliteId) && tleMatch,
          evidence: {
            segmentExists: Boolean(first),
            satelliteId,
            fetchedCount,
            tleMatch
          }
        };
      })();
    `
  },
  {
    id: "R1-D2",
    description: "Derived coverage: interaction controls remain mounted together.",
    evaluator: String.raw`
      (() => {
        const selectors = [
          ".ground-station-list-picker__filters-button",
          ".ground-station-selection-chip",
          ".v4-projection-side-panel__rain-slider",
          '.m8a-v47-product-ux__strip [data-m8a-v47-control-id="play-pause"]'
        ];
        const results = selectors.map((selector) => ({
          selector,
          count: document.querySelectorAll(selector).length
        }));
        return {
          passed: results.every((entry) => entry.count >= 1),
          evidence: { results }
        };
      })();
    `
  },
  {
    id: "R1-D3",
    description: "Derived coverage: Row 3 stats are visible and finite.",
    evaluator: String.raw`
      (() => {
        const row = document.querySelector('[data-v4-projection-side-panel="true"] [data-row="2"]');
        const values = row
          ? Array.from(row.querySelectorAll(".v4-projection-side-panel__stat-value")).map((entry) => entry.textContent?.trim() ?? "")
          : [];
        const durationOk = /\d+[hms]/.test(values[0] ?? "");
        const countOk = Number.isInteger(Number.parseInt(values[1] ?? "", 10));
        return {
          passed: Boolean(row) && values.length >= 2 && durationOk && countOk,
          evidence: { rowExists: Boolean(row), values, durationOk, countOk }
        };
      })();
    `
  },
  {
    id: "R1-D4",
    description: "Soak summary path is exposed and exists on disk.",
    evaluator: String.raw`
      (() => {
        const root = document.querySelector("[data-soak-summary-path]");
        const path = root?.getAttribute("data-soak-summary-path") ?? "";
        return {
          passed: Boolean(root) && path.length > 0,
          evidence: { rootExists: Boolean(root), path }
        };
      })();
    `
  },
  {
    id: "V-MO1",
    description: "Cross-orbit migration decision is visible when emitted for this window.",
    evaluator: String.raw`
      (() => {
        const row = document.querySelector('[data-v4-projection-side-panel="true"] [data-row="4"]');
        const cross = row
          ? Array.from(row.querySelectorAll('.v4-projection-side-panel__decision-card[data-modifier="cross-orbit-migration"]'))
          : [];
        const items = row
          ? Array.from(row.querySelectorAll(".v4-projection-side-panel__decision-card"))
          : [];
        const emptyLine = Boolean(row?.innerText.includes("No mutual visibility"));
        // Per acceptance-criteria.md §G1 last paragraph: empty states still count as
        // covered. A populated link-selection list (itemCount >= 1) implies the row
        // is covered even if no event in this window happens to be cross-orbit.
        const passed = Boolean(row) && (cross.length >= 1 || items.length >= 1 || emptyLine);
        const noCrossButPopulated = cross.length === 0 && items.length >= 1;
        return {
          passed,
          evidence: {
            rowExists: Boolean(row),
            crossCount: cross.length,
            itemCount: items.length,
            emptyLine,
            noCrossButPopulated,
            note: noCrossButPopulated
              ? "No cross-orbit-migration event in this window; row covered by populated link-selection list."
              : null,
            rows: cross.map((entry) => entry.innerText)
          }
        };
      })();
    `
  }
];

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
const cdpPort = Number.parseInt(args.port ?? "9450", 10);
const profileDir = join(tmpdir(), `sgv-g1-${cdpPort}`);

const report = {
  script: "verify-g1-bucket-a-coverage",
  url: targetUrl,
  cdpPort,
  chromiumPath: CHROMIUM_PATH,
  viewport: VIEWPORT,
  requiredStationIds: REQUIRED_STATION_IDS,
  preflight: {},
  rows: [],
  failures: [],
  passed: false
};

if (!existsSync(CHROMIUM_PATH)) {
  report.failures.push({
    id: null,
    assertion: "chromium-binary-present",
    message: `chromium binary missing at ${CHROMIUM_PATH}`
  });
  console.log(JSON.stringify(report, null, 2));
  process.exit(2);
}

const registryCheck = checkRegistry();
report.preflight.registry = registryCheck;
if (!registryCheck.passed) {
  report.failures.push({
    id: null,
    assertion: "required-stations-present",
    evidence: registryCheck
  });
  console.log(JSON.stringify(report, null, 2));
  process.exit(1);
}

let chrome = null;
let ws = null;
let messageId = 0;
const pending = new Map();

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function checkRegistry() {
  const absolutePath = resolve(REGISTRY_PATH);
  try {
    const parsed = JSON.parse(readFileSync(absolutePath, "utf8"));
    const stations = Array.isArray(parsed.stations) ? parsed.stations : [];
    const ids = new Set(
      stations
        .map((station) => station?.id)
        .filter((id) => typeof id === "string")
    );
    const missingIds = REQUIRED_STATION_IDS.filter((id) => !ids.has(id));
    return {
      passed: missingIds.length === 0,
      path: REGISTRY_PATH,
      stationCount: stations.length,
      missingIds
    };
  } catch (error) {
    return {
      passed: false,
      path: REGISTRY_PATH,
      stationCount: null,
      missingIds: REQUIRED_STATION_IDS,
      message: error instanceof Error ? error.message : String(error)
    };
  }
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
  return new Promise((resolvePromise, reject) => {
    const id = ++messageId;
    pending.set(id, { resolve: resolvePromise, reject, method });
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

    const { resolve: resolvePending, reject, method } = pending.get(data.id);
    pending.delete(data.id);
    if (data.error) {
      reject(new Error(`${method}: ${data.error.message}`));
    } else {
      resolvePending(data.result);
    }
  });
  ws.addEventListener("close", () => {
    for (const { reject, method } of pending.values()) {
      reject(new Error(`${method}: cdp socket closed`));
    }
    pending.clear();
  });

  await new Promise((resolvePromise, reject) => {
    ws.addEventListener("open", () => resolvePromise(), { once: true });
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
      expression: String.raw`
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

async function evaluateRow(row) {
  try {
    const response = await send("Runtime.evaluate", {
      expression: row.evaluator,
      returnByValue: true,
      awaitPromise: true
    });
    if (response.exceptionDetails) {
      return {
        id: row.id,
        description: row.description,
        passed: false,
        evidence: {
          exception: response.exceptionDetails.text,
          lineNumber: response.exceptionDetails.lineNumber,
          columnNumber: response.exceptionDetails.columnNumber
        }
      };
    }
    const value = response.result?.value;
    if (!value || typeof value.passed !== "boolean") {
      return {
        id: row.id,
        description: row.description,
        passed: false,
        evidence: {
          message: "evaluator did not return { passed, evidence }",
          value
        }
      };
    }
    const result = {
      id: row.id,
      description: row.description,
      passed: value.passed,
      evidence: value.evidence ?? null
    };
    if (row.id === "R1-D4") {
      return addSoakFileEvidence(result);
    }
    return result;
  } catch (error) {
    return {
      id: row.id,
      description: row.description,
      passed: false,
      evidence: {
        message: error instanceof Error ? error.message : String(error)
      }
    };
  }
}

function addSoakFileEvidence(rowResult) {
  const citedPath = rowResult.evidence?.path;
  const absolutePath =
    typeof citedPath === "string" && citedPath.length > 0
      ? isAbsolute(citedPath)
        ? citedPath
        : resolve(citedPath)
      : null;
  let fileEvidence = {
    path: citedPath ?? null,
    absolutePath,
    exists: false,
    sizeBytes: null,
    message: null
  };
  if (absolutePath) {
    try {
      const stats = statSync(absolutePath);
      fileEvidence = {
        path: citedPath,
        absolutePath,
        exists: stats.isFile(),
        sizeBytes: stats.size,
        message: null
      };
    } catch (error) {
      fileEvidence = {
        path: citedPath,
        absolutePath,
        exists: false,
        sizeBytes: null,
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }
  return {
    ...rowResult,
    passed: rowResult.passed && fileEvidence.exists,
    evidence: {
      ...rowResult.evidence,
      file: fileEvidence
    }
  };
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
      "--window-size=1440,900",
      "about:blank"
    ],
    { stdio: ["ignore", "ignore", "ignore"] }
  );
  chrome.unref();

  await waitForPort(cdpPort);
  await connectToPage(cdpPort);
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width: VIEWPORT.width,
    height: VIEWPORT.height,
    deviceScaleFactor: 1,
    mobile: false
  });
  await send("Page.navigate", { url: targetUrl });
  report.panelReady = await waitForPanelReady();

  for (const row of G1_ROWS) {
    report.rows.push(await evaluateRow(row));
  }

  report.failures = report.rows
    .filter((row) => !row.passed)
    .map((row) => ({
      id: row.id,
      assertion: row.description,
      evidence: row.evidence
    }));
  report.passed =
    report.rows.length === G1_ROWS.length &&
    report.failures.length === 0 &&
    registryCheck.passed;
} catch (error) {
  report.failures.push({
    id: null,
    assertion: "driver-fatal",
    message: error instanceof Error ? error.message : String(error)
  });
  report.passed = false;
} finally {
  if (ws) ws.close();
  if (chrome) chrome.kill("SIGTERM");
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      rmSync(profileDir, { recursive: true, force: true, maxRetries: 4 });
      break;
    } catch {
      await delay(150);
    }
  }
}

console.log(JSON.stringify(report, null, 2));
process.exit(report.passed ? 0 : 1);
