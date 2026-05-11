import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
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
const outputRoot = path.join(
  repoRoot,
  "output/itri-demo-route-f16-export-disposition"
);
const downloadRoot = path.join(outputRoot, "downloads");

const REQUEST_PATH = "/?scenePreset=regional&m8aV4GroundStationScene=1";
const EXPECTED_VERSION = "itri-demo-route-f16-export-disposition-runtime.v1";
const EXPECTED_SCHEMA_VERSION = "itri-demo-route-bounded-export.v1";
const EXPECTED_DISPOSITION = "bounded-route-representation";
const EXPECTED_EXTERNAL_TRUTH_DISPOSITION = "external-validation-required";
const EXPECTED_ARTIFACT_TRUTH = "bounded-proxy-report-export";
const EXPECTED_ENDPOINT_PAIR =
  "taiwan-cht-speedcast-singapore-operator-family-2026-04-26";
const EXPECTED_SCENARIO_ID = "m8a-v4-ground-station-multi-orbit-handover";
const EXPECTED_PRECISION = "operator-family-only";
const EXPECTED_LINK_FLOW_VERSION = "m8a-v4-link-flow-direction-cue-runtime.v1";
const EXPECTED_LINK_FLOW_MODE =
  "uplink-downlink-arrow-segments-with-moving-packet-trails";
const EXPECTED_LINK_FLOW_TRUTH =
  "modeled-direction-cue-not-packet-capture-or-measured-throughput";
const EXPECTED_F09_METRIC_TRUTH = "modeled-bounded-class-not-measured";
const EXPECTED_ACTOR_COUNTS = {
  leo: 6,
  meo: 5,
  geo: 2,
  total: 13
};
const VIEWPORT_DESKTOP = {
  name: "desktop-1440x900",
  width: 1440,
  height: 900
};
const FORBIDDEN_EXPORT_KEY_PATTERNS = [
  /latencyMs/,
  /jitterMs/,
  /networkSpeedMbps/,
  /\b\d+(?:\.\d+)?\s*Mbps\b/i,
  /\b\d+(?:\.\d+)?\s*Gbps\b/i,
  /\b\d+(?:\.\d+)?\s*ms\b/i
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function parseList(value) {
  return String(value ?? "")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

function assertIncludesAll(actual, expected, label) {
  const missing = expected.filter((item) => !actual.includes(item));

  assert(
    missing.length === 0,
    `${label} missing values: ${JSON.stringify({ actual, expected, missing })}`
  );
}

function assertScreenshot(absolutePath) {
  const stat = statSync(absolutePath);
  assert(stat.size > 10_000, `Screenshot is unexpectedly small: ${absolutePath}`);
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
      // Try the next CDP shape; Chromium versions differ here.
    }
  }

  return false;
}

async function waitForDownloadedJson(filename) {
  const absolutePath = path.join(downloadRoot, filename);
  const partialPath = `${absolutePath}.crdownload`;

  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (existsSync(absolutePath) && !existsSync(partialPath)) {
      const text = readFileSync(absolutePath, "utf8");
      return {
        path: absolutePath,
        json: JSON.parse(text)
      };
    }

    await sleep(100);
  }

  throw new Error(
    `F-16 JSON download did not appear: ${JSON.stringify({
      expected: absolutePath,
      files: existsSync(downloadRoot) ? readdirSync(downloadRoot) : []
    })}`
  );
}

async function waitForF16Ready(client) {
  let lastState = null;

  for (let attempt = 0; attempt < 240; attempt += 1) {
    lastState = await evaluateRuntimeValue(
      client,
      `(() => {
        const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
        const state = capture?.m8aV4GroundStationScene?.getState?.();
        const root = document.documentElement;

        return {
          bootstrapState: root.dataset.bootstrapState ?? null,
          scenePreset: root.dataset.scenePreset ?? null,
          hasViewer: Boolean(capture?.viewer),
          hasV4Scene: Boolean(state),
          version: state?.f16ExportSurface?.version ?? null,
          telemetry: root.dataset.m8aV4ItriF16ExportSurface ?? null
        };
      })()`
    );

    if (
      lastState?.bootstrapState === "ready" &&
      lastState?.scenePreset === "regional" &&
      lastState?.hasViewer &&
      lastState?.hasV4Scene &&
      lastState?.version === EXPECTED_VERSION &&
      lastState?.telemetry === EXPECTED_VERSION
    ) {
      return lastState;
    }

    await sleep(100);
  }

  throw new Error(`F-16 route export surface did not become ready: ${JSON.stringify(lastState)}`);
}

async function openInspectorForCapture(client) {
  let lastState = null;

  for (let attempt = 0; attempt < 30; attempt += 1) {
    lastState = await evaluateRuntimeValue(
      client,
      `(() => {
        const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
        capture?.m8aV4GroundStationScene?.pause?.();

        const productRoot = document.querySelector("[data-m8a-v47-product-ux='true']");
        const details = productRoot?.querySelector("[data-m8a-v47-control-id='details-toggle']");
        const sheet = productRoot?.querySelector("[data-m8a-v48-inspector='true']");
        const surface = productRoot?.querySelector("[data-itri-f16-export-surface='true']");
        const action = productRoot?.querySelector("[data-itri-f16-export-action='true']");

        if (details instanceof HTMLButtonElement && sheet?.hidden) {
          details.click();
        }

        return {
          hasProductRoot: Boolean(productRoot),
          detailsExpanded: details?.getAttribute("aria-expanded") ?? null,
          sheetHidden: sheet instanceof HTMLElement ? sheet.hidden : null,
          surfaceVisible: surface instanceof HTMLElement && !surface.hidden,
          actionVisible: action instanceof HTMLElement && !action.hidden,
          surfaceRect: surface instanceof HTMLElement
            ? {
                width: surface.getBoundingClientRect().width,
                height: surface.getBoundingClientRect().height
              }
            : null
        };
      })()`
    );

    if (
      lastState?.hasProductRoot &&
      lastState?.detailsExpanded === "true" &&
      lastState?.sheetHidden === false &&
      lastState?.surfaceVisible &&
      lastState?.actionVisible &&
      lastState?.surfaceRect?.width > 0 &&
      lastState?.surfaceRect?.height > 0
    ) {
      return lastState;
    }

    await sleep(100);
  }

  throw new Error(`Inspector did not expose F-16 export surface: ${JSON.stringify(lastState)}`);
}

async function inspectF16Surface(client) {
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
      const controller = capture?.m8aV4GroundStationScene;
      const state = controller?.getState?.();
      const productRoot = document.querySelector("[data-m8a-v47-product-ux='true']");
      const hudRoot = document.querySelector("[data-m8a-v4-ground-station-scene='true']");
      const surface = productRoot?.querySelector("[data-itri-f16-export-surface='true']");
      const action = productRoot?.querySelector("[data-itri-f16-export-action='true']");
      const status = productRoot?.querySelector("[data-itri-f16-export-status='true']");

      return {
        requestPath: window.location.pathname + window.location.search,
        surface: {
          visible: isVisible(surface),
          version: surface?.dataset.itriF16ExportVersion ?? null,
          schemaVersion: surface?.dataset.itriF16ExportSchemaVersion ?? null,
          disposition: surface?.dataset.itriF16ExportDisposition ?? null,
          externalTruthDisposition:
            surface?.dataset.itriF16ExternalTruthDisposition ?? null,
          artifactTruth: surface?.dataset.itriF16ExportArtifactTruth ?? null,
          exportFormat: surface?.dataset.itriF16ExportFormat ?? null,
          routeOwnedStateOnly:
            surface?.dataset.itriF16RouteOwnedStateOnly ?? null,
          measuredValuesIncluded:
            surface?.dataset.itriF16MeasuredValuesIncluded ?? null,
          externalReportTruthClaimed:
            surface?.dataset.itriF16ExternalReportTruthClaimed ?? null,
          lastStatus: surface?.dataset.itriF16LastStatus ?? null,
          lastGeneratedAtUtc:
            surface?.dataset.itriF16LastGeneratedAtUtc ?? null,
          lastFilename: surface?.dataset.itriF16LastFilename ?? null,
          visibleText: normalize(surface?.textContent)
        },
        action: {
          visible: isVisible(action),
          text: normalize(action?.textContent),
          ariaLabel: action?.getAttribute("aria-label") ?? null
        },
        statusText: normalize(status?.textContent),
        stateF16ExportSurface: state?.f16ExportSurface ?? null,
        lastExport: controller?.getLastF16RouteExport?.() ?? null,
        stateRequirementGapSurface: state?.requirementGapSurface ?? null,
        documentTelemetry: {
          version: document.documentElement.dataset.m8aV4ItriF16ExportSurface ?? null,
          schemaVersion:
            document.documentElement.dataset.m8aV4ItriF16ExportSchemaVersion ?? null,
          disposition:
            document.documentElement.dataset.m8aV4ItriF16ExportDisposition ?? null,
          externalTruthDisposition:
            document.documentElement.dataset
              .m8aV4ItriF16ExternalTruthDisposition ?? null,
          artifactTruth:
            document.documentElement.dataset.m8aV4ItriF16ExportArtifactTruth ?? null,
          routeOwnedStateOnly:
            document.documentElement.dataset.m8aV4ItriF16RouteOwnedStateOnly ?? null,
          measuredValuesIncluded:
            document.documentElement.dataset.m8aV4ItriF16MeasuredValuesIncluded ?? null,
          externalReportTruthClaimed:
            document.documentElement.dataset
              .m8aV4ItriF16ExternalReportTruthClaimed ?? null,
          lastStatus:
            document.documentElement.dataset.m8aV4ItriF16LastStatus ?? null,
          lastGeneratedAtUtc:
            document.documentElement.dataset
              .m8aV4ItriF16LastGeneratedAtUtc ?? null,
          lastFilename:
            document.documentElement.dataset.m8aV4ItriF16LastFilename ?? null,
          boundedRouteIds:
            document.documentElement.dataset
              .m8aV4ItriRequirementGapBoundedRouteIds ?? null,
          notMountedIds:
            document.documentElement.dataset
              .m8aV4ItriRequirementGapNotMountedIds ?? null,
          externalValidationIds:
            document.documentElement.dataset
              .m8aV4ItriRequirementGapExternalValidationIds ?? null
        },
        productRootTelemetry: {
          version: productRoot?.dataset.m8aV4ItriF16ExportSurface ?? null,
          disposition: productRoot?.dataset.m8aV4ItriF16ExportDisposition ?? null,
          measuredValuesIncluded:
            productRoot?.dataset.m8aV4ItriF16MeasuredValuesIncluded ?? null,
          externalReportTruthClaimed:
            productRoot?.dataset.m8aV4ItriF16ExternalReportTruthClaimed ?? null
        },
        hudTelemetry: {
          version: hudRoot?.dataset.itriF16ExportSurface ?? null,
          disposition: hudRoot?.dataset.itriF16ExportDisposition ?? null,
          measuredValuesIncluded:
            hudRoot?.dataset.itriF16MeasuredValuesIncluded ?? null,
          externalReportTruthClaimed:
            hudRoot?.dataset.itriF16ExternalReportTruthClaimed ?? null
        },
        policyRuleControls: {
          version:
            document.querySelector("[data-itri-policy-rule-controls-surface='true']")
              ?.dataset.itriPolicyRuleControlsVersion ?? null,
          truthBoundary:
            document.querySelector("[data-itri-policy-rule-controls-surface='true']")
              ?.dataset.itriPolicyRuleTruthBoundary ?? null,
          policySelector: Boolean(
            document.querySelector("[data-itri-f10-policy-selector='true']")
          ),
          rulePreset: Boolean(
            document.querySelector("[data-itri-f11-rule-preset='true']")
          )
        },
        visibleRouteText: normalize(productRoot?.innerText)
      };
    })()`
  );
}

async function triggerF16Export(client) {
  const result = await evaluateRuntimeValue(
    client,
    `(() => {
      const action = document.querySelector("[data-itri-f16-export-action='true']");

      if (!(action instanceof HTMLButtonElement)) {
        return { clicked: false };
      }

      action.click();
      return { clicked: true };
    })()`
  );

  assert(result?.clicked === true, `F-16 export action was not clicked: ${JSON.stringify(result)}`);
}

async function waitForF16Export(client) {
  let lastState = null;

  for (let attempt = 0; attempt < 100; attempt += 1) {
    lastState = await inspectF16Surface(client);

    if (
      lastState.stateF16ExportSurface?.lastStatus === "exported" &&
      lastState.lastExport?.schemaVersion === EXPECTED_SCHEMA_VERSION &&
      lastState.lastExport?.exportFile?.filename
    ) {
      return lastState;
    }

    await sleep(100);
  }

  throw new Error(`F-16 export did not complete: ${JSON.stringify(lastState)}`);
}

function assertF16Surface(inspection) {
  assert(
    inspection.requestPath === REQUEST_PATH,
    `Route path changed: ${inspection.requestPath}`
  );
  assert(
    inspection.surface.visible &&
      inspection.surface.version === EXPECTED_VERSION &&
      inspection.surface.schemaVersion === EXPECTED_SCHEMA_VERSION &&
      inspection.surface.disposition === EXPECTED_DISPOSITION &&
      inspection.surface.externalTruthDisposition ===
        EXPECTED_EXTERNAL_TRUTH_DISPOSITION &&
      inspection.surface.artifactTruth === EXPECTED_ARTIFACT_TRUTH &&
      inspection.surface.exportFormat === "json" &&
      inspection.surface.routeOwnedStateOnly === "true" &&
      inspection.surface.measuredValuesIncluded === "false" &&
      inspection.surface.externalReportTruthClaimed === "false",
    `F-16 surface must expose bounded export disposition: ${JSON.stringify(
      inspection.surface
    )}`
  );
  assert(
    inspection.surface.visibleText.includes("Bounded Route Export") &&
      inspection.surface.visibleText.includes("JSON only") &&
      inspection.surface.visibleText.includes("not external measurement/report truth") &&
      inspection.surface.visibleText.includes("Exports route-owned bounded state only"),
    `F-16 visible copy missing bounded label: ${inspection.surface.visibleText}`
  );
  assert(
    inspection.action.visible &&
      inspection.action.text === "Export bounded JSON" &&
      inspection.action.ariaLabel?.includes("Not external measurement/report truth."),
    `F-16 action must be visible and accessible: ${JSON.stringify(
      inspection.action
    )}`
  );
  assert(
    inspection.stateF16ExportSurface?.version === EXPECTED_VERSION &&
      inspection.stateF16ExportSurface?.schemaVersion ===
        EXPECTED_SCHEMA_VERSION &&
      inspection.stateF16ExportSurface?.disposition === EXPECTED_DISPOSITION &&
      inspection.stateF16ExportSurface?.externalTruthDisposition ===
        EXPECTED_EXTERNAL_TRUTH_DISPOSITION &&
      inspection.stateF16ExportSurface?.artifactTruth ===
        EXPECTED_ARTIFACT_TRUTH &&
      inspection.stateF16ExportSurface?.routeOwnedStateOnly === true &&
      inspection.stateF16ExportSurface?.measuredValuesIncluded === false &&
      inspection.stateF16ExportSurface?.externalReportSystemTruthClaimed ===
        false,
    `State must expose bounded F-16 surface: ${JSON.stringify(
      inspection.stateF16ExportSurface
    )}`
  );
  assert(
    inspection.documentTelemetry.version === EXPECTED_VERSION &&
      inspection.productRootTelemetry.version === EXPECTED_VERSION &&
      inspection.hudTelemetry.version === EXPECTED_VERSION &&
      inspection.documentTelemetry.measuredValuesIncluded === "false" &&
      inspection.productRootTelemetry.measuredValuesIncluded === "false" &&
      inspection.hudTelemetry.measuredValuesIncluded === "false" &&
      inspection.documentTelemetry.externalReportTruthClaimed === "false" &&
      inspection.productRootTelemetry.externalReportTruthClaimed === "false" &&
      inspection.hudTelemetry.externalReportTruthClaimed === "false",
    `F-16 telemetry must mirror bounded truth: ${JSON.stringify({
      document: inspection.documentTelemetry,
      productRoot: inspection.productRootTelemetry,
      hud: inspection.hudTelemetry
    })}`
  );
  assert(
    parseList(inspection.documentTelemetry.boundedRouteIds).includes("F-16") &&
      parseList(inspection.documentTelemetry.boundedRouteIds).includes("F-10") &&
      parseList(inspection.documentTelemetry.boundedRouteIds).includes("F-11") &&
      !parseList(inspection.documentTelemetry.notMountedIds).includes("F-16") &&
      !parseList(inspection.documentTelemetry.notMountedIds).includes("F-10") &&
      !parseList(inspection.documentTelemetry.notMountedIds).includes("F-11") &&
      parseList(inspection.documentTelemetry.externalValidationIds).includes("F-16"),
    `Requirement gap disposition must move F-16 into bounded route while keeping external report truth open: ${JSON.stringify(
      inspection.documentTelemetry
    )}`
  );
  assert(
    inspection.policyRuleControls.version ===
      "itri-demo-route-policy-rule-controls-runtime.v1" &&
      inspection.policyRuleControls.truthBoundary ===
        "modeled-policy-demo-not-live-control" &&
      inspection.policyRuleControls.policySelector &&
      inspection.policyRuleControls.rulePreset,
    `F-16 phase must preserve bounded F-10/F-11 controls: ${JSON.stringify(
      inspection.policyRuleControls
    )}`
  );
}

function assertF16ExportBundle(bundle) {
  assert(bundle, "Missing F-16 export bundle");
  assert(
    bundle.schemaVersion === EXPECTED_SCHEMA_VERSION &&
      bundle.version === EXPECTED_VERSION &&
      Number.isFinite(Date.parse(bundle.generatedAtUtc)),
    `Export bundle must include schema/version/timestamp: ${JSON.stringify(bundle)}`
  );
  assert(
    bundle.routeId === REQUEST_PATH &&
      bundle.scenarioId === EXPECTED_SCENARIO_ID &&
      bundle.endpointPair?.endpointPairId === EXPECTED_ENDPOINT_PAIR &&
      bundle.endpointPair?.precision === EXPECTED_PRECISION &&
      bundle.precision === EXPECTED_PRECISION,
    `Export bundle route identity changed: ${JSON.stringify(bundle)}`
  );
  assert(
    bundle.actorCounts?.leo === EXPECTED_ACTOR_COUNTS.leo &&
      bundle.actorCounts?.meo === EXPECTED_ACTOR_COUNTS.meo &&
      bundle.actorCounts?.geo === EXPECTED_ACTOR_COUNTS.geo &&
      bundle.actorCounts?.total === EXPECTED_ACTOR_COUNTS.total,
    `Export bundle actor counts changed: ${JSON.stringify(bundle.actorCounts)}`
  );
  assert(
    bundle.activeModeledWindow?.windowId &&
      bundle.activeModeledWindow?.modelTruth ===
        "simulation-output-not-operator-log" &&
      bundle.activeModeledWindow?.boundedMetricClasses?.networkSpeedClass &&
      !Object.hasOwn(bundle.activeModeledWindow?.boundedMetricClasses ?? {}, "networkSpeedMbps"),
    `Export bundle active modeled window must stay class-only: ${JSON.stringify(
      bundle.activeModeledWindow
    )}`
  );
  assertIncludesAll(
    bundle.requirementStatusGroups
      ?.find((group) => group.groupId === "bounded-route-representation")
      ?.requirementIds ?? [],
    ["F-09", "F-16"],
    "bounded route group"
  );
  assertIncludesAll(
    bundle.requirementStatusGroups
      ?.find((group) => group.groupId === "bounded-route-representation")
      ?.requirementIds ?? [],
    ["F-10", "F-11"],
    "bounded route policy/rule group"
  );
  assert(
    !(bundle.requirementStatusGroups
      ?.find((group) => group.groupId === "not-mounted-route-gap")
      ?.requirementIds ?? []
    ).some((id) => ["F-10", "F-11", "F-16"].includes(id)),
    `F-10/F-11/F-16 must not remain not-mounted: ${JSON.stringify(
      bundle.requirementStatusGroups
    )}`
  );
  assertIncludesAll(
    bundle.requirementStatusGroups
      ?.find((group) => group.groupId === "external-validation-gap")
      ?.requirementIds ?? [],
    ["F-16"],
    "external validation group"
  );
  assert(
    bundle.f09BoundedRateDisposition?.requirementId === "F-09" &&
      bundle.f09BoundedRateDisposition?.disposition ===
        EXPECTED_DISPOSITION &&
      bundle.f09BoundedRateDisposition?.externalTruthDisposition ===
        EXPECTED_EXTERNAL_TRUTH_DISPOSITION &&
      bundle.f09BoundedRateDisposition?.metricTruth ===
        EXPECTED_F09_METRIC_TRUTH &&
      bundle.f09BoundedRateDisposition?.measuredThroughputClaimed === false,
    `Export bundle must include bounded F-09 disposition: ${JSON.stringify(
      bundle.f09BoundedRateDisposition
    )}`
  );
  assert(
    bundle.policyRuleControls?.version ===
      "itri-demo-route-policy-rule-controls-runtime.v1" &&
      bundle.policyRuleControls?.truthBoundary ===
        "modeled-policy-demo-not-live-control" &&
      bundle.policyRuleControls?.policyPresetMode ===
        "modeled-replay-policy-preset-not-live-control" &&
      bundle.policyRuleControls?.rulePresetMode ===
        "bounded-replay-rule-parameter-preset-not-live-control" &&
      bundle.policyRuleControls?.liveControlClaimed === false &&
      bundle.policyRuleControls?.arbitraryRuleEditorClaimed === false &&
      bundle.policyRuleControls?.measuredDecisionTruthClaimed === false,
    `Export bundle must carry bounded F-10/F-11 preset state: ${JSON.stringify(
      bundle.policyRuleControls
    )}`
  );
  assert(
    bundle.linkFlowCueMetadata?.version === EXPECTED_LINK_FLOW_VERSION &&
      bundle.linkFlowCueMetadata?.mode === EXPECTED_LINK_FLOW_MODE &&
      bundle.linkFlowCueMetadata?.truthBoundary === EXPECTED_LINK_FLOW_TRUTH,
    `Export bundle must include link-flow cue metadata: ${JSON.stringify(
      bundle.linkFlowCueMetadata
    )}`
  );
  assert(
    bundle.provenance?.rawPackageSideReadOwnership === "forbidden" &&
      bundle.provenance?.rawSourcePathsIncluded === false,
    `Export bundle provenance must preserve runtime boundary: ${JSON.stringify(
      bundle.provenance
    )}`
  );
  assert(
    bundle.nonClaims?.measuredValuesIncluded === false &&
      bundle.nonClaims?.externalReportSystemTruthClaimed === false &&
      bundle.nonClaims?.explicitNonClaims?.length >= 5,
    `Export bundle must carry explicit non-claims: ${JSON.stringify(
      bundle.nonClaims
    )}`
  );
  assert(
    bundle.exportFile?.format === "json" &&
      bundle.exportFile?.filename?.startsWith("itri-demo-route-f16-bounded-") &&
      bundle.exportFile?.filename?.endsWith(".json"),
    `Export bundle must define a JSON file: ${JSON.stringify(bundle.exportFile)}`
  );

  const serialized = JSON.stringify(bundle);
  const forbiddenHits = FORBIDDEN_EXPORT_KEY_PATTERNS.filter((pattern) =>
    pattern.test(serialized)
  ).map((pattern) => pattern.toString());

  assert(
    forbiddenHits.length === 0,
    `Export bundle contains forbidden measured numeric fields/values: ${JSON.stringify(
      { forbiddenHits, serialized }
    )}`
  );
}

async function main() {
  ensureOutputRoot(outputRoot);
  mkdirSync(downloadRoot, { recursive: true });

  await withStaticSmokeBrowser(async ({ client, baseUrl }) => {
    await setViewport(client, VIEWPORT_DESKTOP);
    const downloadsEnabled = await allowDownloads(client);

    assert(downloadsEnabled, "Unable to enable browser downloads for F-16 smoke.");

    await client.send("Page.navigate", {
      url: `${baseUrl}${REQUEST_PATH}`
    });
    await waitForF16Ready(client);
    await waitForGlobeReady(client, "ITRI F-16 route export disposition");
    await openInspectorForCapture(client);
    await sleep(500);

    const before = await inspectF16Surface(client);
    assertF16Surface(before);
    writeJsonArtifact(
      outputRoot,
      `${VIEWPORT_DESKTOP.name}-before-export-inspection.json`,
      before
    );

    await triggerF16Export(client);
    const after = await waitForF16Export(client);
    assertF16Surface(after);
    assertF16ExportBundle(after.lastExport);

    const downloaded = await waitForDownloadedJson(
      after.lastExport.exportFile.filename
    );
    assertF16ExportBundle(downloaded.json);
    assert(
      downloaded.json.generatedAtUtc === after.lastExport.generatedAtUtc,
      `Downloaded artifact must match the generated export: ${JSON.stringify({
        downloaded: downloaded.json.generatedAtUtc,
        runtime: after.lastExport.generatedAtUtc
      })}`
    );

    writeJsonArtifact(
      outputRoot,
      `${VIEWPORT_DESKTOP.name}-after-export-inspection.json`,
      {
        ...after,
        downloadedPath: downloaded.path
      }
    );
    writeJsonArtifact(
      outputRoot,
      `${VIEWPORT_DESKTOP.name}-downloaded-export.json`,
      downloaded.json
    );

    const screenshot = await captureScreenshot(
      client,
      outputRoot,
      `${VIEWPORT_DESKTOP.name}.png`
    );
    assertScreenshot(screenshot);
  });

  console.log(`ITRI F-16 route export disposition validated. Output: ${outputRoot}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
