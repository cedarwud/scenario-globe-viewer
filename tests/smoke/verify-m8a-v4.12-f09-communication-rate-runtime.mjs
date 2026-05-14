import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  captureScreenshot,
  ensureOutputRoot,
  evaluateRuntimeValue,
  setViewport,
  sleep,
  withStaticSmokeBrowser,
  writeJsonArtifact
} from "./helpers/m8a-v4-browser-capture-harness.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const distRoot = path.join(repoRoot, "dist");
const outputRoot = path.join(
  repoRoot,
  "output/m8a-v4.12-f09-communication-rate"
);

const VIEWPORT = {
  name: "desktop-1440x900",
  width: 1440,
  height: 900
};

const FORBIDDEN_CLAIMS = [
  "measured throughput",
  "live iperf",
  "live ping",
  "iperf result",
  "ping-verified",
  "active gateway",
  "active satellite",
  "native RF handover",
  "ESTNeT throughput",
  "INET speed",
  ">=500 LEO",
  "full customer acceptance"
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function normalizeText(value) {
  return String(value ?? "").toLowerCase();
}

function assertForbiddenClaimsAbsent(label, text) {
  const normalized = normalizeText(text);
  const match = FORBIDDEN_CLAIMS.find((claim) =>
    normalized.includes(claim.toLowerCase())
  );

  assert(!match, `${label} contains forbidden F-09 claim: ${match}`);
}

function assertNoNumericRateData(label, text) {
  assert(
    !/\b\d+(?:\.\d+)?\s*(?:m|g)?bps\b/i.test(String(text ?? "")),
    `${label} must not display numeric Mbps/Gbps data.`
  );
}

function assertScreenshot(absolutePath) {
  const stat = statSync(absolutePath);
  assert(stat.size > 10_000, `Screenshot is unexpectedly small: ${absolutePath}`);
}

function readCurrentAssetPaths() {
  const html = readFileSync(path.join(distRoot, "index.html"), "utf8");
  const matches = Array.from(
    html.matchAll(/(?:src|href)="([^"]*assets\/[^"]+\.(?:js|css))"/g)
  );
  const paths = matches.map((match) =>
    path.join(distRoot, match[1].replace(/^\//, ""))
  );

  assert(paths.length > 0, "No current production asset paths found in dist/index.html.");
  return paths;
}

function scanCompiledCommunicationRateBytes() {
  const anchors = [
    "communication-rate-section",
    "data-communication-rate-section",
    "Communication Rate",
    "Modeled network-speed class"
  ];
  const scanned = [];

  for (const assetPath of readCurrentAssetPaths()) {
    const content = readFileSync(assetPath, "utf8");

    for (const anchor of anchors) {
      const index = content.indexOf(anchor);

      if (index === -1) {
        continue;
      }

      const start = Math.max(0, index - 20_000);
      const end = Math.min(content.length, index + 20_000);
      const slice = content.slice(start, end);
      assertForbiddenClaimsAbsent(`compiled F-09 asset slice ${path.basename(assetPath)}`, slice);
      assertNoNumericRateData(`compiled F-09 asset slice ${path.basename(assetPath)}`, slice);
      scanned.push(`${path.basename(assetPath)}:${anchor}`);
    }
  }

  assert(scanned.length > 0, "No compiled communication-rate byte slices were scanned.");
  return scanned;
}

async function installConsoleErrorCapture(client) {
  await client.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `
      (() => {
        const errors = [];
        Object.defineProperty(window, "__F09_CONSOLE_ERRORS__", {
          value: errors,
          configurable: false
        });
        const originalError = console.error;
        console.error = (...args) => {
          errors.push(args.map((entry) => String(entry)).join(" "));
          return originalError.apply(console, args);
        };
        window.addEventListener("error", (event) => {
          errors.push(String(event.message || event.error || "window error"));
        });
        window.addEventListener("unhandledrejection", (event) => {
          errors.push(String(event.reason || "unhandled rejection"));
        });
      })();
    `
  });
}

async function waitForCommunicationRateReady(client) {
  let lastState = null;

  for (let attempt = 0; attempt < 240; attempt += 1) {
    lastState = await evaluateRuntimeValue(
      client,
      `(() => {
        const section = document.querySelector("[data-communication-rate-section='bootstrap']");
        const panel = document.querySelector("[data-communication-panel='bootstrap']");

        return {
          bootstrapState: document.documentElement?.dataset.bootstrapState ?? null,
          bootstrapDetail: document.documentElement?.dataset.bootstrapDetail ?? null,
          scenePreset: document.documentElement?.dataset.scenePreset ?? null,
          sectionPresent: section instanceof HTMLElement,
          mountedInCommunicationPanel: Boolean(section && panel?.contains(section)),
          pointCount: Number(section?.dataset.communicationRatePointCount ?? 0),
          currentClass: section?.dataset.communicationRateCurrentClass ?? null,
          source: section?.dataset.communicationRateSource ?? null
        };
      })()`
    );

    if (
      lastState?.bootstrapState === "ready" &&
      lastState?.scenePreset === "global" &&
      lastState?.sectionPresent &&
      lastState?.mountedInCommunicationPanel &&
      lastState?.pointCount >= 3
    ) {
      return lastState;
    }

    if (lastState?.bootstrapState === "error") {
      throw new Error(
        `F-09 communication-rate route hit bootstrap error: ${JSON.stringify(lastState)}`
      );
    }

    await sleep(100);
  }

  throw new Error(
    `F-09 communication-rate section did not become ready: ${JSON.stringify(lastState)}`
  );
}

async function waitForV411GroundStationReady(client) {
  let lastState = null;

  for (let attempt = 0; attempt < 240; attempt += 1) {
    lastState = await evaluateRuntimeValue(
      client,
      `(() => {
        const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
        return {
          bootstrapState: document.documentElement?.dataset.bootstrapState ?? null,
          scenePreset: document.documentElement?.dataset.scenePreset ?? null,
          hasV411Scene: Boolean(capture?.m8aV4GroundStationScene?.getState?.()),
          communicationRateMounted: Boolean(
            document.querySelector("[data-communication-rate-section='bootstrap']")
          )
        };
      })()`
    );

    if (
      lastState?.bootstrapState === "ready" &&
      lastState?.scenePreset === "regional" &&
      lastState?.hasV411Scene
    ) {
      return lastState;
    }

    await sleep(100);
  }

  throw new Error(`V4.11 route did not become ready: ${JSON.stringify(lastState)}`);
}

async function populateBoundedWindowsAndInspect(client) {
  return await evaluateRuntimeValue(
    client,
    `(async () => {
      const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      const section = document.querySelector("[data-communication-rate-section='bootstrap']");
      const chart = document.querySelector("[data-communication-rate-chart='class-trend']");
      const tableToggle = document.querySelector("[data-communication-rate-table-toggle='true']");

      if (!capture?.replayClock || !capture?.scenarioSession || !capture?.handoverDecision) {
        throw new Error("Missing Phase 6 capture seams for F-09 smoke.");
      }

      if (!(section instanceof HTMLElement) || !(chart instanceof HTMLElement)) {
        throw new Error("Missing F-09 communication-rate DOM.");
      }

      const replayState = capture.replayClock.getState();
      const startMs = Date.parse(replayState.startTime);
      const stopMs = Date.parse(replayState.stopTime);

      capture.replayClock.pause();

      for (const ratio of [0.18, 0.5, 0.86]) {
        const targetMs = startMs + (stopMs - startMs) * ratio;
        capture.replayClock.seek(new Date(targetMs).toISOString());
        await sleep(220);
      }

      const beforeScenarioState = JSON.stringify(capture.scenarioSession.getState());
      const beforeDecisionState = JSON.stringify(capture.handoverDecision.getState());

      chart.focus();

      if (!(tableToggle instanceof HTMLButtonElement)) {
        throw new Error("Missing F-09 table fallback toggle.");
      }

      tableToggle.click();
      await sleep(120);

      const tableRegion = document.querySelector("[data-communication-rate-table-region='true']");
      const rows = Array.from(
        document.querySelectorAll("[data-communication-rate-table-row='true']")
      );
      const series = Array.from(
        document.querySelectorAll("[data-communication-rate-series]")
      ).map((element) => ({
        orbit: element.getAttribute("data-communication-rate-series"),
        style: element.getAttribute("data-communication-rate-line-style"),
        markerCount: element.querySelectorAll("[data-communication-rate-marker-orbit]").length
      }));
      const rowSummaries = rows.map((row) => ({
        orbit: row.getAttribute("data-communication-rate-row-orbit"),
        classId: row.getAttribute("data-communication-rate-row-class"),
        text: row.textContent || ""
      }));
      const afterScenarioState = JSON.stringify(capture.scenarioSession.getState());
      const afterDecisionState = JSON.stringify(capture.handoverDecision.getState());

      return {
        sectionText: section.textContent || "",
        sectionInnerText: section.innerText || "",
        outerHtml: section.outerHTML,
        rootDataset: { ...section.dataset },
        parentPanelMounted: Boolean(
          document
            .querySelector("[data-communication-panel='bootstrap']")
            ?.contains(section)
        ),
        chartTabIndex: chart.getAttribute("tabindex"),
        chartLabelledBy: chart.getAttribute("aria-labelledby"),
        chartDescribedBy: chart.getAttribute("aria-describedby"),
        chartDescription:
          document.getElementById(chart.getAttribute("aria-describedby") || "")?.textContent ||
          "",
        documentTelemetry: {
          scenarioId: document.documentElement?.dataset.communicationRateScenarioId || null,
          currentClass:
            document.documentElement?.dataset.communicationRateCurrentClass || null,
          source: document.documentElement?.dataset.communicationRateSource || null,
          truthState:
            document.documentElement?.dataset.communicationRateTruthState || null,
          numericDisplay:
            document.documentElement?.dataset.communicationRateNumericDisplayAllowed || null,
          pointCount: document.documentElement?.dataset.communicationRatePointCount || null
        },
        currentClassText:
          document.querySelector("[data-communication-rate-field='current-class']")
            ?.textContent || "",
        sourceText:
          document.querySelector("[data-communication-rate-field='source']")?.textContent ||
          "",
        footnoteText:
          document.querySelector("[data-communication-rate-field='footnote']")
            ?.textContent || "",
        classKeyText:
          document.querySelector("[data-communication-rate-class-key='true']")
            ?.textContent || "",
        tableExpanded: tableToggle.getAttribute("aria-expanded"),
        tableHidden: tableRegion instanceof HTMLElement ? tableRegion.hidden : null,
        tableHeaders: Array.from(
          document.querySelectorAll("[data-communication-rate-table='true'] th")
        ).map((header) => header.textContent?.trim() || ""),
        rowCount: rows.length,
        rowSummaries,
        series,
        svgPresent: Boolean(document.querySelector("[data-communication-rate-svg='true']")),
        beforeScenarioState,
        afterScenarioState,
        beforeDecisionState,
        afterDecisionState,
        consoleErrors: window.__F09_CONSOLE_ERRORS__ || []
      };
    })()`,
    { awaitPromise: true }
  );
}

async function inspectReducedMotion(client) {
  await client.send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }]
  });

  return await evaluateRuntimeValue(
    client,
    `(async () => {
      const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      const replayState = capture.replayClock.getState();
      const startMs = Date.parse(replayState.startTime);
      const stopMs = Date.parse(replayState.stopTime);
      capture.replayClock.seek(new Date(startMs + (stopMs - startMs) * 0.5).toISOString());
      await sleep(220);

      const section = document.querySelector("[data-communication-rate-section='bootstrap']");
      const line = document.querySelector(".communication-rate-chart__line");
      const style = line ? getComputedStyle(line) : null;

      return {
        motionDataset:
          section instanceof HTMLElement ? section.dataset.communicationRateMotion : null,
        animationName: style?.animationName ?? null,
        animationDuration: style?.animationDuration ?? null,
        consoleErrors: window.__F09_CONSOLE_ERRORS__ || []
      };
    })()`,
    { awaitPromise: true }
  );
}

async function collapseFallbackTable(client) {
  await evaluateRuntimeValue(
    client,
    `(() => {
      const tableToggle = document.querySelector("[data-communication-rate-table-toggle='true']");
      if (
        tableToggle instanceof HTMLButtonElement &&
        tableToggle.getAttribute("aria-expanded") === "true"
      ) {
        tableToggle.click();
      }
    })()`
  );
}

function assertPhase6Inspection(inspection) {
  assert(inspection.parentPanelMounted, "F-09 section must mount inside Communication Time panel.");
  assert(inspection.svgPresent, "F-09 must render an SVG class trend chart.");
  assert(
    inspection.rootDataset.communicationRateCurrentClass ===
      "candidate-capacity-context-class",
    "F-09 current class dataset must expose the modeled class id."
  );
  assert(
    inspection.currentClassText === "Candidate capacity context",
    "F-09 current class label must be visible."
  );
  assert(
    inspection.sourceText === "Physical-input bounded proxy",
    "F-09 provenance label must be visible."
  );
  assert(
    inspection.footnoteText === "Modeled, not measured.",
    "F-09 footnote must keep the modeled boundary visible."
  );
  assert(
    /Candidate capacity context/.test(inspection.classKeyText) &&
      /Continuity context/.test(inspection.classKeyText) &&
      /Guard context/.test(inspection.classKeyText),
    "F-09 must expose all locked class labels."
  );
  assert(
    inspection.chartTabIndex === "0" &&
      inspection.chartLabelledBy === "communication-rate-heading" &&
      inspection.chartDescribedBy === "communication-rate-description",
    "F-09 chart must be keyboard-focusable and ARIA-labelled/described."
  );
  assert(
    /Modeled, not measured\./.test(inspection.chartDescription) &&
      /Physical-input bounded proxy/.test(inspection.chartDescription),
    "F-09 chart description must include provenance and modeled boundary copy."
  );
  assert(
    inspection.tableExpanded === "true" && inspection.tableHidden === false,
    "F-09 table fallback must be reachable through a visible toggle."
  );
  assert(
    JSON.stringify(inspection.tableHeaders) ===
      JSON.stringify([
        "Window",
        "Orbit class",
        "Candidate context",
        "Modeled network-speed class",
        "Provenance",
        "Note"
      ]),
    "F-09 fallback table columns must match the Phase 1 spec."
  );
  assert(inspection.rowCount >= 8, "F-09 observed-window fallback table should retain class rows.");
  assert(
    inspection.rowSummaries.some((row) => row.orbit === "leo") &&
      inspection.rowSummaries.some((row) => row.orbit === "meo") &&
      inspection.rowSummaries.some((row) => row.orbit === "geo"),
    "F-09 table fallback must include LEO, MEO, and GEO class rows."
  );
  assert(
    inspection.series.length === 3 &&
      inspection.series.some((entry) => /solid line with circle markers/.test(entry.style)) &&
      inspection.series.some((entry) => /dashed line with square markers/.test(entry.style)) &&
      inspection.series.some((entry) => /dotted line with diamond markers/.test(entry.style)),
    "F-09 chart must differentiate series by line style, marker shape, and text."
  );
  assert(
    inspection.series.every((entry) => entry.markerCount > 0),
    "Each F-09 orbit series must expose visible markers."
  );
  assert(
    inspection.documentTelemetry.source === "Physical-input bounded proxy" &&
      inspection.documentTelemetry.truthState === "modeled-bounded-class-not-measured" &&
      inspection.documentTelemetry.numericDisplay === "false",
    "F-09 telemetry must preserve bounded source and numeric-display prohibition."
  );
  assert(
    inspection.beforeScenarioState === inspection.afterScenarioState,
    "Opening/focusing F-09 must not mutate scenario state."
  );
  assert(
    inspection.beforeDecisionState === inspection.afterDecisionState,
    "Opening/focusing F-09 must not mutate decision state."
  );
  assert(
    Array.isArray(inspection.consoleErrors) && inspection.consoleErrors.length === 0,
    `F-09 Phase 6 flow must not emit console errors: ${JSON.stringify(
      inspection.consoleErrors
    )}`
  );
  assertForbiddenClaimsAbsent("F-09 DOM text", inspection.sectionText);
  assertForbiddenClaimsAbsent("F-09 DOM outerHTML", inspection.outerHtml);
  assertNoNumericRateData("F-09 DOM text", inspection.sectionText);
}

function assertReducedMotionInspection(inspection) {
  assert(
    inspection.motionDataset === "reduce",
    "F-09 must detect prefers-reduced-motion during render."
  );
  assert(
    inspection.animationName === "none" || inspection.animationDuration === "0s",
    `F-09 class-transition animation must be frozen under reduced motion: ${JSON.stringify(
      inspection
    )}`
  );
  assert(
    Array.isArray(inspection.consoleErrors) && inspection.consoleErrors.length === 0,
    `Reduced-motion F-09 flow must not emit console errors: ${JSON.stringify(
      inspection.consoleErrors
    )}`
  );
}

await withStaticSmokeBrowser(async ({ client, baseUrl }) => {
  ensureOutputRoot(outputRoot);
  await installConsoleErrorCapture(client);
  await setViewport(client, VIEWPORT);
  await client.send("Page.navigate", { url: `${baseUrl}/` });
  await waitForCommunicationRateReady(client);

  const inspection = await populateBoundedWindowsAndInspect(client);
  assertPhase6Inspection(inspection);
  await collapseFallbackTable(client);

  const screenshotPath = await captureScreenshot(
    client,
    outputRoot,
    "phase6-acceptance-communication-rate.png"
  );
  assertScreenshot(screenshotPath);

  const reducedMotion = await inspectReducedMotion(client);
  assertReducedMotionInspection(reducedMotion);

  const scannedAssetSlices = scanCompiledCommunicationRateBytes();

  await client.send("Page.navigate", {
    url: `${baseUrl}/?scenePreset=regional&m8aV4GroundStationScene=1`
  });
  const v411State = await waitForV411GroundStationReady(client);
  assert(
    v411State.communicationRateMounted === false,
    "F-09 section must not mount in the V4.11 ground-station scene."
  );

  const v411ConsoleErrors = await evaluateRuntimeValue(
    client,
    `window.__F09_CONSOLE_ERRORS__ || []`
  );
  assert(
    Array.isArray(v411ConsoleErrors) && v411ConsoleErrors.length === 0,
    `V4.11 absence check must not emit console errors: ${JSON.stringify(
      v411ConsoleErrors
    )}`
  );

  const manifestPath = writeJsonArtifact(outputRoot, "smoke-manifest.json", {
    viewport: VIEWPORT,
    screenshot: path.relative(repoRoot, screenshotPath),
    phase6Inspection: inspection,
    reducedMotion,
    v411State,
    forbiddenClaimScan: {
      dom: "F-09 section text and outerHTML",
      bytes: scannedAssetSlices
    }
  });

  console.log(
    `M8A V4.12 F-09 communication-rate smoke passed. Screenshot: ${path.relative(
      repoRoot,
      screenshotPath
    )}. Manifest: ${path.relative(repoRoot, manifestPath)}`
  );
});
