import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
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
  "Requirements",
  "Visibility",
  "Handover",
  "Sources",
  "Models",
  "Raw data"
];
const EXPECTED_SOURCE_HEADINGS = [
  "Source limits",
  "Pair source limits",
  "Station coordinate and elevation sources",
  "Station lineage",
  "Station RF profile gaps",
  "TLE selection policy",
  "TLE source manifest",
  "Runtime inventory",
  "Satellite / TLE lineage",
  "Orbit source freshness",
  "Display transforms",
  "Atmospheric / rain lineage",
  "External evidence register",
  "Missing evidence register",
  "Source gaps"
];
const EXPECTED_OUTLINE_TABS = [
  "summary",
  "requirements",
  "visibility",
  "handover",
  "sources",
  "models",
  "runtime"
];
const EXPECTED_SOURCES_OUTLINE_LABELS = [
  "Source limits",
  "Station lineage",
  "TLE selection policy",
  "TLE source manifest",
  "External evidence register",
  "Missing evidence register",
  "Source gaps"
];
const EXPECTED_DETAIL_TOGGLE_LABELS = ["Evidence Detail"];
const EXPECTED_FIELD_GUIDE_TITLES = [
  "Summary 欄位解讀",
  "Projection setup 欄位解讀",
  "Communication by orbit 欄位解讀",
  "Requirements 欄位解讀",
  "Visibility windows 欄位解讀",
  "Handover events 欄位解讀",
  "Source limits 欄位解讀",
  "Station coordinate and elevation sources 欄位解讀",
  "Station lineage 欄位解讀",
  "Station RF profile gaps 欄位解讀",
  "TLE selection policy 欄位解讀",
  "TLE source manifest 欄位解讀",
  "Runtime inventory 欄位解讀",
  "Satellite / TLE lineage 欄位解讀",
  "Orbit source freshness 欄位解讀",
  "Display transforms 欄位解讀",
  "Atmospheric / rain lineage 欄位解讀",
  "External evidence register 欄位解讀",
  "Missing evidence register 欄位解讀",
  "Source gaps 欄位解讀",
  "Assumptions and limits 欄位解讀",
  "Standards used 欄位解讀",
  "Modeled outputs 欄位解讀",
  "Handover policy gates 欄位解讀",
  "RF chain 欄位解讀",
  "Actor provenance 欄位解讀",
  "Visibility provenance 欄位解讀",
  "Raw JSON payload 欄位解讀"
];
const EXPECTED_FIELD_GUIDE_TEXT = [
  "數據代表什麼",
  "怎麼解讀",
  "來源與限制",
  "模型值不是實測服務資料",
  "不是實測連線紀錄",
  "缺少來源的項目不能用模型自動補成真實資料",
  "TLE/SGP4 共同可見幾何排序",
  "not a communication-quality sort"
];
const EXPECTED_FIELD_GUIDE_PLACEMENTS = [
  ["#summary", "Projection setup", "Projection setup 欄位解讀"],
  ["#summary", "Communication by orbit", "Communication by orbit 欄位解讀"],
  ["#requirements", "Requirement coverage table", "Requirements 欄位解讀"],
  ["#visibility", "Visibility windows", "Visibility windows 欄位解讀"],
  ["#handover", "Handover events", "Handover events 欄位解讀"],
  ["#sources", "Source limits", "Source limits 欄位解讀"],
  ["#sources", "Station coordinate and elevation sources", "Station coordinate and elevation sources 欄位解讀"],
  ["#sources", "Station lineage", "Station lineage 欄位解讀"],
  ["#sources", "Station RF profile gaps", "Station RF profile gaps 欄位解讀"],
  ["#sources", "TLE selection policy", "TLE selection policy 欄位解讀"],
  ["#sources", "TLE source manifest", "TLE source manifest 欄位解讀"],
  ["#sources", "Runtime inventory", "Runtime inventory 欄位解讀"],
  ["#sources", "Satellite / TLE lineage", "Satellite / TLE lineage 欄位解讀"],
  ["#sources", "Orbit source freshness", "Orbit source freshness 欄位解讀"],
  ["#sources", "Display transforms", "Display transforms 欄位解讀"],
  ["#sources", "Atmospheric / rain lineage", "Atmospheric / rain lineage 欄位解讀"],
  ["#sources", "External evidence register", "External evidence register 欄位解讀"],
  ["#sources", "Missing evidence register", "Missing evidence register 欄位解讀"],
  ["#sources", "Source gaps", "Source gaps 欄位解讀"],
  ["#models", "Assumptions and limits", "Assumptions and limits 欄位解讀"],
  ["#models", "Standards used", "Standards used 欄位解讀"],
  ["#models", "Modeled outputs", "Modeled outputs 欄位解讀"],
  ["#models", "Handover policy gates", "Handover policy gates 欄位解讀"],
  ["#models", "RF chain", "RF chain 欄位解讀"],
  ["#runtime", "Actor provenance", "Actor provenance 欄位解讀"],
  ["#runtime", "Visibility provenance", "Visibility provenance 欄位解讀"],
  ["#runtime", "Raw JSON payload", "Raw JSON payload 欄位解讀"]
];
const EXPECTED_SUMMARY_DETAIL_PANEL_TEXT = [
  "解讀",
  "資料來源",
  "限制",
  "儀表",
  "軌道分布",
  "Projection setup 欄位解讀",
  "Communication by orbit 欄位解讀",
  "模型判定兩站在選定時間窗內可通訊的總時間",
  "站點資料不代表完整硬體規格",
  "不是 iperf/ping 測試",
  "不是射頻層實際換手",
  "不是本地實測天氣",
  "它不會補上缺少的 packet traces"
];
const EXPECTED_SUMMARY_FIELD_GUIDE_TITLES = [
  "Summary 欄位解讀",
  "Projection setup 欄位解讀",
  "Communication by orbit 欄位解讀"
];
const EXPECTED_TRUTH_CHIPS = [
  "Model-derived",
  "Public source",
  "Standards-derived",
  "External evidence",
  "Source gap"
];
const EXPECTED_REQUIREMENT_ROW_IDS = [
  "R1-T1 / K-A1",
  "R1-T2 / K-D1",
  "R1-T3 / K-D2",
  "R1-T4 / K-D3",
  "R1-T5 / K-D4",
  "R1-T6 / K-D5",
  "R1-F1 / K-E1",
  "R1-F2 / K-E2",
  "R1-F3 / K-E3",
  "R1-F4 / K-E4 / K-F4",
  "R1-F5 / K-E5",
  "K-A4",
  "K-E6",
  "K-F7",
  "R1-D1",
  "R1-D2",
  "R1-D3",
  "R1-D4",
  "V-MO1",
  "K-A2",
  "K-A3-a",
  "K-A3-b",
  "K-F2",
  "(irreducible-1)",
  "(irreducible-2)",
  "(irreducible-3)",
  "K-F1",
  "K-A5",
  "K-B1",
  "K-C1",
  "K-F5",
  "K-F6",
  "K-F8",
  "R1-D5"
];
const EXPECTED_REQUIREMENT_HEADERS = [
  "Bucket",
  "Requirement ID",
  "Requirement",
  "Answer / value",
  "How to read",
  "Source strength",
  "Evidence location",
  "Limit / source gap"
];
const EXPECTED_REQUIREMENT_TEXT = [
  "Requirement coverage table",
  "Data",
  "Interpretation",
  "Source strength",
  "consolidated requirements",
  "沒有 iperf/ping packet-test trace",
  "External evidence",
  "Source gap"
];
const EXPECTED_SOURCE_TRUTH_CHIPS = [
  "Model-derived",
  "Public source",
  "Display transform",
  "Source gap"
];
const EXPECTED_SATELLITE_LINEAGE_TEXT = [
  "Satellite / TLE lineage",
  "Satellite source manifest",
  "TLE/OMM manifests disclose records",
  "accepted rows",
  "rejected rows",
  "parser failures",
  "caps",
  "TLE selection policy",
  "幾何排序後的 runtime cap",
  "not a communication-quality sort",
  "Orbit source freshness",
  "Display transforms"
];
const EXPECTED_TLE_PARSE_HEADERS = [
  "Records",
  "Accepted",
  "Rejected",
  "Parser failures",
  "Cap"
];
const EXPECTED_SATELLITE_LINEAGE_HEADERS = [
  "Records",
  "Accepted",
  "Rejected",
  "Parser failures",
  "Runtime cap"
];
const EXPECTED_RUNTIME_CAP_HEADERS = [
  "Runtime cap",
  "Capped",
  "Visible actors"
];
const EXPECTED_SOURCE_GAP_FIELDS = [
  "packet-test-trace",
  "operator-rf-hardware-truth",
  "local-rain-calibration",
  "station-rf-profile",
  "station-elevation-dem-metadata",
  "terrain-mask-default",
  "atmospheric-grid-lookup"
];
const EXPECTED_EXTERNAL_EVIDENCE_IDS = [
  "selected-pair-report-smoke",
  "selected-pair-external-source-reconciliation",
  "selected-pair-dem-rain-repair-sources",
  "selected-pair-route-governance",
  "phase7-0-24h-soak",
  "multi-orbit-scale-validation",
  "external-infra-validation-summary"
];
const EXPECTED_MISSING_EVIDENCE_IDS = [
  "packet-test-trace",
  "acceptance-threshold-script",
  "local-rain-calibration",
  "operator-rf-hardware-truth",
  "external-network-bridge",
  "dut-traffic-generator-run",
  "final-written-report-package"
];
const EXPECTED_EXTERNAL_EVIDENCE_HEADERS = [
  "Evidence ID",
  "Requirement IDs",
  "Status",
  "Artifact refs",
  "Evidence value",
  "How to read",
  "Boundary"
];
const EXPECTED_MISSING_EVIDENCE_HEADERS = [
  "Gap ID",
  "Requirement IDs",
  "Source strength",
  "Missing evidence",
  "Needed source",
  "Impact",
  "Boundary"
];
const EXPECTED_STATION_LINEAGE_TEXT = [
  "Station lineage",
  "Station metadata",
  "coordinate authority",
  "elevation cache metadata",
  "terrain-mask defaults",
  "RF profile gaps"
];
const EXPECTED_STATION_LINEAGE_HEADERS = [
  "Coordinate authority",
  "Coordinate URL",
  "Coordinate note",
  "Raw lat/lon",
  "Coordinate use",
  "Render position",
  "Elevation source",
  "Elevation provenance",
  "Elevation dataset",
  "DEM details",
  "Terrain source",
  "Effective threshold"
];
const EXPECTED_STATION_RF_HEADERS = [
  "Source strength",
  "Antenna diameter",
  "Antenna source",
  "Peak EIRP",
  "EIRP source",
  "Tx polarization",
  "Polarization source",
  "Boundary"
];
const EXPECTED_ATMOSPHERIC_LINEAGE_TEXT = [
  "Atmospheric / rain lineage",
  "Atmospheric inputs",
  "Rain-rate control is scenario input",
  "local grid values"
];
const EXPECTED_ATMOSPHERIC_HEADERS = [
  "Source strength",
  "Midpoint lat",
  "Midpoint lon",
  "Cell lat",
  "Cell lon",
  "Lookup value",
  "Interpolation",
  "Source id",
  "Limit"
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
const EXPECTED_ASSUMPTIONS_LIMITS_HEADERS = [
  "Item",
  "Limit / assumption",
  "How to read",
  "Applies to",
  "Not evidence of"
];
const EXPECTED_STANDARDS_REFERENCE_HEADERS = [
  "Standard / reference",
  "Used for",
  "Source role",
  "How to read",
  "Boundary"
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
  "operator event time",
  "active serving-link sequence",
  "active serving satellite",
  "operator SLA",
  "commercial SLA",
  "real routing",
  "commercial routing",
  "validated routing",
  "pair-specific routing"
];
const FORBIDDEN_REPORT_WORKLOG_PHRASES = [
  "agent",
  "handoff",
  "implementation note",
  "internal worklog",
  "just added",
  "next step",
  "pending discussion",
  "this round"
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

function writeTextArtifact(outputRoot, filename, text) {
  const safeFilename = path.basename(
    String(filename || "selected-pair-source-report-artifact.txt")
  );
  const absolutePath = path.join(outputRoot, safeFilename);
  const contents = String(text ?? "");

  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, contents);

  const stats = statSync(absolutePath);
  assert(
    stats.size > 0,
    `Selected-pair source report artifact is unexpectedly empty: ${JSON.stringify({
      path: serializeRelative(absolutePath),
      size: stats.size
    })}`
  );

  return absolutePath;
}

function collectPositiveClaimHits(text) {
  const sourceText = String(text ?? "");
  const lowered = sourceText.toLowerCase();
  const hits = [];
  const isNegated = (index) => {
    const prefix = sourceText
      .slice(Math.max(0, index - 180), index)
      .toLowerCase();

    const suffix = sourceText
      .slice(index, Math.min(sourceText.length, index + 180))
      .toLowerCase();
    const context = `${prefix} ${suffix}`;

    return /\b(no|not|without|forbidden|must not|does not claim|not claimed|non-claim|not measured|not validated|not operator)\b|不代表|不是|不會|不能|沒有|未|無|非/.test(
      context
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

function parseReportActionUrl(url) {
  return new URL(String(url ?? ""), "http://selected-pair-report.test");
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
      const csvButton = panel?.querySelector(
        ".v4-projection-side-panel__download-report[data-report-action='download-csv']"
      );
      if (!(button instanceof HTMLButtonElement)) {
        throw new Error("Missing selected-pair source report button.");
      }
      if (!(csvButton instanceof HTMLButtonElement)) {
        throw new Error("Missing selected-pair CSV button.");
      }

      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      const sceneState = capture?.m8aV4GroundStationScene?.getState?.();
      const projection = sceneState?.selectedPairOverlay ?? null;
      const sourceBoundary = panel.querySelector("[data-disclosure='sources-non-claims']");
      if (sourceBoundary instanceof HTMLDetailsElement) {
        sourceBoundary.open = true;
      }
      const sourceHelpTrigger = sourceBoundary?.querySelector(
        ".v4-projection-side-panel__source-help-trigger"
      );
      const sourceHelpPopover = sourceBoundary?.querySelector(
        ".v4-projection-side-panel__source-help-popover"
      );
      if (sourceHelpTrigger instanceof HTMLButtonElement) {
        sourceHelpTrigger.click();
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

      const OriginalBlob = window.Blob;
      const originalCreateObjectUrl = URL.createObjectURL;
      const originalRevokeObjectUrl = URL.revokeObjectURL;
      const originalAnchorClick = HTMLAnchorElement.prototype.click;
      const csvCapture = {
        text: "",
        mimeType: null,
        filename: null
      };
      try {
        window.Blob = class CapturingBlob extends OriginalBlob {
          constructor(parts, options) {
            super(parts, options);
            csvCapture.text = Array.from(parts ?? []).map(String).join("");
            csvCapture.mimeType = options?.type ?? null;
          }
        };
        URL.createObjectURL = () => "blob:selected-pair-csv";
        URL.revokeObjectURL = () => {};
        HTMLAnchorElement.prototype.click = function click() {
          csvCapture.filename = this.download || null;
        };
        csvButton.click();
        await new Promise((resolve) => setTimeout(resolve, 0));
      } finally {
        window.Blob = OriginalBlob;
        URL.createObjectURL = originalCreateObjectUrl;
        URL.revokeObjectURL = originalRevokeObjectUrl;
        HTMLAnchorElement.prototype.click = originalAnchorClick;
      }

      const reportDoc = new DOMParser().parseFromString(reportHtml, "text/html");
      const collectInteractiveReportState = async () => {
        const iframe = document.createElement("iframe");
        iframe.setAttribute("title", "selected-pair-report-smoke");
        iframe.style.position = "fixed";
        iframe.style.left = "-10000px";
        iframe.style.top = "0";
        iframe.style.width = "1440px";
        iframe.style.height = "900px";
        iframe.style.opacity = "0";
        document.body.appendChild(iframe);

        try {
          await new Promise((resolve) => {
            iframe.addEventListener("load", resolve, { once: true });
            iframe.srcdoc = reportHtml;
            setTimeout(resolve, 500);
          });
          const waitUntilReportFrameReady = async () => {
            const deadline = Date.now() + 3000;
            while (Date.now() < deadline) {
              const readyDoc = iframe.contentDocument;
              if (
                readyDoc?.querySelector("#evidence-detail-toggle") &&
                readyDoc.querySelector(".toolbar") &&
                readyDoc.querySelector("#summary")
              ) {
                return true;
              }
              await new Promise((resolve) => setTimeout(resolve, 50));
            }
            return false;
          };
          await waitUntilReportFrameReady();

          const frameDoc = iframe.contentDocument;
          const frameWindow = iframe.contentWindow;
          if (!frameDoc || !frameWindow) {
            return {
              error: "missing iframe document"
            };
          }

          const normalizeFrameText = (value) => (value ?? "").replace(/\\s+/g, " ").trim();
          const frameVisible = (element) => {
            if (!element || !frameWindow) {
              return false;
            }
            const style = frameWindow.getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return (
              element.hidden !== true &&
              style.display !== "none" &&
              style.visibility !== "hidden" &&
              rect.width > 0 &&
              rect.height > 0
            );
          };
          const visibleText = (selector) =>
            Array.from(frameDoc.querySelectorAll(selector))
              .filter(frameVisible)
              .map((element) => normalizeFrameText(element.textContent))
              .join(" ");
          const visibleChineseText = () => {
            const snippets = [];
            const walker = frameDoc.createTreeWalker(
              frameDoc.body,
              frameWindow.NodeFilter.SHOW_TEXT
            );
            let node = walker.nextNode();
            while (node) {
              const text = normalizeFrameText(node.textContent);
              const parent = node.parentElement;
              if (text && /[\u4e00-\u9fff]/u.test(text) && parent && frameVisible(parent)) {
                snippets.push(text);
                if (snippets.length >= 12) {
                  break;
                }
              }
              node = walker.nextNode();
            }
            return snippets.join(" | ");
          };
          const visibleCount = (selector) =>
            Array.from(frameDoc.querySelectorAll(selector)).filter(frameVisible).length;
          const overflowCount = (selector) =>
            Array.from(frameDoc.querySelectorAll(selector)).filter((element) => {
              if (!frameVisible(element)) {
                return false;
              }
              return element.scrollWidth > element.clientWidth + 1;
            }).length;
          const fontSizeOf = (selector) => {
            const element =
              Array.from(frameDoc.querySelectorAll(selector)).find(frameVisible) ??
              frameDoc.querySelector(selector);
            if (!(element instanceof frameWindow.HTMLElement)) {
              return null;
            }
            return Number.parseFloat(frameWindow.getComputedStyle(element).fontSize);
          };

          const detailToggle = frameDoc.querySelector("#evidence-detail-toggle");
          const detailLabel = frameDoc.querySelector(
            "label.detail-toggle-control[for='evidence-detail-toggle']"
          );
          const toolbar = frameDoc.querySelector(".toolbar");
          const reportHeader = frameDoc.querySelector(".report-header");
          const toolbarPosition = toolbar ? frameWindow.getComputedStyle(toolbar).position : null;
          const targetIdFromHref = (href) => {
            if (!href?.startsWith("#")) {
              return "";
            }
            try {
              return decodeURIComponent(href.slice(1));
            } catch {
              return href.slice(1);
            }
          };
          const activeOutlineState = () => {
            const activeLinks = Array.from(
              frameDoc.querySelectorAll(
                "[data-section-outline-link='true'].is-active, [data-section-outline-link='true'][aria-current='location']"
              )
            ).filter(frameVisible);
            const link = activeLinks[0] ?? null;
            const style = link ? frameWindow.getComputedStyle(link) : null;
            const href = link?.getAttribute("href") ?? "";
            const target = href ? frameDoc.getElementById(targetIdFromHref(href)) : null;
            return {
              count: activeLinks.length,
              text: normalizeFrameText(link?.textContent),
              href,
              ariaCurrent: link?.getAttribute("aria-current") ?? null,
              fontSizePx: style ? Number.parseFloat(style.fontSize) : null,
              targetText: normalizeFrameText(target?.textContent)
            };
          };
          const summaryOutlineLinks = Array.from(
            frameDoc.querySelectorAll("#summary [data-section-outline-link='true']")
          );
          const scrollTargetLink = summaryOutlineLinks[1] ?? summaryOutlineLinks[0] ?? null;
          const scrollTarget =
            scrollTargetLink instanceof frameWindow.HTMLElement
              ? frameDoc.getElementById(targetIdFromHref(scrollTargetLink.getAttribute("href")))
              : null;
          await new Promise((resolve) => frameWindow.requestAnimationFrame(resolve));
          const before = {
            detailToggleChecked: detailToggle?.checked ?? null,
            summaryDetailPanelVisibleCount: visibleCount(
              "#summary [data-evidence-detail-panel='true']"
            ),
            summaryFieldGuideVisibleCount: visibleCount("#summary [data-field-guide='true']"),
            summarySourceIssueVisibleCount: visibleCount(
              "#summary [data-source-issue-marker='true']"
            ),
            toolbarPosition,
            toolbarHeight:
              toolbar instanceof frameWindow.HTMLElement
                ? Math.round(toolbar.getBoundingClientRect().height)
                : null,
            reportHeaderHeight:
              reportHeader instanceof frameWindow.HTMLElement
                ? Math.round(reportHeader.getBoundingClientRect().height)
                : null,
            toggleVisibleInToolbar: frameVisible(
              frameDoc.querySelector(".toolbar .detail-toggle-control")
            ),
            tabFontSizePx: fontSizeOf("[role='tab']"),
            searchFontSizePx: fontSizeOf("[data-report-filter]"),
            toggleLabelFontSizePx: fontSizeOf(".evidence-detail-label"),
            visibleChineseText: visibleChineseText(),
            activeOutline: activeOutlineState()
          };

          if (detailLabel instanceof frameWindow.HTMLElement) {
            detailLabel.click();
          } else if (detailToggle instanceof frameWindow.HTMLInputElement) {
            detailToggle.click();
          }
          await new Promise((resolve) => frameWindow.requestAnimationFrame(resolve));
          if (scrollTarget instanceof frameWindow.HTMLElement) {
            scrollTarget.scrollIntoView({ block: "start" });
          } else {
            frameWindow.scrollTo(0, 900);
          }
          // Let layout + the scroll-spy IntersectionObserver settle. Two rAF are
          // not enough once the report grows tall (more satellites / larger source
          // pool), so poll on a short timeout until an outline link becomes active.
          await new Promise((resolve) => frameWindow.requestAnimationFrame(resolve));
          for (let settleTry = 0; settleTry < 40; settleTry += 1) {
            if (activeOutlineState().count >= 1) {
              break;
            }
            await new Promise((resolve) => frameWindow.setTimeout(resolve, 25));
          }
          await new Promise((resolve) => frameWindow.requestAnimationFrame(resolve));

          const fieldGuideTitles = Array.from(
            frameDoc.querySelectorAll("#summary [data-field-guide='true'] h3")
          )
            .filter(frameVisible)
            .map((heading) => normalizeFrameText(heading.textContent));
          const afterSummaryState = {
            detailToggleChecked: detailToggle?.checked ?? null,
            summaryDetailPanelVisibleCount: visibleCount(
              "#summary [data-evidence-detail-panel='true']"
            ),
            summaryFieldGuideVisibleCount: visibleCount("#summary [data-field-guide='true']"),
            summarySourceIssueVisibleCount: visibleCount(
              "#summary [data-source-issue-marker='true']"
            ),
            summaryDetailText: visibleText(
              "#summary [data-evidence-detail-panel='true'], #summary [data-field-guide='true']"
            ),
            summarySourceIssueText: visibleText(
              "#summary [data-source-issue-marker='true']"
            ),
            summarySourceIssueAriaCount: Array.from(
              frameDoc.querySelectorAll("#summary [data-source-issue-marker='true'][aria-label]")
            ).filter(frameVisible).length,
            visibleChineseText: visibleChineseText(),
            fieldGuideTitles,
            summaryDetailDdFontSizePx: fontSizeOf(
              "#summary [data-evidence-detail-panel='true'] dd"
            ),
            summaryFieldGuideCellFontSizePx: fontSizeOf(
              "#summary [data-field-guide='true'] tbody td"
            ),
            toggleVisibleInToolbarAfterScroll: frameVisible(
              frameDoc.querySelector(".toolbar .detail-toggle-control")
            ),
            toolbarTopAfterScroll:
              toolbar instanceof frameWindow.HTMLElement
                ? Math.round(toolbar.getBoundingClientRect().top)
                : null,
            activeOutline: activeOutlineState(),
            expectedActiveOutlineText: normalizeFrameText(scrollTargetLink?.textContent),
            summaryExplanationOverflowCount: overflowCount(
              [
                "#summary [data-evidence-detail-panel='true']",
                "#summary [data-evidence-detail-panel='true'] div",
                "#summary [data-evidence-detail-panel='true'] dd",
                "#summary .lineage-item",
                "#summary .lineage-item p",
                "#summary .dashboard-card",
                "#summary .dashboard-card .card-content",
                "#summary .metric-card",
                "#summary .evidence-card"
              ].join(", ")
            )
          };
          const waitForReportFrame = async () => {
            await new Promise((resolve) => frameWindow.requestAnimationFrame(resolve));
            await new Promise((resolve) => frameWindow.requestAnimationFrame(resolve));
            // Tab switches re-render the panel + restore per-tab scroll position
            // asynchronously; with a tall report that needs more than two frames to
            // lay out and apply the restored scroll, so add a short settle.
            await new Promise((resolve) => frameWindow.setTimeout(resolve, 200));
            await new Promise((resolve) => frameWindow.requestAnimationFrame(resolve));
          };
          const tabButtonFor = (id) =>
            frameDoc.querySelector("[data-tab-target='" + id + "']");
          const clickTabAndWait = async (id) => {
            const button = tabButtonFor(id);
            if (!(button instanceof frameWindow.HTMLElement)) {
              return false;
            }
            button.click();
            await waitForReportFrame();
            return true;
          };
          const tabScrollMemory = await (async () => {
            const summaryBeforeLeaveY = Math.round(frameWindow.scrollY);
            const sourcesClicked = await clickTabAndWait("sources");
            const firstSourcesY = Math.round(frameWindow.scrollY);
            frameWindow.scrollTo(0, 780);
            await waitForReportFrame();
            const sourcesSavedY = Math.round(frameWindow.scrollY);
            const summaryClicked = await clickTabAndWait("summary");
            const restoredSummaryY = Math.round(frameWindow.scrollY);
            const sourcesReturned = await clickTabAndWait("sources");
            const restoredSourcesY = Math.round(frameWindow.scrollY);
            return {
              summaryBeforeLeaveY,
              firstSourcesY,
              sourcesSavedY,
              restoredSummaryY,
              restoredSourcesY,
              sourcesClicked,
              summaryClicked,
              sourcesReturned
            };
          })();

          return {
            before,
            after: {
              ...afterSummaryState,
              tabScrollMemory
            }
          };
        } finally {
          iframe.remove();
        }
      };
      const interactiveReportState = await collectInteractiveReportState();
      const textOf = (selector) => normalize(reportDoc.querySelector(selector)?.textContent);
      const headersFrom = (root) =>
        Array.from(root?.querySelectorAll("thead th") ?? []).map((cell) =>
          normalize(cell.textContent)
        );
      const rowsFrom = (root) =>
        Array.from(root?.querySelectorAll("tbody tr") ?? []).map((row) =>
          Array.from(row.querySelectorAll("td")).map((cell) => normalize(cell.textContent))
        );
      const headersIn = (selector) => headersFrom(reportDoc.querySelector(selector));
      const rowsIn = (selector) => rowsFrom(reportDoc.querySelector(selector));
      const tableForHeading = (containerSelector, headingText) => {
        const container = reportDoc.querySelector(containerSelector);
        const heading = Array.from(container?.querySelectorAll("h3") ?? []).find(
          (candidate) => normalize(candidate.textContent) === headingText
        );
        let sibling = heading?.nextElementSibling ?? null;
        while (sibling && !sibling.matches(".table-wrap")) {
          sibling = sibling.nextElementSibling;
        }
        return {
          headers: headersFrom(sibling),
          rows: rowsFrom(sibling)
        };
      };
      const headingTexts = (selector) =>
        Array.from(reportDoc.querySelectorAll(selector + " h3")).map((heading) =>
          normalize(heading.textContent)
        );
      const rawTabLabels = Array.from(reportDoc.querySelectorAll("[data-tab-target]")).map(
        (tab) => normalize(tab.textContent)
      );
      const tabLabels = rawTabLabels.map((label) => label.replace(/\\s*\\(.*\\)$/u, ""));
      const detailToggleLabels = Array.from(
        reportDoc.querySelectorAll(".evidence-detail-label")
      ).map((label) => normalize(label.textContent));
      const detailToggleControlCount = reportDoc.querySelectorAll(
        ".detail-toggle-control[for='evidence-detail-toggle']"
      ).length;
      const detailToggleToolbarCount = reportDoc.querySelectorAll(
        ".toolbar .detail-toggle-control[for='evidence-detail-toggle']"
      ).length;
      const detailToggleInputCount = reportDoc.querySelectorAll(
        "#evidence-detail-toggle[aria-label='Evidence Detail']"
      ).length;
      const fieldGuideTitles = Array.from(
        reportDoc.querySelectorAll("[data-field-guide='true'] h3")
      ).map((heading) => normalize(heading.textContent));
      const expectedFieldGuidePlacements = ${JSON.stringify(EXPECTED_FIELD_GUIDE_PLACEMENTS)};
      const fieldGuidePlacementForHeading = (
        containerSelector,
        headingText,
        expectedGuideTitle
      ) => {
        const container = reportDoc.querySelector(containerSelector);
        const heading = Array.from(container?.querySelectorAll("h3") ?? []).find(
          (candidate) => normalize(candidate.textContent) === headingText
        );
        const guide = heading?.nextElementSibling ?? null;
        const actualGuideTitle = guide?.matches("[data-field-guide='true']")
          ? normalize(guide.querySelector("h3")?.textContent)
          : "";
        return {
          containerSelector,
          headingText,
          expectedGuideTitle,
          actualGuideTitle,
          matches: actualGuideTitle === expectedGuideTitle
        };
      };
      const fieldGuidePlacements = expectedFieldGuidePlacements.map((placement) =>
        fieldGuidePlacementForHeading(placement[0], placement[1], placement[2])
      );
      const truthChipLabels = Array.from(reportDoc.querySelectorAll(".truth-chip")).map((chip) =>
        normalize(chip.textContent)
      );
      const sourceTruthChipLabels = Array.from(
        reportDoc.querySelectorAll("#sources .truth-chip")
      ).map((chip) => normalize(chip.textContent));
      const sourceLineageLabels = Array.from(
        reportDoc.querySelectorAll("#sources .lineage-label")
      ).map((label) => normalize(label.textContent));
      const sectionOutlinePanels = Array.from(
        reportDoc.querySelectorAll("[data-tab-panel] .section-outline")
      ).map((outline) => outline.closest("[data-tab-panel]")?.id ?? "");
      const summaryOutlineLabels = Array.from(
        reportDoc.querySelectorAll("#summary [data-section-outline-link='true']")
      ).map((link) => normalize(link.textContent));
      const sourcesOutlineLabels = Array.from(
        reportDoc.querySelectorAll("#sources [data-section-outline-link='true']")
      ).map((link) => normalize(link.textContent));
      const fieldGuideOutlineHits = Array.from(
        reportDoc.querySelectorAll("[data-section-outline-link='true']")
      )
        .map((link) => normalize(link.textContent))
        .filter((label) => /欄位解讀/u.test(label));
      const sectionOutlineHeaderCount =
        reportDoc.querySelectorAll(".section-outline__header").length;
      const tabPanelDirectHeadingCount = reportDoc.querySelectorAll(
        "[data-tab-panel] > h2"
      ).length;
      const resourceHits = performance
        .getEntriesByType("resource")
        .map((entry) => entry.name)
        .filter((name) => /celestrak\\.org/i.test(name));
      const reportTitle = normalize(reportDoc.querySelector("title")?.textContent);
      const reportHeading = normalize(reportDoc.querySelector("h1")?.textContent);
      const reportText = normalize(reportDoc.body?.textContent);
      const requirementCoverageTable = tableForHeading("#requirements", "Requirement coverage table");
      const sourceBoundaryTable = tableForHeading("#sources", "Source limits");
      const stationSourceTable = tableForHeading("#sources", "Station coordinate and elevation sources");
      const stationLineageTable = tableForHeading("#sources", "Station lineage");
      const stationRfProfileTable = tableForHeading("#sources", "Station RF profile gaps");
      const tleManifestTable = tableForHeading("#sources", "TLE source manifest");
      const inventoryTable = tableForHeading("#sources", "Runtime inventory");
      const satelliteLineageTable = tableForHeading("#sources", "Satellite / TLE lineage");
      const tleFreshnessTable = tableForHeading("#sources", "Orbit source freshness");
      const displayTransformTable = tableForHeading("#sources", "Display transforms");
      const atmosphericLookupTable = tableForHeading("#sources", "Atmospheric / rain lineage");
      const externalEvidenceTable = tableForHeading("#sources", "External evidence register");
      const missingEvidenceTable = tableForHeading("#sources", "Missing evidence register");
      const actorProvenanceTable = tableForHeading("#runtime", "Actor provenance");
      const visibilityProvenanceTable = tableForHeading("#runtime", "Visibility provenance");
      const assumptionsLimitsTable = tableForHeading("#models", "Assumptions and limits");
      const standardsReferenceTable = tableForHeading("#models", "Standards used");
      const policyTable = tableForHeading("#models", "Handover policy gates");

      return {
        route: window.location.pathname + window.location.search,
        sceneSourceMode: sceneState?.sceneSourceMode ?? null,
        report: {
          html: reportHtml,
          htmlLength: reportHtml.length,
          openArgs: fakeWindow.openArgs ?? null,
          focused,
          openerValue: fakeWindow._opener,
          filename: reportDoc.body?.dataset.reportFilename ?? null,
          title: reportTitle,
          heading: reportHeading,
          rawTabLabels,
          tabLabels,
          text: reportText,
          sourceHeadings: headingTexts("#sources"),
          modelHeadings: headingTexts("#models"),
          detailToggleLabels,
          detailToggleControlCount,
          detailToggleToolbarCount,
          detailToggleInputCount,
          interactive: interactiveReportState,
          fieldGuideTitles,
          fieldGuidePlacements,
          truthChipLabels,
          sourceTruthChipLabels,
          sourceLineageText: textOf("#sources [data-lineage-panel='true']"),
          sourceLineageLabels,
          sectionOutlinePanels,
          summaryOutlineLabels,
          sourcesOutlineLabels,
          fieldGuideOutlineHits,
          sectionOutlineHeaderCount,
          tabPanelDirectHeadingCount,
          summaryText: textOf("#summary"),
          requirementsText: textOf("#requirements"),
          requirementHeaders: requirementCoverageTable.headers,
          requirementRows: requirementCoverageTable.rows,
          visibilityText: textOf("#visibility"),
          handoverText: textOf("#handover"),
          sourcesText: textOf("#sources"),
          modelsText: textOf("#models"),
          runtimeText: textOf("#runtime"),
          sourceBoundaryRows: sourceBoundaryTable.rows,
          stationRows: stationSourceTable.rows,
          stationLineageHeaders: stationLineageTable.headers,
          stationLineageRows: stationLineageTable.rows,
          stationRfProfileHeaders: stationRfProfileTable.headers,
          stationRfProfileRows: stationRfProfileTable.rows,
          tleHeaders: tleManifestTable.headers,
          tleRows: tleManifestTable.rows,
          inventoryHeaders: inventoryTable.headers,
          inventoryRows: inventoryTable.rows,
          satelliteLineageHeaders: satelliteLineageTable.headers,
          satelliteLineageRows: satelliteLineageTable.rows,
          tleFreshnessRows: tleFreshnessTable.rows,
          displayTransformRows: displayTransformTable.rows,
          atmosphericLookupHeaders: atmosphericLookupTable.headers,
          atmosphericLookupRows: atmosphericLookupTable.rows,
          externalEvidenceHeaders: externalEvidenceTable.headers,
          externalEvidenceRows: externalEvidenceTable.rows,
          missingEvidenceHeaders: missingEvidenceTable.headers,
          missingEvidenceRows: missingEvidenceTable.rows,
          sourceGapRows: rowsIn("#sources [data-source-gap-table='true']"),
          assumptionsLimitsHeaders: assumptionsLimitsTable.headers,
          assumptionsLimitsRows: assumptionsLimitsTable.rows,
          standardsReferenceHeaders: standardsReferenceTable.headers,
          standardsReferenceRows: standardsReferenceTable.rows,
          modeledOutputCardsCount: (() => {
            const lists = Array.from(reportDoc.querySelectorAll("#models .model-cards-list"));
            return lists[0] ? lists[0].querySelectorAll(".model-card").length : 0;
          })(),
          policyRows: policyTable.rows,
          rfCardsCount: (() => {
            const lists = Array.from(reportDoc.querySelectorAll("#models .model-cards-list"));
            return lists[1] ? lists[1].querySelectorAll(".model-card").length : 0;
          })(),
          actorRows: actorProvenanceTable.rows,
          visibilityRows: visibilityProvenanceTable.rows,
          csv: csvCapture
        },
        panelDisclosures: {
          sourceBoundaryOpen:
            sourceBoundary instanceof HTMLDetailsElement ? sourceBoundary.open : null,
          sourceBoundaryText:
            sourceBoundary instanceof HTMLElement ? normalize(sourceBoundary.innerText) : "",
          sourceHelpTriggerCount: sourceBoundary?.querySelectorAll(
            ".v4-projection-side-panel__source-help-trigger"
          ).length ?? 0,
          sourceHelpOpen:
            sourceHelpPopover instanceof HTMLElement ? isVisible(sourceHelpPopover) : false,
          sourceHelpText:
            sourceHelpPopover instanceof HTMLElement ? normalize(sourceHelpPopover.innerText) : ""
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
  const visibilitySatelliteIds = new Set(
    dataCompleteness.visibilityProvenance.map((row) => row.satelliteId)
  );
  assert(
    dataCompleteness.actorProvenance.length === projection.actorCount &&
      // A satellite can legitimately have MORE than one pair-visibility window
      // (multiple mutual-visibility passes) within the time window. Actor
      // provenance is per-satellite (deduped); visibility provenance is
      // per-window, so visibility rows may exceed the actor count. Correct
      // invariant = coverage (>=) + a 1:1 satellite-set match, not strict count
      // equality (that assumed one window per satellite — only true for the
      // older curated fixture; richer/refreshed data has multi-pass satellites).
      dataCompleteness.visibilityProvenance.length >= projection.actorCount &&
      visibilitySatelliteIds.size === projection.actorCount &&
      projection.actorCount > 0 &&
      projection.linkFlowCueCount > 0 &&
      projection.eventCueCount > 0,
    `Actor and visibility provenance must cover the selected-pair overlay actors: ${JSON.stringify(
      {
        actorCount: projection.actorCount,
        actorProvenance: dataCompleteness.actorProvenance.length,
        visibilityProvenance: dataCompleteness.visibilityProvenance.length,
        visibilitySatellites: visibilitySatelliteIds.size,
        linkFlowCueCount: projection.linkFlowCueCount,
        eventCueCount: projection.eventCueCount
      }
    )}`
  );
}

function collectCellMismatches(row, expectedCells) {
  return expectedCells
    .map(({ index, label, value }) => {
      const actual = row[index] ?? "";
      const expected = String(value ?? "");
      return actual === expected ? null : { label, expected, actual };
    })
    .filter(Boolean);
}

function collectTleManifestMismatches(report, dataCompleteness) {
  if (!dataCompleteness) {
    return [{ reason: "missing dataCompleteness" }];
  }

  return dataCompleteness.tleSources.flatMap((source) => {
    const row = report.tleRows.find((candidate) => candidate[0] === source.sourceId);
    if (!row) {
      return [{ sourceId: source.sourceId, reason: "missing TLE manifest row" }];
    }

    return collectCellMismatches(row, [
      { index: 1, label: "orbitClass", value: source.orbitClass },
      { index: 3, label: "recordCount", value: source.recordCount },
      { index: 4, label: "acceptedRecordCount", value: source.acceptedRecordCount },
      { index: 5, label: "rejectedRecordCount", value: source.rejectedRecordCount },
      { index: 6, label: "parserFailureCount", value: source.parserFailureCount ?? "" },
      { index: 7, label: "capApplied", value: source.capApplied ?? "" },
      { index: 8, label: "health", value: source.health }
    ]).map((mismatch) => ({ sourceId: source.sourceId, ...mismatch }));
  });
}

function collectInventoryMismatches(report, dataCompleteness) {
  if (!dataCompleteness) {
    return [{ reason: "missing dataCompleteness" }];
  }

  return Object.values(dataCompleteness.runtimeInventoryDisclosure.perOrbit).flatMap(
    (inventory) => {
      const row = report.inventoryRows.find(
        (candidate) => candidate[0] === inventory.orbitClass
      );
      if (!row) {
        return [
          { orbitClass: inventory.orbitClass, reason: "missing runtime inventory row" }
        ];
      }

      return collectCellMismatches(row, [
        { index: 2, label: "activeInventoryCount", value: inventory.activeInventoryCount },
        { index: 3, label: "acceptedRecordCount", value: inventory.acceptedRecordCount },
        { index: 4, label: "runtimeCap", value: inventory.runtimeCap },
        { index: 5, label: "cappedAtRuntime", value: inventory.cappedAtRuntime },
        { index: 6, label: "visibleActorCount", value: inventory.visibleActorCount }
      ]).map((mismatch) => ({
        orbitClass: inventory.orbitClass,
        ...mismatch
      }));
    }
  );
}

function collectSatelliteLineageMismatches(report, dataCompleteness) {
  if (!dataCompleteness) {
    return [{ reason: "missing dataCompleteness" }];
  }

  return dataCompleteness.tleSources.flatMap((source) => {
    const inventory =
      dataCompleteness.runtimeInventoryDisclosure.perOrbit[source.orbitClass];
    const row = report.satelliteLineageRows.find(
      (candidate) => candidate[0] === source.orbitClass
    );
    if (!row) {
      return [
        { orbitClass: source.orbitClass, reason: "missing satellite lineage row" }
      ];
    }

    return collectCellMismatches(row, [
      { index: 2, label: "sourceId", value: source.sourceId },
      { index: 5, label: "recordCount", value: source.recordCount },
      { index: 6, label: "acceptedRecordCount", value: source.acceptedRecordCount },
      { index: 7, label: "rejectedRecordCount", value: source.rejectedRecordCount },
      { index: 8, label: "parserFailureCount", value: source.parserFailureCount ?? "" },
      { index: 10, label: "runtimeCap", value: inventory.runtimeCap },
      {
        index: 11,
        label: "cappedAtRuntime",
        value: inventory.cappedAtRuntime ? "yes" : "no"
      },
      { index: 12, label: "visibleActorCount", value: inventory.visibleActorCount }
    ]).map((mismatch) => ({
      orbitClass: source.orbitClass,
      ...mismatch
    }));
  });
}

function collectDisplayTransformMismatches(report, dataCompleteness) {
  if (!dataCompleteness) {
    return [{ reason: "missing dataCompleteness" }];
  }

  return dataCompleteness.displayTransforms.flatMap((transform) => {
    const row = report.displayTransformRows.find(
      (candidate) => candidate[0] === transform.sourceId
    );
    if (!row) {
      return [{ sourceId: transform.sourceId, reason: "missing display transform row" }];
    }

    const mismatches = [];
    if (!row[1]?.includes(transform.truthClass)) {
      mismatches.push({
        label: "truthClass",
        expected: transform.truthClass,
        actual: row[1] ?? ""
      });
    }
    if (!row[1]?.includes("Display transform")) {
      mismatches.push({
        label: "truthChip",
        expected: "Display transform",
        actual: row[1] ?? ""
      });
    }
    if (row[3] !== transform.nonClaim) {
      mismatches.push({
        label: "nonClaim",
        expected: transform.nonClaim,
        actual: row[3] ?? ""
      });
    }
    return mismatches.map((mismatch) => ({
      sourceId: transform.sourceId,
      ...mismatch
    }));
  });
}

function collectAtmosphericLookupMismatches(report, dataCompleteness) {
  if (!dataCompleteness) {
    return [{ reason: "missing dataCompleteness" }];
  }

  return dataCompleteness.atmosphericLookups.flatMap((lookup) => {
    const row = report.atmosphericLookupRows.find(
      (candidate) => candidate[0] === lookup.source
    );
    if (!row) {
      return [{ source: lookup.source, reason: "missing atmospheric lookup row" }];
    }

    const mismatches = collectCellMismatches(row, [
      { index: 2, label: "midpointLatDeg", value: lookup.midpointLatDeg ?? "" },
      { index: 3, label: "midpointLonDeg", value: lookup.midpointLonDeg ?? "" },
      { index: 4, label: "cellLatDeg", value: lookup.cellLatDeg ?? "" },
      { index: 5, label: "cellLonDeg", value: lookup.cellLonDeg ?? "" },
      { index: 6, label: "lookupValue", value: lookup.lookupValue ?? "unavailable" },
      { index: 7, label: "lookupUnit", value: lookup.lookupUnit ?? "" },
      { index: 8, label: "interpolation", value: lookup.interpolation },
      { index: 9, label: "provenanceSourceId", value: lookup.provenance.sourceId ?? "" },
      { index: 10, label: "provenanceNonClaim", value: lookup.provenance.nonClaim ?? "" }
    ]);

    if (!row[1]?.includes(lookup.provenance.truthClass)) {
      mismatches.push({
        label: "truthClass",
        expected: lookup.provenance.truthClass,
        actual: row[1] ?? ""
      });
    }
    if (lookup.lookupValue === null && !row[1]?.includes("Source gap")) {
      mismatches.push({
        label: "lookupSourceGapChip",
        expected: "Source gap",
        actual: row[1] ?? ""
      });
    }

    return mismatches.map((mismatch) => ({
      source: lookup.source,
      ...mismatch
    }));
  });
}

function collectStationLineageMismatches(report, dataCompleteness) {
  if (!dataCompleteness) {
    return [{ reason: "missing dataCompleteness" }];
  }

  return dataCompleteness.stationPrecision.flatMap((station) => {
    const row = report.stationLineageRows.find(
      (candidate) => candidate[0] === station.stationId
    );
    if (!row) {
      return [{ stationId: station.stationId, reason: "missing station lineage row" }];
    }

    const mismatches = collectCellMismatches(row, [
      { index: 2, label: "coordinateSourceAuthority", value: station.coordinateSourceAuthority },
      { index: 3, label: "coordinateSourceUrl", value: station.coordinateSourceUrl ?? "" },
      { index: 4, label: "coordinateSourceNote", value: station.coordinateSourceNote },
      { index: 5, label: "rawLatLon", value: `${station.rawLat}, ${station.rawLon}` },
      { index: 6, label: "coordinateUse", value: station.coordinateUse },
      { index: 8, label: "elevationSourceId", value: station.elevationSourceId },
      {
        index: 10,
        label: "elevationDataset",
        value: station.elevationDatasetVersion
          ? `${station.elevationDatasetId} / ${station.elevationDatasetVersion}`
          : station.elevationDatasetId
      },
      { index: 12, label: "terrainMaskDeg", value: `${station.terrainMaskDeg} deg` },
      {
        index: 14,
        label: "effectiveElevationThresholdDeg",
        value: station.effectiveElevationThresholdDeg
      }
    ]);

    const expectedRenderLabel = station.renderPositionIsSourceTruth
      ? "source-coordinate"
      : "representative-coordinate";
    const expectedRenderChip = station.renderPositionIsSourceTruth
      ? "Public source"
      : "Display transform";
    const expectedTerrainDefault = `default=${
      station.terrainMaskIsDefault ? "yes" : "no"
    }`;

    if (!row[1]?.includes(station.provenance.truthClass)) {
      mismatches.push({
        label: "coordinateTruthClass",
        expected: station.provenance.truthClass,
        actual: row[1] ?? ""
      });
    }
    if (!row[7]?.includes(expectedRenderLabel) || !row[7]?.includes(expectedRenderChip)) {
      mismatches.push({
        label: "renderPositionTruth",
        expected: `${expectedRenderLabel} / ${expectedRenderChip}`,
        actual: row[7] ?? ""
      });
    }
    if (!row[9]?.includes(station.elevationProvenanceStatus)) {
      mismatches.push({
        label: "elevationProvenanceStatus",
        expected: station.elevationProvenanceStatus,
        actual: row[9] ?? ""
      });
    }
    if (
      station.elevationProvenanceStatus !== "dem-provenance-complete" &&
      !row[9]?.includes("Source gap")
    ) {
      mismatches.push({
        label: "elevationSourceGapChip",
        expected: "Source gap",
        actual: row[9] ?? ""
      });
    }
    for (const snippet of [
      `kind=${station.elevationSourceKind}`,
      `resolution=${station.elevationDatasetResolutionM ?? "n/a"}`,
      `datum=${station.elevationVerticalDatum ?? "n/a"}`,
      `method=${station.elevationSamplingMethod}`,
      `license=${station.elevationLicenseId}`
    ]) {
      if (!row[11]?.includes(snippet)) {
        mismatches.push({
          label: "demDetail",
          expected: snippet,
          actual: row[11] ?? ""
        });
      }
    }
    if (
      !row[13]?.includes(station.terrainMaskSourceId) ||
      !row[13]?.includes(expectedTerrainDefault)
    ) {
      mismatches.push({
        label: "terrainMaskSource",
        expected: `${station.terrainMaskSourceId}; ${expectedTerrainDefault}`,
        actual: row[13] ?? ""
      });
    }
    if (station.terrainMaskIsDefault && !row[13]?.includes("Source gap")) {
      mismatches.push({
        label: "terrainMaskSourceGapChip",
        expected: "Source gap",
        actual: row[13] ?? ""
      });
    }

    return mismatches.map((mismatch) => ({
      stationId: station.stationId,
      ...mismatch
    }));
  });
}

function collectStationRfProfileMismatches(report, dataCompleteness) {
  if (!dataCompleteness) {
    return [{ reason: "missing dataCompleteness" }];
  }

  return dataCompleteness.stationRfProfiles.flatMap((profile) => {
    const row = report.stationRfProfileRows.find(
      (candidate) => candidate[0] === profile.stationId
    );
    if (!row) {
      return [{ stationId: profile.stationId, reason: "missing station RF row" }];
    }

    const mismatches = collectCellMismatches(row, [
      { index: 2, label: "elevationSourceId", value: profile.elevationSourceId },
      { index: 4, label: "antennaDiameterM", value: profile.antennaDiameterM ?? "unavailable" },
      { index: 6, label: "peakEirpDbm", value: profile.peakEirpDbm ?? "unavailable" },
      { index: 8, label: "txPolarization", value: profile.txPolarization ?? "unavailable" },
      { index: 10, label: "nonClaim", value: profile.provenance.nonClaim ?? "Station RF hardware profile is not available." }
    ]);

    if (!row[1]?.includes(profile.provenance.truthClass)) {
      mismatches.push({
        label: "truthClass",
        expected: profile.provenance.truthClass,
        actual: row[1] ?? ""
      });
    }
    if (!row[3]?.includes(profile.terrainMaskSourceId)) {
      mismatches.push({
        label: "terrainMaskSourceId",
        expected: profile.terrainMaskSourceId,
        actual: row[3] ?? ""
      });
    }
    for (const [index, label, value, sourceId] of [
      [5, "antennaDiameterSourceId", profile.antennaDiameterM, profile.antennaDiameterSourceId],
      [7, "peakEirpSourceId", profile.peakEirpDbm, profile.peakEirpSourceId],
      [9, "txPolarizationSourceId", profile.txPolarization, profile.txPolarizationSourceId]
    ]) {
      if (!row[index]?.includes(sourceId)) {
        mismatches.push({
          label,
          expected: sourceId,
          actual: row[index] ?? ""
        });
      }
      if ((value === null || sourceId.startsWith("unavailable")) && !row[index]?.includes("Source gap")) {
        mismatches.push({
          label: `${label}SourceGapChip`,
          expected: "Source gap",
          actual: row[index] ?? ""
        });
      }
    }

    return mismatches.map((mismatch) => ({
      stationId: profile.stationId,
      ...mismatch
    }));
  });
}

function assertReportSourcePackage(state) {
  const report = state.report;
  const dataCompleteness = state.projection?.dataCompleteness;
  const reportActionUrl = parseReportActionUrl(report.openArgs?.url);
  const requestUrl = new URL(REQUEST_PATH, "http://selected-pair-report.test");
  const missingTabs = EXPECTED_REPORT_TABS.filter(
    (label) => !report.tabLabels.includes(label)
  );
  const countedTabLabels = (report.rawTabLabels ?? []).filter((label) => /\(\d+\)/u.test(label));
  const missingSourceHeadings = EXPECTED_SOURCE_HEADINGS.filter(
    (heading) => !report.sourceHeadings.includes(heading)
  );
  const missingOutlineTabs = EXPECTED_OUTLINE_TABS.filter(
    (tabId) => !report.sectionOutlinePanels.includes(tabId)
  );
  const missingSourcesOutlineLabels = EXPECTED_SOURCES_OUTLINE_LABELS.filter(
    (label) => !report.sourcesOutlineLabels.includes(label)
  );
  const missingModelHeadings = EXPECTED_MODEL_HEADINGS.filter(
    (heading) => !report.modelHeadings.includes(heading)
  );
  const missingDetailToggleLabels = EXPECTED_DETAIL_TOGGLE_LABELS.filter(
    (label) => !report.detailToggleLabels.includes(label)
  );
  const missingFieldGuideTitles = EXPECTED_FIELD_GUIDE_TITLES.filter(
    (title) => !report.fieldGuideTitles.includes(title)
  );
  const missingFieldGuidePlacements = report.fieldGuidePlacements.filter(
    (placement) => !placement.matches
  );
  const missingFieldGuideText = EXPECTED_FIELD_GUIDE_TEXT.filter(
    (snippet) => !report.text.includes(snippet)
  );
  const missingSummaryDetailPanelText = EXPECTED_SUMMARY_DETAIL_PANEL_TEXT.filter(
    (snippet) => !report.interactive?.after?.summaryDetailText?.includes(snippet)
  );
  const missingSummaryFieldGuideTitles = EXPECTED_SUMMARY_FIELD_GUIDE_TITLES.filter(
    (title) => !report.interactive?.after?.fieldGuideTitles?.includes(title)
  );
  const missingTruthChips = EXPECTED_TRUTH_CHIPS.filter(
    (label) => !report.truthChipLabels.includes(label)
  );
  const missingRequirementHeaders = EXPECTED_REQUIREMENT_HEADERS.filter(
    (header) => !report.requirementHeaders.includes(header)
  );
  const missingRequirementRows = EXPECTED_REQUIREMENT_ROW_IDS.filter(
    (id) => !report.requirementRows.some((row) => row[1] === id)
  );
  const missingRequirementText = EXPECTED_REQUIREMENT_TEXT.filter(
    (snippet) => !report.requirementsText.includes(snippet)
  );
  const missingSourceTruthChips = EXPECTED_SOURCE_TRUTH_CHIPS.filter(
    (label) => !report.sourceTruthChipLabels.includes(label)
  );
  const missingStationLineageText = EXPECTED_STATION_LINEAGE_TEXT.filter(
    (snippet) => !report.sourcesText.includes(snippet)
  );
  const missingStationLineageHeaders = EXPECTED_STATION_LINEAGE_HEADERS.filter(
    (header) => !report.stationLineageHeaders.includes(header)
  );
  const missingStationRfHeaders = EXPECTED_STATION_RF_HEADERS.filter(
    (header) => !report.stationRfProfileHeaders.includes(header)
  );
  const missingAtmosphericLineageText = EXPECTED_ATMOSPHERIC_LINEAGE_TEXT.filter(
    (snippet) => !report.sourcesText.includes(snippet)
  );
  const missingAtmosphericHeaders = EXPECTED_ATMOSPHERIC_HEADERS.filter(
    (header) => !report.atmosphericLookupHeaders.includes(header)
  );
  const missingSatelliteLineageText = EXPECTED_SATELLITE_LINEAGE_TEXT.filter(
    (snippet) => !report.sourcesText.includes(snippet)
  );
  const missingTleParseHeaders = EXPECTED_TLE_PARSE_HEADERS.filter(
    (header) => !report.tleHeaders.includes(header)
  );
  const missingSatelliteLineageHeaders = EXPECTED_SATELLITE_LINEAGE_HEADERS.filter(
    (header) => !report.satelliteLineageHeaders.includes(header)
  );
  const missingRuntimeCapHeaders = EXPECTED_RUNTIME_CAP_HEADERS.filter(
    (header) =>
      !report.inventoryHeaders.includes(header) ||
      !report.satelliteLineageHeaders.includes(header)
  );
  const missingSourceGapFields = EXPECTED_SOURCE_GAP_FIELDS.filter(
    (field) => !report.sourceGapRows.some((row) => row[0] === field)
  );
  const missingExternalEvidenceHeaders = EXPECTED_EXTERNAL_EVIDENCE_HEADERS.filter(
    (header) => !report.externalEvidenceHeaders.includes(header)
  );
  const missingExternalEvidenceIds = EXPECTED_EXTERNAL_EVIDENCE_IDS.filter(
    (id) => !report.externalEvidenceRows.some((row) => row[0] === id)
  );
  const missingMissingEvidenceHeaders = EXPECTED_MISSING_EVIDENCE_HEADERS.filter(
    (header) => !report.missingEvidenceHeaders.includes(header)
  );
  const missingMissingEvidenceIds = EXPECTED_MISSING_EVIDENCE_IDS.filter(
    (id) => !report.missingEvidenceRows.some((row) => row[0] === id)
  );
  const missingStandards = EXPECTED_STANDARD_TEXT.filter(
    (snippet) => !report.modelsText.includes(snippet)
  );
  const missingAssumptionsLimitsHeaders = EXPECTED_ASSUMPTIONS_LIMITS_HEADERS.filter(
    (header) => !report.assumptionsLimitsHeaders.includes(header)
  );
  const missingStandardsReferenceHeaders = EXPECTED_STANDARDS_REFERENCE_HEADERS.filter(
    (header) => !report.standardsReferenceHeaders.includes(header)
  );
  const missingAssumptionsLimitItems = ["Metric anchor", "Runtime inventory"].filter(
    (item) => !report.assumptionsLimitsRows.some((row) => row[0] === item)
  );
  const expectedAssumptionsLimitsMinimumRows =
    (dataCompleteness?.pairSourceAttribution?.nonClaims.length ?? 0) + 2;
  const expectedStandardsReferenceMinimumRows =
    (dataCompleteness?.modeledOutputs ?? []).reduce(
      (count, output) => count + output.standardsRef.length,
      3
    );
  const claimHits = collectPositiveClaimHits(report.text);
  const csvClaimHits = collectPositiveClaimHits(report.csv?.text ?? "");
  const reportWorklogHits = FORBIDDEN_REPORT_WORKLOG_PHRASES.filter((phrase) =>
    report.text.toLowerCase().includes(phrase.toLowerCase())
  );
  const tleManifestMismatches = collectTleManifestMismatches(
    report,
    dataCompleteness
  );
  const inventoryMismatches = collectInventoryMismatches(report, dataCompleteness);
  const satelliteLineageMismatches = collectSatelliteLineageMismatches(
    report,
    dataCompleteness
  );
  const stationLineageMismatches = collectStationLineageMismatches(
    report,
    dataCompleteness
  );
  const stationRfProfileMismatches = collectStationRfProfileMismatches(
    report,
    dataCompleteness
  );
  const displayTransformMismatches = collectDisplayTransformMismatches(
    report,
    dataCompleteness
  );
  const atmosphericLookupMismatches = collectAtmosphericLookupMismatches(
    report,
    dataCompleteness
  );

  assert(
    report.openArgs?.target === "_blank" &&
      report.focused === true &&
      report.openerValue === null &&
      report.htmlLength > 20_000 &&
      /^runtime-projection-evidence-/.test(report.filename ?? "") &&
      !report.title.includes("Selected-pair evidence report") &&
      !report.heading.includes("Selected-pair evidence report") &&
      report.title.length > 0 &&
      /^[A-Z]{2} .+ - [A-Z]{2} .+$/.test(report.title) &&
      !report.title.includes(" to ") &&
      report.heading === report.title,
    `Report action must generate a standalone selected-pair source report: ${JSON.stringify(
      {
        openArgs: report.openArgs,
        focused: report.focused,
        openerValue: report.openerValue,
        htmlLength: report.htmlLength,
        filename: report.filename,
        title: report.title,
        heading: report.heading
      }
    )}`
  );
  assert(
    reportActionUrl.pathname === "/report" &&
      reportActionUrl.searchParams.get("stationA") === EXPECTED_STATION_IDS[0] &&
      reportActionUrl.searchParams.get("stationB") === EXPECTED_STATION_IDS[1] &&
      reportActionUrl.searchParams.get("startUtc") ===
        requestUrl.searchParams.get("startUtc") &&
      reportActionUrl.searchParams.get("durationMinutes") ===
        requestUrl.searchParams.get("durationMinutes") &&
      reportActionUrl.searchParams.get("policy") === "demo-balanced-v1" &&
      reportActionUrl.searchParams.get("rainRateMmPerHour") === "0",
    `Report action URL must preserve selected-pair projection inputs for route recompute: ${JSON.stringify(
      {
        url: report.openArgs?.url,
        parsed: {
          pathname: reportActionUrl.pathname,
          stationA: reportActionUrl.searchParams.get("stationA"),
          stationB: reportActionUrl.searchParams.get("stationB"),
          startUtc: reportActionUrl.searchParams.get("startUtc"),
          durationMinutes: reportActionUrl.searchParams.get("durationMinutes"),
          policy: reportActionUrl.searchParams.get("policy"),
          rainRateMmPerHour: reportActionUrl.searchParams.get("rainRateMmPerHour")
        }
      }
    )}`
  );
  assert(
    missingTabs.length === 0 &&
      countedTabLabels.length === 0 &&
      missingSourceHeadings.length === 0 &&
      missingOutlineTabs.length === 0 &&
      missingSourcesOutlineLabels.length === 0 &&
      report.sectionOutlineHeaderCount === 0 &&
      report.tabPanelDirectHeadingCount === 0 &&
      report.fieldGuideOutlineHits.length === 0 &&
      report.summaryOutlineLabels.includes("Communication by orbit") &&
      !report.summaryOutlineLabels.includes("Citations and Physical Formulas") &&
      missingModelHeadings.length === 0 &&
      missingDetailToggleLabels.length === 0 &&
      report.detailToggleControlCount === 1 &&
      report.detailToggleToolbarCount === 1 &&
      report.detailToggleInputCount === 1 &&
      missingFieldGuideTitles.length === 0 &&
      missingFieldGuidePlacements.length === 0 &&
      missingFieldGuideText.length === 0 &&
      missingTruthChips.length === 0 &&
      missingRequirementHeaders.length === 0 &&
      missingRequirementRows.length === 0 &&
      missingRequirementText.length === 0 &&
      report.requirementRows.length === EXPECTED_REQUIREMENT_ROW_IDS.length &&
      missingAssumptionsLimitsHeaders.length === 0 &&
      missingStandardsReferenceHeaders.length === 0 &&
      missingAssumptionsLimitItems.length === 0 &&
      missingStandards.length === 0,
    `Report must expose source, model, and raw-data sections: ${JSON.stringify({
      missingTabs,
      tabs: report.tabLabels,
      rawTabs: report.rawTabLabels,
      countedTabLabels,
      missingSourceHeadings,
      sourceHeadings: report.sourceHeadings,
      missingOutlineTabs,
      sectionOutlinePanels: report.sectionOutlinePanels,
      missingSourcesOutlineLabels,
      sourcesOutlineLabels: report.sourcesOutlineLabels,
      sectionOutlineHeaderCount: report.sectionOutlineHeaderCount,
      tabPanelDirectHeadingCount: report.tabPanelDirectHeadingCount,
      fieldGuideOutlineHits: report.fieldGuideOutlineHits,
      summaryOutlineLabels: report.summaryOutlineLabels,
      missingModelHeadings,
      modelHeadings: report.modelHeadings,
      missingDetailToggleLabels,
      detailToggleLabels: report.detailToggleLabels,
      detailToggleControlCount: report.detailToggleControlCount,
      detailToggleToolbarCount: report.detailToggleToolbarCount,
      detailToggleInputCount: report.detailToggleInputCount,
      missingFieldGuideTitles,
      fieldGuideTitles: report.fieldGuideTitles,
      missingFieldGuidePlacements,
      missingFieldGuideText,
      missingTruthChips,
      truthChipLabels: report.truthChipLabels,
      missingRequirementHeaders,
      requirementHeaders: report.requirementHeaders,
      missingRequirementRows,
      requirementRows: report.requirementRows.map((row) => row[1]),
      missingRequirementText,
      requirementRowsLength: report.requirementRows.length,
      expectedRequirementRowsLength: EXPECTED_REQUIREMENT_ROW_IDS.length,
      missingAssumptionsLimitsHeaders,
      assumptionsLimitsHeaders: report.assumptionsLimitsHeaders,
      missingStandardsReferenceHeaders,
      standardsReferenceHeaders: report.standardsReferenceHeaders,
      missingAssumptionsLimitItems,
      assumptionsLimitsRows: report.assumptionsLimitsRows,
      missingStandards
    })}`
  );
  assert(
    missingSourceTruthChips.length === 0 &&
      missingStationLineageText.length === 0 &&
      missingStationLineageHeaders.length === 0 &&
      missingStationRfHeaders.length === 0 &&
      missingAtmosphericLineageText.length === 0 &&
      missingAtmosphericHeaders.length === 0 &&
      missingSatelliteLineageText.length === 0 &&
      missingTleParseHeaders.length === 0 &&
      missingSatelliteLineageHeaders.length === 0 &&
      missingRuntimeCapHeaders.length === 0 &&
      missingSourceGapFields.length === 0 &&
      missingExternalEvidenceHeaders.length === 0 &&
      missingExternalEvidenceIds.length === 0 &&
      missingMissingEvidenceHeaders.length === 0 &&
      missingMissingEvidenceIds.length === 0,
    `Report sources tab must expose Satellite/TLE lineage, parse counts, runtime caps, display transforms, external evidence, and source gaps: ${JSON.stringify(
      {
        missingSourceTruthChips,
        sourceTruthChipLabels: report.sourceTruthChipLabels,
        missingStationLineageText,
        missingStationLineageHeaders,
        stationLineageHeaders: report.stationLineageHeaders,
        missingStationRfHeaders,
        stationRfProfileHeaders: report.stationRfProfileHeaders,
        missingAtmosphericLineageText,
        missingAtmosphericHeaders,
        atmosphericLookupHeaders: report.atmosphericLookupHeaders,
        missingSatelliteLineageText,
        sourceLineageLabels: report.sourceLineageLabels,
        sourceLineageText: report.sourceLineageText,
        missingTleParseHeaders,
        tleHeaders: report.tleHeaders,
        missingSatelliteLineageHeaders,
        satelliteLineageHeaders: report.satelliteLineageHeaders,
        missingRuntimeCapHeaders,
        inventoryHeaders: report.inventoryHeaders,
        missingSourceGapFields,
        sourceGapRows: report.sourceGapRows,
        missingExternalEvidenceHeaders,
        externalEvidenceHeaders: report.externalEvidenceHeaders,
        missingExternalEvidenceIds,
        externalEvidenceRows: report.externalEvidenceRows,
        missingMissingEvidenceHeaders,
        missingEvidenceHeaders: report.missingEvidenceHeaders,
        missingMissingEvidenceIds,
        missingEvidenceRows: report.missingEvidenceRows
      }
    )}`
  );
  assert(
    report.summaryText.includes("Requirement evidence map") &&
      report.summaryText.includes("R1-F3 / R1-D3") &&
      report.summaryText.includes("R1-F4 / K-E4 / V-MO1") &&
      report.summaryText.includes("K-E6") &&
      report.summaryText.includes("R1-F5") &&
      report.summaryText.includes("HTML + CSV") &&
      report.summaryText.includes("Summary evidence map") &&
      report.summaryText.includes("Station lineage") &&
      report.summaryText.includes("Known gaps") &&
      /model|Model|模型/.test(report.summaryText),
    `Report summary must map requirement IDs to modeled evidence without acceptance overclaim: ${JSON.stringify(
      {
        summaryText: report.summaryText.slice(0, 1200)
      }
    )}`
  );
  const tabScrollMemory = report.interactive?.after?.tabScrollMemory ?? {};
  assert(
    !report.interactive?.error &&
      report.interactive?.before?.detailToggleChecked === false &&
      report.interactive?.after?.detailToggleChecked === true &&
      report.interactive.before.toolbarPosition === "sticky" &&
      report.interactive.before.toggleVisibleInToolbar === true &&
      (report.interactive.before.toolbarHeight ?? 999) <= 64 &&
      (report.interactive.before.reportHeaderHeight ?? 999) <= 86 &&
      (report.interactive.before.tabFontSizePx ?? 0) >= 16 &&
      (report.interactive.before.searchFontSizePx ?? 0) >= 16 &&
      (report.interactive.before.toggleLabelFontSizePx ?? 0) >= 16 &&
      (report.interactive.before.activeOutline?.count ?? 0) <= 1 &&
      ((report.interactive.before.activeOutline?.count ?? 0) === 0 ||
        (report.interactive.before.activeOutline?.ariaCurrent === "location" &&
          (report.interactive.before.activeOutline?.fontSizePx ?? 0) >= 16)) &&
      report.interactive.after.toggleVisibleInToolbarAfterScroll === true &&
      Math.abs(report.interactive.after.toolbarTopAfterScroll ?? 999) <= 1 &&
      report.interactive.after.activeOutline?.count === 1 &&
      report.interactive.after.activeOutline?.ariaCurrent === "location" &&
      (report.interactive.after.activeOutline?.fontSizePx ?? 0) >= 16 &&
      report.interactive.after.activeOutline?.text ===
        report.interactive.after.expectedActiveOutlineText &&
      report.interactive.before.summaryDetailPanelVisibleCount === 0 &&
      report.interactive.before.summaryFieldGuideVisibleCount === 0 &&
      !/[\u4e00-\u9fff]/u.test(report.interactive.before.visibleChineseText ?? "") &&
      report.interactive.after.summaryDetailPanelVisibleCount >= 8 &&
      report.interactive.after.summaryFieldGuideVisibleCount >= 3 &&
      /[\u4e00-\u9fff]/u.test(report.interactive.after.visibleChineseText ?? "") &&
      report.interactive.before.summarySourceIssueVisibleCount >= 2 &&
      report.interactive.after.summarySourceIssueVisibleCount >= 2 &&
      report.interactive.after.summarySourceIssueAriaCount >= 2 &&
      (report.interactive.after.summaryDetailDdFontSizePx ?? 0) >= 16 &&
      (report.interactive.after.summaryFieldGuideCellFontSizePx ?? 0) >= 16 &&
      report.interactive.after.summaryExplanationOverflowCount === 0 &&
      tabScrollMemory.sourcesClicked === true &&
      tabScrollMemory.summaryClicked === true &&
      tabScrollMemory.sourcesReturned === true &&
      (tabScrollMemory.summaryBeforeLeaveY ?? 0) > 0 &&
      (tabScrollMemory.sourcesSavedY ?? 0) > 300 &&
      (tabScrollMemory.firstSourcesY ?? 999) <= 4 &&
      Math.abs(
        (tabScrollMemory.restoredSummaryY ?? -999) -
          (tabScrollMemory.summaryBeforeLeaveY ?? 999)
      ) <= 24 &&
      Math.abs(
        (tabScrollMemory.restoredSourcesY ?? -999) -
          (tabScrollMemory.sourcesSavedY ?? 999)
      ) <= 24 &&
      missingSummaryDetailPanelText.length === 0 &&
      missingSummaryFieldGuideTitles.length === 0,
    `Evidence Detail must reveal nearby Summary explanations and source issue affordances: ${JSON.stringify(
      {
        interactive: report.interactive,
        missingSummaryDetailPanelText,
        missingSummaryFieldGuideTitles
      }
    )}`
  );
  assert(
    report.sourcesText.includes(EXPECTED_SOURCE_TIER) &&
      report.sourcesText.includes(EXPECTED_EVIDENCE_KIND) &&
      report.sourcesText.includes("TLE source manifest") &&
      report.sourcesText.includes("Runtime inventory") &&
      report.sourcesText.includes("Source ledger") &&
      report.sourcesText.includes("External evidence register") &&
      report.sourcesText.includes("Missing evidence register") &&
      report.sourcesText.includes("selected-pair-external-source-reconciliation") &&
      report.sourcesText.includes("external-source-reconciliation.md") &&
      report.sourcesText.includes("phase7-0-24h-soak") &&
      report.sourcesText.includes("final-written-report-package") &&
      report.sourcesText.includes("Source gaps") &&
      report.sourceGapRows.length >= 3 &&
      report.externalEvidenceRows.length === EXPECTED_EXTERNAL_EVIDENCE_IDS.length &&
      report.missingEvidenceRows.length === EXPECTED_MISSING_EVIDENCE_IDS.length &&
      report.visibilityText.includes("Visibility lineage") &&
      report.visibilityText.includes("Display transform") &&
      report.visibilityText.includes("Station-side inputs") &&
      EXPECTED_STATION_IDS.every((stationId) => report.visibilityText.includes(stationId)) &&
      report.handoverText.includes("Handover lineage") &&
      report.handoverText.includes("Station-side inputs") &&
      report.handoverText.includes("Missing packet trace") &&
      report.modelsText.includes("Model lineage") &&
      report.modelsText.includes("Assumptions and limits") &&
      report.modelsText.includes("Limit / assumption") &&
      report.modelsText.includes("Not evidence of") &&
      report.modelsText.includes("Standards used") &&
      report.modelsText.includes("Standards-derived") &&
      report.modelsText.includes("Station inputs") &&
      (report.modelsText.includes("station-specific RF hardware facts") ||
        report.modelsText.includes("站點專屬 RF 事實")) &&
      report.modelsText.toLowerCase().includes("modeled") &&
      (report.modelsText.toLowerCase().includes("not measured") ||
        report.modelsText.includes("不是 measured") ||
        report.modelsText.includes("不是實測服務資料")) &&
      report.runtimeText.includes("sourceMode") &&
      report.runtimeText.includes(EXPECTED_SCENE_SOURCE_MODE),
    `Report text must carry source-tier, TLE, inventory, model, and raw JSON evidence: ${JSON.stringify(
      {
        sourcesText: report.sourcesText.slice(0, 800),
        sourceGapRows: report.sourceGapRows,
        externalEvidenceRows: report.externalEvidenceRows,
        missingEvidenceRows: report.missingEvidenceRows,
        visibilityText: report.visibilityText.slice(0, 800),
        handoverText: report.handoverText.slice(0, 800),
        modelsText: report.modelsText.slice(0, 800),
        runtimeText: report.runtimeText.slice(0, 800)
      }
    )}`
  );
  assert(
    dataCompleteness &&
      report.stationRows.length === dataCompleteness.stationPrecision.length &&
      report.stationLineageRows.length === dataCompleteness.stationPrecision.length &&
      report.stationRfProfileRows.length === dataCompleteness.stationRfProfiles.length &&
      report.tleRows.length === dataCompleteness.tleSources.length &&
      report.inventoryRows.length ===
        Object.keys(dataCompleteness.runtimeInventoryDisclosure.perOrbit).length &&
      report.satelliteLineageRows.length === dataCompleteness.tleSources.length &&
      report.tleFreshnessRows.length === dataCompleteness.tleFreshness.length &&
      report.displayTransformRows.length === dataCompleteness.displayTransforms.length &&
      report.atmosphericLookupRows.length === dataCompleteness.atmosphericLookups.length &&
      report.assumptionsLimitsRows.length >= expectedAssumptionsLimitsMinimumRows &&
      report.standardsReferenceRows.length >= expectedStandardsReferenceMinimumRows &&
      report.modeledOutputCardsCount === dataCompleteness.modeledOutputs.length &&
      report.policyRows.length ===
        Object.keys(dataCompleteness.policyDisclosure.thresholds).length &&
      report.rfCardsCount === dataCompleteness.rfChainBreakdown.terms.length &&
      report.actorRows.length === dataCompleteness.actorProvenance.length &&
      report.visibilityRows.length === dataCompleteness.visibilityProvenance.length,
    `Report tables must preserve source/report completeness row coverage: ${JSON.stringify(
      {
        stationRows: report.stationRows.length,
        expectedStationRows: dataCompleteness?.stationPrecision.length,
        stationLineageRows: report.stationLineageRows.length,
        expectedStationLineageRows: dataCompleteness?.stationPrecision.length,
        stationRfProfileRows: report.stationRfProfileRows.length,
        expectedStationRfProfileRows: dataCompleteness?.stationRfProfiles.length,
        tleRows: report.tleRows.length,
        expectedTleRows: dataCompleteness?.tleSources.length,
        inventoryRows: report.inventoryRows.length,
        expectedInventoryRows:
          dataCompleteness &&
          Object.keys(dataCompleteness.runtimeInventoryDisclosure.perOrbit).length,
        satelliteLineageRows: report.satelliteLineageRows.length,
        expectedSatelliteLineageRows: dataCompleteness?.tleSources.length,
        tleFreshnessRows: report.tleFreshnessRows.length,
        expectedTleFreshnessRows: dataCompleteness?.tleFreshness.length,
        displayTransformRows: report.displayTransformRows.length,
        expectedDisplayTransformRows: dataCompleteness?.displayTransforms.length,
        atmosphericLookupRows: report.atmosphericLookupRows.length,
        expectedAtmosphericLookupRows: dataCompleteness?.atmosphericLookups.length,
        assumptionsLimitsRows: report.assumptionsLimitsRows.length,
        expectedAssumptionsLimitsMinimumRows,
        standardsReferenceRows: report.standardsReferenceRows.length,
        expectedStandardsReferenceMinimumRows,
        modeledOutputCardsCount: report.modeledOutputCardsCount,
        expectedModeledOutputCardsCount: dataCompleteness?.modeledOutputs.length,
        policyRows: report.policyRows.length,
        expectedPolicyRows:
          dataCompleteness &&
          Object.keys(dataCompleteness.policyDisclosure.thresholds).length,
        rfCardsCount: report.rfCardsCount,
        expectedRfCardsCount: dataCompleteness?.rfChainBreakdown.terms.length,
        actorRows: report.actorRows.length,
        expectedActorRows: dataCompleteness?.actorProvenance.length,
        visibilityRows: report.visibilityRows.length,
        expectedVisibilityRows: dataCompleteness?.visibilityProvenance.length
      }
    )}`
  );
  assert(
    tleManifestMismatches.length === 0 &&
      inventoryMismatches.length === 0 &&
      satelliteLineageMismatches.length === 0 &&
      stationLineageMismatches.length === 0 &&
      stationRfProfileMismatches.length === 0 &&
      displayTransformMismatches.length === 0 &&
      atmosphericLookupMismatches.length === 0,
    `Report lineage rows must preserve station source, station RF gaps, atmospheric lookups, TLE parse counts, runtime caps, and display transforms from runtime state: ${JSON.stringify(
      {
        tleManifestMismatches,
        inventoryMismatches,
        satelliteLineageMismatches,
        stationLineageMismatches,
        stationRfProfileMismatches,
        displayTransformMismatches,
        atmosphericLookupMismatches,
        stationLineageRows: report.stationLineageRows,
        stationRfProfileRows: report.stationRfProfileRows,
        atmosphericLookupRows: report.atmosphericLookupRows,
        tleRows: report.tleRows,
        inventoryRows: report.inventoryRows,
        satelliteLineageRows: report.satelliteLineageRows,
        displayTransformRows: report.displayTransformRows
      }
    )}`
  );
  assert(
    report.csv?.filename?.startsWith("runtime-projection-") &&
      report.csv.filename.endsWith(".csv") &&
      report.csv.mimeType === "text/csv;charset=utf-8" &&
      report.csv.text.includes("# Runtime projection") &&
      report.csv.text.includes("# Visibility windows") &&
      report.csv.text.includes("# Link selection events") &&
      report.csv.text.includes("# Pair source attribution") &&
      report.csv.text.includes("# Station precision") &&
      report.csv.text.includes("# Station RF profile") &&
      report.csv.text.includes("# Atmospheric lookups") &&
      report.csv.text.includes("# Modeled outputs") &&
      report.csv.text.includes("# Policy disclosure") &&
      EXPECTED_STATION_IDS.every((stationId) => report.csv.text.includes(stationId)) &&
      EXPECTED_TLE_SOURCE_IDS.every((sourceId) => report.csv.text.includes(sourceId)) &&
      report.csv.text.includes(EXPECTED_SOURCE_TIER) &&
      report.csv.text.includes(EXPECTED_EVIDENCE_KIND),
    `CSV export must carry row-level selected-pair source/report evidence: ${JSON.stringify(
      {
        filename: report.csv?.filename,
        mimeType: report.csv?.mimeType,
        preview: report.csv?.text?.slice(0, 800)
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
      state.panelDisclosures.sourceBoundaryText.includes("Standards references") &&
      state.panelDisclosures.sourceHelpTriggerCount === 1 &&
      state.panelDisclosures.sourceHelpOpen === true &&
      state.panelDisclosures.sourceHelpText.includes("TLE selection policy") &&
      state.panelDisclosures.sourceHelpText.includes("共同可見總時長") &&
      state.panelDisclosures.sourceHelpText.includes("TLE/SGP4 共同可見幾何分數") &&
      state.panelDisclosures.sourceHelpText.includes("cap 不是品質排序") &&
      state.panelDisclosures.sourceHelpText.includes("Report > Sources > TLE selection policy"),
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
  assert(
    reportWorklogHits.length === 0,
    `Selected-pair source report must not include internal worklog language: ${JSON.stringify(
      reportWorklogHits
    )}`
  );
  assert(
    csvClaimHits.length === 0,
    `Selected-pair CSV must not promote measured/operator claims: ${JSON.stringify(
      csvClaimHits
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
  const reportHtmlPath = writeTextArtifact(
    outputRoot,
    state.report.filename,
    state.report.html
  );
  const reportCsvPath = writeTextArtifact(
    outputRoot,
    state.report.csv.filename,
    state.report.csv.text
  );

  const manifestPath = writeJsonArtifact(outputRoot, "smoke-manifest.json", {
    generatedAt: new Date().toISOString(),
    route: REQUEST_PATH,
    viewport: VIEWPORT.name,
    screenshot: serializeRelative(screenshotPath),
    reportHtml: serializeRelative(reportHtmlPath),
    reportCsv: serializeRelative(reportCsvPath),
    reportHtmlFilename: state.report.filename,
    reportCsvFilename: state.report.csv.filename,
    sourceTier: state.projection.dataCompleteness.pairSourceAttribution.sourceTier,
    evidenceKind: state.projection.dataCompleteness.pairSourceAttribution.evidenceKind,
    requirementRows: state.report.requirementRows.length,
    stationRows: state.report.stationRows.length,
    stationLineageRows: state.report.stationLineageRows.length,
    stationRfProfileRows: state.report.stationRfProfileRows.length,
    tleRows: state.report.tleRows.length,
    inventoryRows: state.report.inventoryRows.length,
    atmosphericLookupRows: state.report.atmosphericLookupRows.length,
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
