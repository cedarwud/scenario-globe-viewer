import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync
} from "node:fs";
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
const outputRoot = path.join(repoRoot, "output/m8a-v4.12-f16-report-export");
const downloadRoot = path.join(outputRoot, "downloads");

const REQUEST_PATH = "/";
const VIEWPORT_DESKTOP = {
  name: "desktop-1440x900",
  width: 1440,
  height: 900
};
const EXPECTED_SCHEMA_VERSION = "m8a-v4.12-f16-bundle-v1";
const EXPECTED_FAMILIES = [
  "communication-time",
  "handover-decision",
  "physical-input",
  "validation-state"
];
const EXPECTED_CSV_HEADER =
  "\"reportFamily\",\"recordId\",\"field\",\"value\",\"unit\",\"provenanceKind\",\"disclaimer\",\"generatedAt\",\"schemaVersion\",\"scenarioId\",\"replayMode\"";
const FORBIDDEN_CLAIMS = [
  "measured throughput",
  "live iperf",
  "live ping",
  "active gateway",
  "native RF handover",
  "ESTNeT throughput",
  "tunnel verified end-to-end",
  "DUT closed",
  ">=500 LEO closure",
  "full ITRI acceptance",
  "iperf result",
  "ping-verified",
  "active serving satellite",
  "pair-specific path",
  "INET speed",
  "NAT validated",
  "500 LEO closure",
  "multi-orbit closure",
  "acceptance complete"
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertScreenshot(absolutePath) {
  const stat = statSync(absolutePath);
  assert(stat.size > 10_000, `Screenshot is unexpectedly small: ${absolutePath}`);
}

function assertForbiddenClaimsAbsent(label, text) {
  const normalized = String(text ?? "").toLowerCase();
  const hit = FORBIDDEN_CLAIMS.find((claim) =>
    normalized.includes(claim.toLowerCase())
  );

  assert(!hit, `${label} contains forbidden F-16 claim: ${hit}`);
}

function assertSequence(label, text, sequence) {
  let cursor = -1;

  for (const token of sequence) {
    const next = text.indexOf(token, cursor + 1);
    assert(next > cursor, `${label} missing ordered token: ${token}`);
    cursor = next;
  }
}

async function installConsoleErrorProbe(client) {
  await client.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `
      (() => {
        const runtimeErrors = [];
        Object.defineProperty(window, "__F16_RUNTIME_ERRORS__", {
          value: runtimeErrors,
          configurable: false
        });
        const serialize = (value) => {
          if (value instanceof Error) {
            return value.message;
          }
          if (typeof value === "string") {
            return value;
          }
          try {
            return JSON.stringify(value);
          } catch {
            return String(value);
          }
        };
        window.addEventListener("error", (event) => {
          runtimeErrors.push(serialize(event.error ?? event.message));
        });
        window.addEventListener("unhandledrejection", (event) => {
          runtimeErrors.push(serialize(event.reason));
        });
        const originalError = console.error.bind(console);
        console.error = (...args) => {
          runtimeErrors.push(args.map(serialize).join(" "));
          originalError(...args);
        };
      })();
    `
  });
}

async function allowDownloads(client) {
  mkdirSync(downloadRoot, { recursive: true });

  const attempts = [
    {
      method: "Browser.setDownloadBehavior",
      params: {
        behavior: "allow",
        downloadPath: downloadRoot,
        eventsEnabled: true
      }
    },
    {
      method: "Browser.setDownloadBehavior",
      params: {
        behavior: "allow",
        downloadPath: downloadRoot
      }
    },
    {
      method: "Page.setDownloadBehavior",
      params: {
        behavior: "allow",
        downloadPath: downloadRoot
      }
    }
  ];

  for (const attempt of attempts) {
    try {
      await client.send(attempt.method, attempt.params);
      return true;
    } catch {
      // Chromium download behavior moved between Browser and Page domains.
    }
  }

  return false;
}

async function inspectReportExport(client) {
  return await evaluateRuntimeValue(
    client,
    `(() => {
      const normalize = (value) => String(value ?? "").replace(/\\s+/g, " ").trim();
      const isVisible = (element) => {
        if (!(element instanceof HTMLElement)) {
          return false;
        }

        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();

        return (
          !element.hidden &&
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          Number(style.opacity) > 0 &&
          rect.width > 0 &&
          rect.height > 0
        );
      };
      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      const root = document.querySelector("[data-report-export-action-group='true']");
      const headingId = root?.getAttribute("aria-labelledby");
      const heading = headingId ? document.getElementById(headingId) : null;
      const primary = document.querySelector("[data-report-export-primary='true']");
      const disclosure = document.querySelector("[data-report-export-disclosure='true']");
      const optionsPanel = document.querySelector("[data-report-export-options-panel='true']");
      const successLive = document.querySelector("[data-report-export-success-live='true']");
      const failureLive = document.querySelector("[data-report-export-failure-live='true']");
      const successMessage = document.querySelector("[data-report-export-success-message='true']");
      const familyOptions = Array.from(
        document.querySelectorAll("[data-report-export-family]")
      ).map((input) => ({
        value: input.value,
        checked: input.checked,
        label: normalize(input.closest("label")?.textContent)
      }));
      const formatOptions = Array.from(
        document.querySelectorAll("[data-report-export-format]")
      ).map((input) => ({
        value: input.value,
        checked: input.checked,
        label: normalize(input.closest("label")?.textContent)
      }));

      return {
        bootstrapState: document.documentElement.dataset.bootstrapState ?? null,
        requestPath: window.location.pathname + window.location.search,
        runtimeErrors: window.__F16_RUNTIME_ERRORS__ ?? [],
        hasCapture: Boolean(
          capture?.viewer &&
          capture?.communicationTime &&
          capture?.handoverDecision &&
          capture?.physicalInput &&
          capture?.validationState
        ),
        action: {
          mounted: root instanceof HTMLElement,
          visible: isVisible(root),
          role: root?.getAttribute("role") ?? null,
          ariaLabelledby: root?.getAttribute("aria-labelledby") ?? null,
          ariaBusy: root?.getAttribute("aria-busy") ?? null,
          describedBy: root?.getAttribute("aria-describedby") ?? null,
          state: root?.dataset.reportExportState ?? null,
          selectedFamilies: root?.dataset.reportExportSelectedFamilies ?? null,
          availableFamilies: root?.dataset.reportExportAvailableFamilies ?? null,
          format: root?.dataset.reportExportFormat ?? null,
          lastGeneratedAt: root?.dataset.reportExportLastGeneratedAt ?? null,
          lastFilenames: root?.dataset.reportExportLastFilenames ?? null,
          lastCsvRows: root?.dataset.reportExportLastCsvRows ?? null,
          text: normalize(root instanceof HTMLElement ? root.innerText : "")
        },
        heading: {
          exists: heading instanceof HTMLElement,
          id: heading?.id ?? null,
          text: normalize(heading?.textContent)
        },
        primary: {
          visible: isVisible(primary),
          text: normalize(primary?.textContent),
          disabled: primary instanceof HTMLButtonElement ? primary.disabled : null,
          ariaBusy: primary?.getAttribute("aria-busy") ?? null
        },
        disclosure: {
          visible: isVisible(disclosure),
          text: normalize(disclosure?.textContent),
          ariaExpanded: disclosure?.getAttribute("aria-expanded") ?? null,
          ariaControls: disclosure?.getAttribute("aria-controls") ?? null
        },
        options: {
          visible: isVisible(optionsPanel),
          hidden: optionsPanel instanceof HTMLElement ? optionsPanel.hidden : null,
          families: familyOptions,
          formats: formatOptions
        },
        live: {
          successRole: successLive?.getAttribute("role") ?? null,
          successAriaLive: successLive?.getAttribute("aria-live") ?? null,
          successText: normalize(successLive?.textContent),
          failureRole: failureLive?.getAttribute("role") ?? null,
          failureAriaLive: failureLive?.getAttribute("aria-live") ?? null,
          failureText: normalize(failureLive?.textContent),
          successMessage: normalize(successMessage?.textContent)
        }
      };
    })()`
  );
}

async function waitForReportExportReady(client) {
  let lastState = null;

  for (let attempt = 0; attempt < 240; attempt += 1) {
    lastState = await inspectReportExport(client);

    if (
      lastState.bootstrapState === "ready" &&
      lastState.hasCapture &&
      lastState.action.visible &&
      lastState.primary.visible &&
      lastState.primary.disabled === false &&
      lastState.action.format === "both"
    ) {
      return lastState;
    }

    await sleep(100);
  }

  throw new Error(`F-16 report export action did not become ready: ${JSON.stringify(lastState)}`);
}

async function clickDisclosure(client) {
  await evaluateRuntimeValue(
    client,
    `(() => {
      const disclosure = document.querySelector("[data-report-export-disclosure='true']");
      if (!(disclosure instanceof HTMLButtonElement)) {
        throw new Error("Missing F-16 report export disclosure.");
      }
      disclosure.click();
    })()`
  );

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const state = await inspectReportExport(client);

    if (state.disclosure.ariaExpanded === "true" && state.options.visible) {
      return state;
    }

    await sleep(50);
  }

  throw new Error("F-16 report export options did not expand.");
}

async function clickExportWithValidationUnavailable(client) {
  await evaluateRuntimeValue(
    client,
    `(() => {
      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      const primary = document.querySelector("[data-report-export-primary='true']");

      if (!capture) {
        throw new Error("Missing capture seam for F-16 export smoke.");
      }

      if (!(primary instanceof HTMLButtonElement)) {
        throw new Error("Missing F-16 report export primary button.");
      }

      window.__F16_ORIGINAL_VALIDATION_STATE__ = capture.validationState;
      delete capture.validationState;
      primary.click();
    })()`
  );
}

async function restoreValidationState(client) {
  await evaluateRuntimeValue(
    client,
    `(() => {
      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      if (capture && window.__F16_ORIGINAL_VALIDATION_STATE__) {
        capture.validationState = window.__F16_ORIGINAL_VALIDATION_STATE__;
      }
      delete window.__F16_ORIGINAL_VALIDATION_STATE__;
    })()`
  );
}

async function waitForPreparing(client) {
  let lastState = null;

  for (let attempt = 0; attempt < 80; attempt += 1) {
    lastState = await inspectReportExport(client);

    if (
      lastState.action.state === "preparing" &&
      lastState.action.ariaBusy === "true" &&
      lastState.primary.ariaBusy === "true" &&
      lastState.primary.text.includes("Preparing")
    ) {
      return lastState;
    }

    await sleep(10);
  }

  throw new Error(`F-16 preparing state was not observable: ${JSON.stringify(lastState)}`);
}

async function waitForSuccess(client) {
  let lastState = null;

  for (let attempt = 0; attempt < 120; attempt += 1) {
    lastState = await inspectReportExport(client);
    const filenames = String(lastState.action.lastFilenames ?? "")
      .split("|")
      .filter(Boolean);

    if (
      lastState.action.state === "success" &&
      lastState.live.successText === "Report exported. 2 files downloaded." &&
      filenames.length === 2
    ) {
      return lastState;
    }

    await sleep(100);
  }

  throw new Error(`F-16 report export did not complete: ${JSON.stringify(lastState)}`);
}

async function waitForDownloadedText(filename) {
  const absolutePath = path.join(downloadRoot, filename);
  const partialPath = `${absolutePath}.crdownload`;

  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (existsSync(absolutePath) && !existsSync(partialPath)) {
      return {
        path: absolutePath,
        text: readFileSync(absolutePath, "utf8")
      };
    }

    await sleep(100);
  }

  throw new Error(
    `F-16 download did not appear: ${JSON.stringify({
      expected: absolutePath,
      files: existsSync(downloadRoot) ? readdirSync(downloadRoot) : []
    })}`
  );
}

function assertMountedState(state) {
  assert(state.requestPath === REQUEST_PATH, `Request path changed: ${state.requestPath}`);
  assert(
    state.action.role === "group" &&
      state.action.ariaLabelledby === state.heading.id &&
      state.heading.text === "Bounded Statistics Report",
    `F-16 action group ARIA labelling is incomplete: ${JSON.stringify(state)}`
  );
  assert(
    state.disclosure.ariaExpanded === "false" &&
      state.options.hidden === true &&
      state.primary.ariaBusy === "false" &&
      state.action.ariaBusy === "false",
    `F-16 idle ARIA state is incorrect: ${JSON.stringify(state)}`
  );
  assert(
    state.live.successRole === "status" &&
      state.live.successAriaLive === "polite" &&
      state.live.failureRole === "alert" &&
      state.live.failureAriaLive === "assertive",
    `F-16 live regions are incorrect: ${JSON.stringify(state.live)}`
  );
  assert(
    JSON.stringify(state.options.families.map((entry) => entry.value)) ===
      JSON.stringify(EXPECTED_FAMILIES) &&
      state.options.families.every((entry) => entry.checked),
    `F-16 default family checkboxes are incorrect: ${JSON.stringify(state.options.families)}`
  );
  assert(
    state.options.formats.some((entry) => entry.value === "both" && entry.checked) &&
      state.options.formats.some((entry) => entry.value === "json") &&
      state.options.formats.some((entry) => entry.value === "csv"),
    `F-16 default format radios are incorrect: ${JSON.stringify(state.options.formats)}`
  );
  assertForbiddenClaimsAbsent("F-16 idle DOM", state.action.text);
}

function assertDownloadedJson(jsonText, json) {
  assertSequence("F-16 JSON top-level order", jsonText, [
    "\"metadata\"",
    "\"families\""
  ]);
  assertSequence("F-16 JSON metadata order", jsonText, [
    "\"schemaVersion\"",
    "\"generatedAt\"",
    "\"scenarioId\"",
    "\"scenarioLabel\"",
    "\"replayMode\"",
    "\"replayTimeIso\"",
    "\"includedFamilies\"",
    "\"bundleDisclaimer\"",
    "\"familyDisclaimers\""
  ]);
  assert(
    json.metadata?.schemaVersion === EXPECTED_SCHEMA_VERSION &&
      Number.isFinite(Date.parse(json.metadata.generatedAt)) &&
      typeof json.metadata.scenarioId === "string" &&
      json.metadata.scenarioId.length > 0 &&
      json.metadata.replayMode === "real-time",
    `F-16 JSON metadata is incorrect: ${JSON.stringify(json.metadata)}`
  );
  assert(
    JSON.stringify(json.metadata.includedFamilies) ===
      JSON.stringify(EXPECTED_FAMILIES),
    `F-16 JSON included families changed: ${JSON.stringify(json.metadata.includedFamilies)}`
  );
  assert(
    json.metadata.bundleDisclaimer?.includes("Repo-owned bounded report export") &&
      EXPECTED_FAMILIES.every((family) =>
        typeof json.metadata.familyDisclaimers?.[family] === "string"
      ),
    `F-16 JSON disclaimers are incomplete: ${JSON.stringify(json.metadata)}`
  );
  assert(
    json.families?.communicationTime?.available === true &&
      json.families.communicationTime.payload?.schemaVersion,
    "F-16 JSON missing communication-time report payload."
  );
  assert(
    json.families?.handoverDecision?.available === true &&
      json.families.handoverDecision.payload?.schemaVersion,
    "F-16 JSON missing handover-decision report payload."
  );
  assert(
    json.families?.physicalInput?.available === true &&
      json.families.physicalInput.payload?.schemaVersion,
    "F-16 JSON missing physical-input report payload."
  );
  assert(
    json.families?.validationState?.available === false &&
      json.families.validationState.payload === null &&
      json.families.validationState.unavailableReason?.includes(
        "Validation state controller not mounted"
      ),
    `F-16 JSON unavailable validation-state handling is incorrect: ${JSON.stringify(
      json.families?.validationState
    )}`
  );
  assertForbiddenClaimsAbsent("F-16 JSON bytes", jsonText);
}

function assertDownloadedCsv(csvText, scenarioId) {
  assert(
    csvText.startsWith(`${EXPECTED_CSV_HEADER}\r\n`),
    `F-16 CSV header is incorrect: ${csvText.slice(0, 240)}`
  );
  assert(csvText.includes("\"communication-time\""), "CSV missing communication-time rows.");
  assert(csvText.includes("\"handover-decision\""), "CSV missing handover-decision rows.");
  assert(csvText.includes("\"physical-input\""), "CSV missing physical-input rows.");
  assert(
    !csvText.includes("\"validation-state\""),
    "CSV must emit zero rows for unavailable validation-state family."
  );
  assert(
    csvText.includes(`\"${EXPECTED_SCHEMA_VERSION}\"`) &&
      csvText.includes(`\"${scenarioId}\"`) &&
      csvText.includes("\"real-time\""),
    "CSV missing bundle metadata columns."
  );
  assertForbiddenClaimsAbsent("F-16 CSV bytes", csvText);
}

async function main() {
  ensureOutputRoot(outputRoot);
  mkdirSync(downloadRoot, { recursive: true });

  await withStaticSmokeBrowser(async ({ client, baseUrl }) => {
    await installConsoleErrorProbe(client);
    await setViewport(client, VIEWPORT_DESKTOP);

    const downloadsEnabled = await allowDownloads(client);
    assert(downloadsEnabled, "Unable to enable browser downloads for F-16 smoke.");

    await client.send("Page.navigate", {
      url: `${baseUrl}${REQUEST_PATH}`
    });
    await waitForReportExportReady(client);
    await waitForGlobeReady(client, "M8A V4.12 F-16 report export");

    const idle = await inspectReportExport(client);
    assertMountedState(idle);
    assertScreenshot(
      await captureScreenshot(client, outputRoot, `${VIEWPORT_DESKTOP.name}-idle.png`)
    );

    const expanded = await clickDisclosure(client);
    assert(
      expanded.disclosure.ariaExpanded === "true" && expanded.options.visible,
      `F-16 options did not expand: ${JSON.stringify(expanded)}`
    );
    assertForbiddenClaimsAbsent("F-16 expanded DOM", expanded.action.text);
    assertScreenshot(
      await captureScreenshot(
        client,
        outputRoot,
        `${VIEWPORT_DESKTOP.name}-expanded.png`
      )
    );

    await clickExportWithValidationUnavailable(client);
    const preparing = await waitForPreparing(client);
    assertForbiddenClaimsAbsent("F-16 preparing DOM", preparing.action.text);
    assertScreenshot(
      await captureScreenshot(
        client,
        outputRoot,
        `${VIEWPORT_DESKTOP.name}-preparing.png`
      )
    );

    const success = await waitForSuccess(client);
    assertForbiddenClaimsAbsent("F-16 success DOM", success.action.text);
    assert(
      success.live.successMessage.includes("Repo-owned bounded report export") &&
        EXPECTED_FAMILIES.every((family) =>
          success.live.successMessage.includes(
            family === "communication-time"
              ? "Repo-owned readout from bounded scenario windows"
              : family === "handover-decision"
                ? "Bounded-proxy decision over deterministic candidate metrics"
                : family === "physical-input"
                  ? "Bounded proxy physical inputs projected into"
                  : "Repo-owned validation boundary readout"
          )
        ),
      `F-16 success message missing required disclaimers: ${success.live.successMessage}`
    );
    assertScreenshot(
      await captureScreenshot(
        client,
        outputRoot,
        `${VIEWPORT_DESKTOP.name}-success.png`
      )
    );

    const filenames = success.action.lastFilenames.split("|").filter(Boolean);
    const jsonFilename = filenames.find((filename) => filename.endsWith(".json"));
    const csvFilename = filenames.find((filename) => filename.endsWith(".csv"));

    assert(
      jsonFilename?.startsWith("m8a-v4.12-f16-report-") &&
        csvFilename?.startsWith("m8a-v4.12-f16-report-"),
      `F-16 filenames are incorrect: ${JSON.stringify(filenames)}`
    );

    const downloadedJson = await waitForDownloadedText(jsonFilename);
    const downloadedCsv = await waitForDownloadedText(csvFilename);
    const json = JSON.parse(downloadedJson.text);

    assertDownloadedJson(downloadedJson.text, json);
    assertDownloadedCsv(downloadedCsv.text, json.metadata.scenarioId);
    writeJsonArtifact(outputRoot, `${VIEWPORT_DESKTOP.name}-inspection.json`, {
      idle,
      expanded,
      preparing,
      success,
      downloadedJsonPath: downloadedJson.path,
      downloadedCsvPath: downloadedCsv.path
    });
    writeJsonArtifact(
      outputRoot,
      `${VIEWPORT_DESKTOP.name}-downloaded-json-summary.json`,
      json
    );

    await restoreValidationState(client);

    const finalState = await inspectReportExport(client);
    assert(
      finalState.runtimeErrors.length === 0,
      `F-16 smoke captured console/runtime errors: ${JSON.stringify(finalState.runtimeErrors)}`
    );
  });

  console.log(`M8A V4.12 F-16 report export validated. Output: ${outputRoot}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
