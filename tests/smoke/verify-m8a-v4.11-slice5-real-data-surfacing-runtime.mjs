import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  assert,
  captureScreenshot,
  ensureOutputRoot,
  evaluateRuntimeValue,
  setViewport,
  sleep,
  waitForGlobeReady,
  withStaticSmokeBrowser,
  writeJsonArtifact
} from "./helpers/m8a-v4-browser-capture-harness.mjs";
import { SELECTED_PAIR_DEMO_REQUEST_PATH } from "../../scripts/helpers/demo-routes.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const outputRoot = path.join(repoRoot, "output/selected-pair-source-report");

const REQUEST_PATH = SELECTED_PAIR_DEMO_REQUEST_PATH;
const EXPECTED_SCENE_SOURCE_MODE = "tle-first-runtime";
const EXPECTED_SOURCE_TIER = "geometric-derived";
const EXPECTED_EVIDENCE_KIND = "cross-family-geometric";
const EXPECTED_STATION_IDS = ["cht-yangmingshan", "sansa-hartebeesthoek"];
const EXPECTED_TLE_SOURCE_IDS = ["tle:leo", "tle:meo", "tle:geo"];
const EXPECTED_REPORT_TABS = [
  "Summary",
  "Visibility",
  "Handover",
  "Sources",
  "Models",
  "Raw data"
];
const EXPECTED_SOURCE_HEADINGS = [
  "Source boundary",
  "Pair source non-claims",
  "Station coordinate and elevation sources",
  "TLE source manifest",
  "Runtime inventory"
];
const EXPECTED_MODEL_HEADINGS = [
  "Assumptions and limits",
  "Standards used",
  "Modeled outputs",
  "Handover policy gates",
  "RF chain"
];
const EXPECTED_STANDARD_TEXT = [
  "3GPP TR 38.821",
  "3GPP TR 38.811",
  "ITU-R P.618-14",
  "ITU-R P.676-13"
];
const FORBIDDEN_POSITIVE_PHRASES = [
  "operator-validated",
  "operator validated",
  "operator-stated capability",
  "operator stated capability",
  "real operator handover event",
  "operator handover log",
  "active gateway assignment",
  "pair-specific teleport path",
  "measured latency",
  "measured jitter",
  "measured throughput",
  "native RF handover",
  "operator event time"
];
const VIEWPORT = {
  name: "desktop-1440x900",
  width: 1440,
  height: 900,
  screenshot: "source-report-panel-open.png"
};

function serializeRelative(absolutePath) {
  return path.relative(repoRoot, absolutePath);
}

function assertScreenshot(absolutePath) {
  const stats = statSync(absolutePath);
  assert(
    stats.size > 10_000,
    `Selected-pair source report screenshot is unexpectedly small: ${JSON.stringify({
      path: serializeRelative(absolutePath),
      size: stats.size
    })}`
  );
}

function collectPositiveClaimHits(text) {
  const sourceText = String(text ?? "");
  const lowered = sourceText.toLowerCase();
  const hits = [];
  const isNegated = (index) => {
    const prefix = sourceText
      .slice(Math.max(0, index - 180), index)
      .toLowerCase();

    return /\b(no|not|without|forbidden|must not|does not claim|not claimed|non-claim|not measured)\b/.test(
      prefix
    );
  };

  for (const phrase of FORBIDDEN_POSITIVE_PHRASES) {
    const needle = phrase.toLowerCase();
    let index = lowered.indexOf(needle);

    while (index !== -1) {
      if (!isNegated(index)) {
        hits.push({
          phrase,
          context: sourceText
            .slice(Math.max(0, index - 100), index + needle.length + 100)
            .replace(/\s+/g, " ")
            .trim()
        });
      }

      index = lowered.indexOf(needle, index + needle.length);
    }
  }

  return hits;
}

function assertNoLiveExternalSourceRead() {
  const runtimeSources = [
    "src/features/multi-station-selector/runtime-projection.ts",
    "src/features/multi-station-selector/runtime-data-completeness.ts",
    "src/features/multi-station-selector/runtime-projection-evidence-report.ts",
    "src/features/multi-station-selector/v4-projection-side-panel.ts",
    "src/features/multi-station-selector/v4-projection-report-actions.ts",
    "src/runtime/m8a-v4-ground-station-selected-pair-layer.ts"
  ];
  const forbiddenPatterns = [
    /fetch\([^)]*celestrak\.org/i,
    /https?:\/\/(?:www\.)?celestrak\.org/i
  ];
  const hits = [];

  for (const relativePath of runtimeSources) {
    const source = readFileSync(path.join(repoRoot, relativePath), "utf8");

    for (const pattern of forbiddenPatterns) {
      if (pattern.test(source)) {
        hits.push({ relativePath, pattern: String(pattern) });
      }
    }
  }

  assert(
    hits.length === 0,
    "Selected-pair source report runtime must use bundled source artifacts, not live external source reads: " +
      JSON.stringify(hits)
  );
}

async function waitForSelectedPairSourceReportReady(client) {
  let lastState = null;

  for (let attempt = 0; attempt < 240; attempt += 1) {
    lastState = await evaluateRuntimeValue(
      client,
      `(() => {
        const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
        const state = capture?.m8aV4GroundStationScene?.getState?.();
        const panel = document.querySelector("[data-v4-projection-side-panel='true']");
        const reportButtons = Array.from(
          document.querySelectorAll(".v4-projection-side-panel__download-report[data-report-action='open-html']")
        );

        return {
          bootstrapState: document.documentElement?.dataset.bootstrapState ?? null,
          scenePreset: document.documentElement?.dataset.scenePreset ?? null,
          route: window.location.pathname + window.location.search,
          hasViewer: Boolean(capture?.viewer),
          hasScene: Boolean(state),
          sceneSourceMode: state?.sceneSourceMode ?? null,
          selectedPairOverlayStatus: state?.selectedPairOverlay?.status ?? null,
          panelState: panel?.dataset.state ?? null,
          sourceTier: panel?.dataset.sourceTier ?? null,
          reportButtonCount: reportButtons.length
        };
      })()`
    );

    if (
      lastState?.bootstrapState === "ready" &&
      lastState?.scenePreset === "regional" &&
      lastState?.route === REQUEST_PATH &&
      lastState?.hasViewer &&
      lastState?.hasScene &&
      lastState?.sceneSourceMode === EXPECTED_SCENE_SOURCE_MODE &&
      lastState?.selectedPairOverlayStatus === "ready" &&
      lastState?.panelState === "ready" &&
      lastState?.sourceTier === EXPECTED_SOURCE_TIER &&
      lastState?.reportButtonCount >= 1
    ) {
      return lastState;
    }

    if (lastState?.bootstrapState === "error") {
      throw new Error(
        `Selected-pair source report route hit bootstrap error: ${JSON.stringify(
          lastState
        )}`
      );
    }

    await sleep(100);
  }

  throw new Error(
    `Selected-pair source report route did not become ready: ${JSON.stringify(
      lastState
    )}`
  );
}

async function openDisclosures(client) {
  await evaluateRuntimeValue(
    client,
    `(() => {
      const panel = document.querySelector("[data-v4-projection-side-panel='true']");
      const policySummary = panel?.querySelector("[data-policy-disclosure='true'] summary");
      const sourceSummary = panel?.querySelector("[data-disclosure='sources-non-claims'] summary");
      if (policySummary) {
        policySummary.click();
      }
      if (sourceSummary) {
        sourceSummary.click();
      }
    })()`
  );
  await sleep(180);
}

async function captureReportAndSourceState(client) {
  return await evaluateRuntimeValue(
    client,
    `(async () => {
      const normalize = (value) => (value ?? "").replace(/\\s+/g, " ").trim();
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
          rect.width > 0 &&
          rect.height > 0
        );
      };
      
      const panel = document.querySelector("[data-v4-projection-side-panel='true']");
      const button = panel?.querySelector(
        ".v4-projection-side-panel__download-report[data-report-action='open-html']"
      );
      if (!(button instanceof HTMLButtonElement)) {
        throw new Error("Missing selected-pair source report button.");
      }

      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      const sceneState = capture?.m8aV4GroundStationScene?.getState?.();
      const projection = sceneState?.selectedPairOverlay ?? null;
      const sourceBoundary = panel.querySelector("[data-disclosure='sources-non-claims']");
      if (sourceBoundary instanceof HTMLDetailsElement) {
        sourceBoundary.open = true;
      }

      const originalOpen = window.open;
      let reportHtml = "";
      let focused = false;
      const fakeWindow = {
        document: {
          open() {
            reportHtml = "";
          },
          write(value) {
            reportHtml += String(value);
          },
          close() {}
        },
        focus() {
          focused = true;
        },
        set opener(value) {
          this._opener = value;
        },
        get opener() {
          return this._opener;
        },
        _opener: "unchanged"
      };

      try {
        window.open = (url, target, features) => {
          fakeWindow.openArgs = { url, target, features };
          return fakeWindow;
        };
        button.click();
        await new Promise((resolve) => setTimeout(resolve, 0));
      } finally {
        window.open = originalOpen;
      }

      const reportDoc = new DOMParser().parseFromString(reportHtml, "text/html");
      const textOf = (selector) => normalize(reportDoc.querySelector(selector)?.textContent);
      const rowsIn = (selector) =>
        Array.from(reportDoc.querySelectorAll(selector + " tbody tr")).map((row) =>
          Array.from(row.querySelectorAll("td")).map((cell) => normalize(cell.textContent))
        );
      const headingTexts = (selector) =>
        Array.from(reportDoc.querySelectorAll(selector + " h3")).map((heading) =>
          normalize(heading.textContent)
        );
      const tabLabels = Array.from(reportDoc.querySelectorAll("[data-tab-target]")).map(
        (tab) => normalize(tab.textContent).replace(/\\s*\\(.*\\)$/u, "")
      );
      const resourceHits = performance
        .getEntriesByType("resource")
        .map((entry) => entry.name)
        .filter((name) => /celestrak\\.org/i.test(name));
      const reportText = normalize(reportDoc.body?.textContent);

      return {
        route: window.location.pathname + window.location.search,
        sceneSourceMode: sceneState?.sceneSourceMode ?? null,
        report: {
          htmlLength: reportHtml.length,
          openArgs: fakeWindow.openArgs ?? null,
          focused,
          openerValue: fakeWindow._opener,
          filename: reportDoc.body?.dataset.reportFilename ?? null,
          tabLabels,
          text: reportText,
          sourceHeadings: headingTexts("#sources"),
          modelHeadings: headingTexts("#models"),
          summaryText: textOf("#summary"),
          sourcesText: textOf("#sources"),
          modelsText: textOf("#models"),
          runtimeText: textOf("#runtime"),
          sourceBoundaryRows: rowsIn("#sources .table-wrap:nth-of-type(1)"),
          stationRows: rowsIn("#sources .table-wrap:nth-of-type(2)"),
          tleRows: rowsIn("#sources .table-wrap:nth-of-type(3)"),
          inventoryRows: rowsIn("#sources .table-wrap:nth-of-type(4)"),
          modeledOutputCardsCount: (() => {
            const lists = Array.from(reportDoc.querySelectorAll("#models .model-cards-list"));
            return lists[0] ? lists[0].querySelectorAll(".model-card").length : 0;
          })(),
          policyRows: rowsIn("#models .table-wrap"),
          rfCardsCount: (() => {
            const lists = Array.from(reportDoc.querySelectorAll("#models .model-cards-list"));
            return lists[1] ? lists[1].querySelectorAll(".model-card").length : 0;
          })(),
          actorRows: rowsIn("#runtime .table-wrap:nth-of-type(1)"),
          visibilityRows: rowsIn("#runtime .table-wrap:nth-of-type(2)")
        },
        panelDisclosures: {
          sourceBoundaryOpen:
            sourceBoundary instanceof HTMLDetailsElement ? sourceBoundary.open : null,
          sourceBoundaryText:
            sourceBoundary instanceof HTMLElement ? normalize(sourceBoundary.innerText) : ""
        },
        projection,
        resourceHits
      };
    })()`,
    { awaitPromise: true }
  );
}

function assertRuntimeSourceState(state) {
  const projection = state.projection;
  const dataCompleteness = projection?.dataCompleteness;
  const pairAttribution = dataCompleteness?.pairSourceAttribution;
  const stationIds =
    dataCompleteness?.stationPrecision?.map((entry) => entry.stationId) ?? [];
  const tleSourceIds =
    dataCompleteness?.tleSources?.map((entry) => entry.sourceId) ?? [];

  assert(
    state.route === REQUEST_PATH &&
      state.sceneSourceMode === EXPECTED_SCENE_SOURCE_MODE &&
      projection?.status === "ready" &&
      projection?.sourceMode === EXPECTED_SCENE_SOURCE_MODE &&
      dataCompleteness?.routeMode === EXPECTED_SCENE_SOURCE_MODE,
    `Selected-pair source report smoke must load runtime selected-pair state: ${JSON.stringify(
      {
        route: state.route,
        sceneSourceMode: state.sceneSourceMode,
        projectionStatus: projection?.status,
        sourceMode: projection?.sourceMode,
        routeMode: dataCompleteness?.routeMode
      }
    )}`
  );
  assert(
    pairAttribution?.sourceTier === EXPECTED_SOURCE_TIER &&
      pairAttribution?.evidenceKind === EXPECTED_EVIDENCE_KIND &&
      /Geometric pair/i.test(pairAttribution?.badgeLabel ?? "") &&
      pairAttribution?.nonClaims?.some((note) =>
        /No operator or contractual attestation/i.test(note)
      ),
    `Pair source attribution must remain visibility-derived with explicit non-claims: ${JSON.stringify(
      pairAttribution
    )}`
  );
  assert(
    JSON.stringify(stationIds) === JSON.stringify(EXPECTED_STATION_IDS) &&
      dataCompleteness.stationPrecision.every(
        (entry) =>
          entry.sourceTier === EXPECTED_SOURCE_TIER &&
          typeof entry.coordinateSourceAuthority === "string" &&
          entry.coordinateSourceAuthority.length > 0 &&
          typeof entry.coordinateSourceNote === "string" &&
          entry.coordinateSourceNote.length > 0 &&
          typeof entry.elevationSourcePath === "string" &&
          entry.elevationSourcePath.includes("station-elevations-cache.json") &&
          typeof entry.elevationNonClaim === "string" &&
          entry.elevationNonClaim.length > 0
      ),
    `Station source rows must expose coordinate and elevation source boundaries: ${JSON.stringify(
      dataCompleteness?.stationPrecision
    )}`
  );
  assert(
    JSON.stringify(tleSourceIds) === JSON.stringify(EXPECTED_TLE_SOURCE_IDS) &&
      dataCompleteness.tleSources.every(
        (entry) =>
          entry.sourcePath.startsWith("/fixtures/satellites-network/") &&
          entry.apiClass === "celestrak-gp-tle" &&
          entry.sourcePolicy === "refresh-artifact" &&
          entry.acceptedRecordCount > 0 &&
          entry.parserFailureCount === 0 &&
          entry.health === "fresh" &&
          typeof entry.sourceTimestampUtc === "string"
      ),
    `TLE source manifest must use bundled refresh artifacts with healthy parsed rows: ${JSON.stringify(
      dataCompleteness?.tleSources
    )}`
  );
  assert(
    dataCompleteness.actorProvenance.length === projection.actorCount &&
      dataCompleteness.visibilityProvenance.length === projection.actorCount &&
      projection.actorCount > 0 &&
      projection.linkFlowCueCount > 0 &&
      projection.eventCueCount > 0,
    `Actor and visibility provenance must cover the selected-pair overlay actors: ${JSON.stringify(
      {
        actorCount: projection.actorCount,
        actorProvenance: dataCompleteness.actorProvenance.length,
        visibilityProvenance: dataCompleteness.visibilityProvenance.length,
        linkFlowCueCount: projection.linkFlowCueCount,
        eventCueCount: projection.eventCueCount
      }
    )}`
  );
}

function assertReportSourcePackage(state) {
  const report = state.report;
  const missingTabs = EXPECTED_REPORT_TABS.filter(
    (label) => !report.tabLabels.includes(label)
  );
  const missingSourceHeadings = EXPECTED_SOURCE_HEADINGS.filter(
    (heading) => !report.sourceHeadings.includes(heading)
  );
  const missingModelHeadings = EXPECTED_MODEL_HEADINGS.filter(
    (heading) => !report.modelHeadings.includes(heading)
  );
  const missingStandards = EXPECTED_STANDARD_TEXT.filter(
    (snippet) => !report.modelsText.includes(snippet)
  );
  const claimHits = collectPositiveClaimHits(report.text);

  assert(
    report.openArgs?.target === "_blank" &&
      report.focused === true &&
      report.openerValue === null &&
      report.htmlLength > 20_000 &&
      /^runtime-projection-evidence-/.test(report.filename ?? ""),
    `Report action must generate a standalone selected-pair source report: ${JSON.stringify(
      {
        openArgs: report.openArgs,
        focused: report.focused,
        openerValue: report.openerValue,
        htmlLength: report.htmlLength,
        filename: report.filename
      }
    )}`
  );
  assert(
    missingTabs.length === 0 &&
      missingSourceHeadings.length === 0 &&
      missingModelHeadings.length === 0 &&
      missingStandards.length === 0,
    `Report must expose source, model, and raw-data sections: ${JSON.stringify({
      missingTabs,
      tabs: report.tabLabels,
      missingSourceHeadings,
      sourceHeadings: report.sourceHeadings,
      missingModelHeadings,
      modelHeadings: report.modelHeadings,
      missingStandards
    })}`
  );
  assert(
    report.sourcesText.includes(EXPECTED_SOURCE_TIER) &&
      report.sourcesText.includes(EXPECTED_EVIDENCE_KIND) &&
      report.sourcesText.includes("TLE source manifest") &&
      report.sourcesText.includes("Runtime inventory") &&
      report.modelsText.toLowerCase().includes("modeled") &&
      report.modelsText.toLowerCase().includes("not measured") &&
      report.runtimeText.includes("sourceMode") &&
      report.runtimeText.includes(EXPECTED_SCENE_SOURCE_MODE),
    `Report text must carry source-tier, TLE, inventory, model, and raw JSON evidence: ${JSON.stringify(
      {
        sourcesText: report.sourcesText.slice(0, 800),
        modelsText: report.modelsText.slice(0, 800),
        runtimeText: report.runtimeText.slice(0, 800)
      }
    )}`
  );
  assert(
    report.stationRows.length === 2 &&
      report.tleRows.length === 3 &&
      report.inventoryRows.length === 3 &&
      report.modeledOutputCardsCount >= 5 &&
      report.policyRows.length === 4 &&
      report.rfCardsCount >= 3 &&
      report.actorRows.length > 0 &&
      report.visibilityRows.length > 0,
    `Report tables must preserve source/report completeness row coverage: ${JSON.stringify(
      {
        stationRows: report.stationRows.length,
        tleRows: report.tleRows.length,
        inventoryRows: report.inventoryRows.length,
        modeledOutputCardsCount: report.modeledOutputCardsCount,
        policyRows: report.policyRows.length,
        rfCardsCount: report.rfCardsCount,
        actorRows: report.actorRows.length,
        visibilityRows: report.visibilityRows.length
      }
    )}`
  );
  assert(
    report.stationRows.some((row) => row.includes("cht-yangmingshan")) &&
      report.stationRows.some((row) => row.includes("sansa-hartebeesthoek")) &&
      report.tleRows.some((row) => row.includes("tle:leo")) &&
      report.tleRows.some((row) => row.includes("tle:meo")) &&
      report.tleRows.some((row) => row.includes("tle:geo")),
    `Report source rows must name selected stations and TLE sources: ${JSON.stringify(
      {
        stationRows: report.stationRows,
        tleRows: report.tleRows
      }
    )}`
  );
  assert(
    state.panelDisclosures.sourceBoundaryOpen === true &&
      state.panelDisclosures.sourceBoundaryText.includes("TLE source summary") &&
      state.panelDisclosures.sourceBoundaryText.includes("Standards references"),
    `Panel source boundary must mirror the report entry path: ${JSON.stringify(
      state.panelDisclosures
    )}`
  );
  assert(
    state.resourceHits.length === 0,
    `Runtime must not fetch live external source URLs during source report capture: ${JSON.stringify(
      state.resourceHits
    )}`
  );
  assert(
    claimHits.length === 0,
    `Selected-pair source report must not promote measured/operator claims: ${JSON.stringify(
      claimHits
    )}`
  );
}

assertNoLiveExternalSourceRead();
ensureOutputRoot(outputRoot);

await withStaticSmokeBrowser(async ({ client, baseUrl }) => {
  await setViewport(client, VIEWPORT);
  await client.send("Page.navigate", { url: `${baseUrl}${REQUEST_PATH}` });
  await waitForSelectedPairSourceReportReady(client);
  await waitForGlobeReady(client, "Selected-pair source report smoke");
  await openDisclosures(client);

  const state = await captureReportAndSourceState(client);
  assertRuntimeSourceState(state);
  assertReportSourcePackage(state);

  const screenshotPath = await captureScreenshot(
    client,
    outputRoot,
    VIEWPORT.screenshot
  );
  assertScreenshot(screenshotPath);

  const manifestPath = writeJsonArtifact(outputRoot, "smoke-manifest.json", {
    generatedAt: new Date().toISOString(),
    route: REQUEST_PATH,
    viewport: VIEWPORT.name,
    screenshot: serializeRelative(screenshotPath),
    sourceTier: state.projection.dataCompleteness.pairSourceAttribution.sourceTier,
    evidenceKind: state.projection.dataCompleteness.pairSourceAttribution.evidenceKind,
    stationRows: state.report.stationRows.length,
    tleRows: state.report.tleRows.length,
    inventoryRows: state.report.inventoryRows.length,
    modeledOutputCardsCount: state.report.modeledOutputCardsCount,
    actorRows: state.report.actorRows.length,
    visibilityRows: state.report.visibilityRows.length
  });

  console.log(
    `Selected-pair source report smoke passed. Manifest: ${serializeRelative(
      manifestPath
    )}`
  );
});
