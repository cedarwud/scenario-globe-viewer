import { statSync } from "node:fs";
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
  "output/itri-demo-route-f09-rate-disposition"
);

const REQUEST_PATH = "/?scenePreset=regional&m8aV4GroundStationScene=1";
const EXPECTED_VERSION = "itri-demo-route-f09-rate-disposition-runtime.v1";
const EXPECTED_DISPOSITION = "bounded-route-representation";
const EXPECTED_EXTERNAL_TRUTH_DISPOSITION = "external-validation-required";
const EXPECTED_METRIC_TRUTH = "modeled-bounded-class-not-measured";
const EXPECTED_PROVENANCE = "modeled bounded proxy";
const EXPECTED_WINDOW_CLASSES = [
  "leo-acquisition-context:candidate-capacity-context-class",
  "leo-aging-pressure:candidate-capacity-context-class",
  "meo-continuity-hold:continuity-context-class",
  "leo-reentry-candidate:candidate-capacity-context-class",
  "geo-continuity-guard:guard-context-class"
];
const VIEWPORT_DESKTOP = {
  name: "desktop-1440x900",
  width: 1440,
  height: 900
};
const FORBIDDEN_POSITIVE_CLAIMS = [
  "measured throughput",
  "live mbps",
  "iperf result",
  "ping-verified rate",
  "estnet throughput",
  "inet throughput",
  "traffic generator truth",
  "native rf handover truth",
  "active serving satellite",
  "active gateway assignment"
];
const FORBIDDEN_NUMERIC_RATE_PATTERNS = [
  /\b\d+(?:\.\d+)?\s*Mbps\b/i,
  /\b\d+(?:\.\d+)?\s*Gbps\b/i
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

function assertExactSet(actual, expected, label) {
  const missing = expected.filter((item) => !actual.includes(item));
  const unexpected = actual.filter((item) => !expected.includes(item));

  assert(
    missing.length === 0 && unexpected.length === 0,
    `${label} set mismatch: ${JSON.stringify({ actual, expected, missing, unexpected })}`
  );
}

function assertScreenshot(absolutePath) {
  const stat = statSync(absolutePath);
  assert(stat.size > 10_000, `Screenshot is unexpectedly small: ${absolutePath}`);
}

function assertNoForbiddenPositiveClaims(inspection) {
  const scanText = [
    inspection.visibleRouteText,
    JSON.stringify(inspection.surface),
    JSON.stringify(inspection.documentTelemetry),
    JSON.stringify(inspection.stateF09RateSurface)
  ]
    .join(" ")
    .toLowerCase();
  const phraseHits = FORBIDDEN_POSITIVE_CLAIMS.filter((claim) =>
    scanText.includes(claim)
  );
  const unitHits = FORBIDDEN_NUMERIC_RATE_PATTERNS.filter((pattern) =>
    pattern.test(scanText)
  ).map((pattern) => pattern.toString());

  assert(
    phraseHits.length === 0 && unitHits.length === 0,
    `F-09 surface contains forbidden measured/live rate claims: ${JSON.stringify({
      phraseHits,
      unitHits,
      visibleRouteText: inspection.visibleRouteText
    })}`
  );
  assert(
    inspection.stateTruthBoundary.measuredThroughput === false &&
      inspection.stateTruthBoundary.measuredLatency === false &&
      inspection.stateTruthBoundary.measuredJitter === false &&
      inspection.stateTruthBoundary.activeGatewayTruth === "not-claimed" &&
      inspection.stateTruthBoundary.activeSatelliteTruth === "not-claimed" &&
      inspection.stateTruthBoundary.nativeRfHandoverTruth === "not-claimed",
    `F-09 must preserve route truth boundary: ${JSON.stringify(
      inspection.stateTruthBoundary
    )}`
  );
}

async function waitForF09Ready(client) {
  let lastState = null;

  for (let attempt = 0; attempt < 240; attempt += 1) {
    lastState = await evaluateRuntimeValue(
      client,
      `(() => {
        const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
        const state = capture?.m8aV4GroundStationScene?.getState?.();
        const root = document.documentElement;

        return {
          bootstrapState: root?.dataset.bootstrapState ?? null,
          scenePreset: root?.dataset.scenePreset ?? null,
          hasViewer: Boolean(capture?.viewer),
          hasV4Scene: Boolean(state),
          version: state?.f09RateSurface?.version ?? null,
          telemetry: root?.dataset.m8aV4ItriF09RateSurface ?? null
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

  throw new Error(`F-09 route surface did not become ready: ${JSON.stringify(lastState)}`);
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
        const surface = productRoot?.querySelector("[data-itri-f09-rate-surface='true']");

        if (details instanceof HTMLButtonElement && sheet?.hidden) {
          details.click();
        }

        return {
          hasProductRoot: Boolean(productRoot),
          detailsExpanded: details?.getAttribute("aria-expanded") ?? null,
          sheetHidden: sheet instanceof HTMLElement ? sheet.hidden : null,
          surfaceVisible: surface instanceof HTMLElement && !surface.hidden,
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
      lastState?.surfaceRect?.width > 0 &&
      lastState?.surfaceRect?.height > 0
    ) {
      return lastState;
    }

    await sleep(100);
  }

  throw new Error(`Inspector did not expose F-09 surface: ${JSON.stringify(lastState)}`);
}

async function inspectF09Surface(client) {
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
      const state = capture?.m8aV4GroundStationScene?.getState?.();
      const productRoot = document.querySelector("[data-m8a-v47-product-ux='true']");
      const hudRoot = document.querySelector("[data-m8a-v4-ground-station-scene='true']");
      const surface = productRoot?.querySelector("[data-itri-f09-rate-surface='true']");
      const current = surface?.querySelector("[data-itri-f09-rate-current='true']");
      const table = surface?.querySelector("[data-itri-f09-rate-table='true']");
      const rows = Array.from(
        surface?.querySelectorAll("[data-itri-f09-rate-row='true']") ?? []
      ).map((row) => ({
        windowId: row.dataset.itriF09RateWindowId ?? null,
        networkSpeedClass: row.dataset.itriF09RateClass ?? null,
        orbit: row.dataset.itriF09RateOrbit ?? null,
        active: row.dataset.itriF09RateActive ?? null,
        text: normalize(row.textContent)
      }));

      return {
        requestPath: window.location.pathname + window.location.search,
        surface: {
          visible: isVisible(surface),
          version:
            surface?.dataset.itriF09RateVersion ??
            surface?.dataset.itriF09RateSurfaceVersion ??
            null,
          disposition: surface?.dataset.itriF09RateDisposition ?? null,
          externalTruthDisposition:
            surface?.dataset.itriF09ExternalTruthDisposition ?? null,
          currentClass: surface?.dataset.itriF09RateCurrentClass ?? null,
          currentBucket: surface?.dataset.itriF09RateCurrentBucket ?? null,
          provenance: surface?.dataset.itriF09RateProvenance ?? null,
          metricTruth: surface?.dataset.itriF09RateMetricTruth ?? null,
          measuredThroughputClaimed:
            surface?.dataset.itriF09MeasuredThroughputClaimed ?? null,
          visibleText: normalize(surface?.textContent),
          currentVisible: isVisible(current),
          currentAria: current?.getAttribute("aria-label") ?? null,
          tableVisible: Boolean(table),
          rows
        },
        stateF09RateSurface: state?.f09RateSurface ?? null,
        stateRequirementGapSurface: state?.requirementGapSurface ?? null,
        stateTruthBoundary: {
          measuredLatency: state?.serviceState?.measuredLatency ?? null,
          measuredJitter: state?.serviceState?.measuredJitter ?? null,
          measuredThroughput: state?.serviceState?.measuredThroughput ?? null,
          activeSatelliteTruth: state?.relationCues?.activeSatelliteTruth ?? null,
          activeGatewayTruth: state?.relationCues?.activeGatewayTruth ?? null,
          nativeRfHandoverTruth:
            state?.relationCues?.nativeRfHandoverTruth ?? null
        },
        documentTelemetry: {
          version: document.documentElement.dataset.m8aV4ItriF09RateSurface ?? null,
          disposition:
            document.documentElement.dataset.m8aV4ItriF09RateDisposition ?? null,
          externalTruthDisposition:
            document.documentElement.dataset
              .m8aV4ItriF09ExternalTruthDisposition ?? null,
          currentWindowId:
            document.documentElement.dataset.m8aV4ItriF09CurrentWindowId ?? null,
          currentClass:
            document.documentElement.dataset.m8aV4ItriF09CurrentClass ?? null,
          currentBucket:
            document.documentElement.dataset.m8aV4ItriF09CurrentBucket ?? null,
          provenance:
            document.documentElement.dataset.m8aV4ItriF09Provenance ?? null,
          metricTruth:
            document.documentElement.dataset.m8aV4ItriF09MetricTruth ?? null,
          measuredThroughputClaimed:
            document.documentElement.dataset
              .m8aV4ItriF09MeasuredThroughputClaimed ?? null,
          windowClasses:
            document.documentElement.dataset.m8aV4ItriF09WindowClasses ?? null,
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
          version: productRoot?.dataset.m8aV4ItriF09RateSurface ?? null,
          disposition: productRoot?.dataset.m8aV4ItriF09RateDisposition ?? null,
          currentClass: productRoot?.dataset.m8aV4ItriF09CurrentClass ?? null,
          measuredThroughputClaimed:
            productRoot?.dataset.m8aV4ItriF09MeasuredThroughputClaimed ?? null
        },
        hudTelemetry: {
          version: hudRoot?.dataset.itriF09RateSurface ?? null,
          disposition: hudRoot?.dataset.itriF09RateDisposition ?? null,
          currentClass: hudRoot?.dataset.itriF09CurrentClass ?? null,
          measuredThroughputClaimed:
            hudRoot?.dataset.itriF09MeasuredThroughputClaimed ?? null
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

async function main() {
  ensureOutputRoot(outputRoot);

  await withStaticSmokeBrowser(async ({ client, baseUrl }) => {
    await setViewport(client, VIEWPORT_DESKTOP);
    await client.send("Page.navigate", {
      url: `${baseUrl}${REQUEST_PATH}`
    });
    await waitForF09Ready(client);
    await waitForGlobeReady(client, "ITRI F-09 route rate disposition");
    await openInspectorForCapture(client);
    await sleep(500);

    const inspection = await inspectF09Surface(client);

    writeJsonArtifact(
      outputRoot,
      `${VIEWPORT_DESKTOP.name}-inspection.json`,
      inspection
    );

    assert(
      inspection.requestPath === REQUEST_PATH,
      `Route path changed: ${inspection.requestPath}`
    );
    assert(
      inspection.surface.visible &&
        inspection.surface.version === EXPECTED_VERSION &&
        inspection.surface.currentVisible,
      `F-09 surface must be visible and versioned: ${JSON.stringify(inspection.surface)}`
    );
    assert(
      inspection.surface.visibleText.includes("Communication Rate") &&
        inspection.surface.visibleText.includes("Modeled network-speed class") &&
        inspection.surface.visibleText.includes("Modeled, not measured.") &&
        inspection.surface.visibleText.includes("Class table fallback"),
      `F-09 visible copy missing required labels: ${inspection.surface.visibleText}`
    );
    assert(
      inspection.surface.currentAria?.includes("Modeled, not measured.") &&
        inspection.surface.currentAria?.includes("Communication rate"),
      `F-09 current class must be screen-reader-readable: ${inspection.surface.currentAria}`
    );
    assert(
      inspection.stateF09RateSurface?.version === EXPECTED_VERSION &&
        inspection.stateF09RateSurface?.disposition === EXPECTED_DISPOSITION &&
        inspection.stateF09RateSurface?.externalTruthDisposition ===
          EXPECTED_EXTERNAL_TRUTH_DISPOSITION &&
        inspection.stateF09RateSurface?.provenance === EXPECTED_PROVENANCE &&
        inspection.stateF09RateSurface?.metricTruth === EXPECTED_METRIC_TRUTH &&
        inspection.stateF09RateSurface?.measuredThroughputClaimed === false,
      `State must expose bounded F-09 disposition: ${JSON.stringify(
        inspection.stateF09RateSurface
      )}`
    );
    assert(
      inspection.surface.rows.length === 5 &&
        inspection.surface.rows.some((row) => row.active === "true") &&
        inspection.surface.rows.every(
          (row) =>
            row.text.includes(EXPECTED_PROVENANCE) &&
            row.text.includes(EXPECTED_METRIC_TRUTH)
        ),
      `F-09 fallback table must expose all modeled windows: ${JSON.stringify(
        inspection.surface.rows
      )}`
    );
    assertExactSet(
      inspection.stateF09RateSurface.rows.map(
        (row) => `${row.windowId}:${row.networkSpeedClass}`
      ),
      EXPECTED_WINDOW_CLASSES,
      "state F-09 window classes"
    );
    assert(
      inspection.documentTelemetry.version === EXPECTED_VERSION &&
        inspection.documentTelemetry.disposition === EXPECTED_DISPOSITION &&
        inspection.documentTelemetry.externalTruthDisposition ===
          EXPECTED_EXTERNAL_TRUTH_DISPOSITION &&
        inspection.documentTelemetry.provenance === EXPECTED_PROVENANCE &&
        inspection.documentTelemetry.metricTruth === EXPECTED_METRIC_TRUTH &&
        inspection.documentTelemetry.measuredThroughputClaimed === "false" &&
        inspection.productRootTelemetry.version === EXPECTED_VERSION &&
        inspection.productRootTelemetry.measuredThroughputClaimed === "false" &&
        inspection.hudTelemetry.version === EXPECTED_VERSION &&
        inspection.hudTelemetry.measuredThroughputClaimed === "false",
      `F-09 telemetry must mirror bounded truth: ${JSON.stringify({
        document: inspection.documentTelemetry,
        productRoot: inspection.productRootTelemetry,
        hud: inspection.hudTelemetry
      })}`
    );
    assertExactSet(
      parseList(inspection.documentTelemetry.windowClasses),
      EXPECTED_WINDOW_CLASSES,
      "document F-09 window classes"
    );
    assert(
      parseList(inspection.documentTelemetry.boundedRouteIds).includes("F-09") &&
        parseList(inspection.documentTelemetry.boundedRouteIds).includes("F-10") &&
        parseList(inspection.documentTelemetry.boundedRouteIds).includes("F-11") &&
        !parseList(inspection.documentTelemetry.notMountedIds).includes("F-09") &&
        !parseList(inspection.documentTelemetry.notMountedIds).includes("F-10") &&
        !parseList(inspection.documentTelemetry.notMountedIds).includes("F-11") &&
        parseList(inspection.documentTelemetry.externalValidationIds).includes("F-09"),
      `Requirement gap disposition must move F-09 into bounded route while keeping external validation open: ${JSON.stringify(
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
      `F-09 route surface must preserve bounded F-10/F-11 controls: ${JSON.stringify(
        inspection.policyRuleControls
      )}`
    );
    assertNoForbiddenPositiveClaims(inspection);

    const screenshot = await captureScreenshot(
      client,
      outputRoot,
      `${VIEWPORT_DESKTOP.name}.png`
    );
    assertScreenshot(screenshot);
  });

  console.log(`ITRI F-09 route rate disposition validated. Output: ${outputRoot}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
