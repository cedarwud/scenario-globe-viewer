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
  "output/itri-demo-route-requirement-gap-surface"
);

const REQUEST_PATH = "/?scenePreset=regional&m8aV4GroundStationScene=1";
const EXPECTED_VERSION = "itri-demo-route-requirement-gap-surface-runtime.v1";
const EXPECTED_DEMO_POLISH_DISPOSITION = "demo-polish-no-requirement-closure";
const EXPECTED_TRUTH_LABELS = [
  "bounded-route-representation",
  "bounded-repo-owned-seam",
  "external-validation-required"
];
const EXPECTED_GROUPS = {
  "route-owned-visual-baseline": {
    status: "closed",
    disposition: "true-route-closure",
    ids: ["F-04", "F-05", "F-14", "V-01", "D-01"]
  },
  "bounded-route-representation": {
    status: "bounded",
    disposition: "bounded-route-representation",
    ids: ["F-02", "F-03", "F-06", "F-09", "F-10", "F-11", "F-12", "F-15", "F-16", "D-02", "D-03"]
  },
  "bounded-repo-owned-seam": {
    status: "open",
    disposition: "bounded-repo-owned-seam",
    ids: ["F-07", "F-08", "F-17", "F-18", "P-01", "P-02", "P-03"]
  },
  "not-mounted-route-gap": {
    status: "open",
    disposition: "not-in-this-route",
    ids: []
  },
  "external-validation-gap": {
    status: "open",
    disposition: "external-validation-required",
    ids: ["F-01", "F-09", "F-10", "F-11", "F-13", "F-16", "V-02", "V-03", "V-04", "V-05", "V-06"]
  }
};
const EXPECTED_OPEN_IDS = [
  ...EXPECTED_GROUPS["bounded-repo-owned-seam"].ids,
  ...EXPECTED_GROUPS["not-mounted-route-gap"].ids,
  ...EXPECTED_GROUPS["external-validation-gap"].ids
];
const VIEWPORT_DESKTOP = {
  name: "desktop-1440x900",
  width: 1440,
  height: 900
};
const FORBIDDEN_POSITIVE_CLAIMS = [
  "measured throughput",
  "measured latency",
  "measured jitter",
  "live iperf",
  "iperf closure",
  "native rf handover truth",
  "500 leo validated",
  ">=500 leo validated",
  "external report truth ready"
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
    `${label} missing expected values: ${JSON.stringify({ actual, missing })}`
  );
}

function assertExactSet(actual, expected, label) {
  assertIncludesAll(actual, expected, label);
  const unexpected = actual.filter((item) => !expected.includes(item));

  assert(
    unexpected.length === 0,
    `${label} has unexpected values: ${JSON.stringify({ actual, unexpected })}`
  );
}

function assertGroup(group, expected) {
  assert(group, `Missing ITRI requirement gap group: ${JSON.stringify(expected)}`);
  assert(
    group.status === expected.status,
    `Group status mismatch: ${JSON.stringify({ group, expected })}`
  );
  assert(
    group.disposition === expected.disposition,
    `Group disposition mismatch: ${JSON.stringify({ group, expected })}`
  );
  assertExactSet(group.requirementIds, expected.ids, `Group ${group.groupId}`);
  assert(
    group.visibleText.includes(expected.status),
    `Group must visibly expose status: ${JSON.stringify(group)}`
  );
  assert(
    expected.ids.every((id) => group.visibleText.includes(id)),
    `Visible IDs for ${group.groupId} missing expected values: ${JSON.stringify({
      visibleText: group.visibleText,
      expectedIds: expected.ids
    })}`
  );
}

function assertNoForbiddenPositiveClaims(inspection) {
  const scanText = [
    inspection.visibleRouteText,
    JSON.stringify(inspection.documentTelemetry),
    JSON.stringify(inspection.productRootTelemetry),
    JSON.stringify(inspection.stateRequirementGapSurface)
  ]
    .join(" ")
    .toLowerCase();
  const hits = FORBIDDEN_POSITIVE_CLAIMS.filter((claim) =>
    scanText.includes(claim)
  );

  assert(
    hits.length === 0,
    `Requirement gap surface contains forbidden positive claims: ${JSON.stringify({
      hits,
      visibleRouteText: inspection.visibleRouteText
    })}`
  );
  assert(
    inspection.stateTruthBoundary.measuredLatency === false &&
      inspection.stateTruthBoundary.measuredJitter === false &&
      inspection.stateTruthBoundary.measuredThroughput === false &&
      inspection.stateTruthBoundary.activeSatelliteTruth === "not-claimed" &&
      inspection.stateTruthBoundary.activeGatewayTruth === "not-claimed" &&
      inspection.stateTruthBoundary.nativeRfHandoverTruth === "not-claimed",
    `Truth boundary must remain modeled/not-measured: ${JSON.stringify(
      inspection.stateTruthBoundary
    )}`
  );
}

async function waitForRequirementGapReady(client) {
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
          version: state?.requirementGapSurface?.version ?? null,
          telemetry: root.dataset.m8aV4ItriRequirementGapSurface ?? null
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

  throw new Error(
    `ITRI requirement gap surface did not become ready: ${JSON.stringify(
      lastState
    )}`
  );
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
        const surface = productRoot?.querySelector("[data-itri-requirement-gap-surface='true']");

        if (details instanceof HTMLButtonElement && sheet?.hidden) {
          details.click();
        }

        return {
          hasProductRoot: Boolean(productRoot),
          detailsExpanded: details?.getAttribute("aria-expanded") ?? null,
          sheetHidden: sheet instanceof HTMLElement ? sheet.hidden : null,
          sheetRect: sheet instanceof HTMLElement
            ? {
                width: sheet.getBoundingClientRect().width,
                height: sheet.getBoundingClientRect().height
              }
            : null,
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
      lastState?.sheetRect?.width > 0 &&
      lastState?.sheetRect?.height > 0 &&
      lastState?.surfaceRect?.width > 0 &&
      lastState?.surfaceRect?.height > 0
    ) {
      return lastState;
    }

    await sleep(100);
  }

  throw new Error(
    `Inspector did not open requirement gap surface: ${JSON.stringify(lastState)}`
  );
}

async function inspectRequirementGapSurface(client) {
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
      const toList = (value) => String(value ?? "").split("|").filter(Boolean);
      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      const state = capture?.m8aV4GroundStationScene?.getState?.();
      const productRoot = document.querySelector("[data-m8a-v47-product-ux='true']");
      const hudRoot = document.querySelector("[data-m8a-v4-ground-station-scene='true']");
      const surface = productRoot?.querySelector("[data-itri-requirement-gap-surface='true']");
      const groups = Array.from(
        surface?.querySelectorAll("[data-itri-requirement-gap-group='true']") ?? []
      ).map((group) => ({
        groupId: group.dataset.itriRequirementGapGroupId ?? null,
        status: group.dataset.itriRequirementGapStatus ?? null,
        disposition: group.dataset.itriRequirementGapDisposition ?? null,
        requirementIds: toList(group.dataset.itriRequirementGapRequirementIds),
        visibleText: normalize(group.textContent),
        visible: isVisible(group)
      }));
      const visibleRouteText = normalize(productRoot?.innerText);

      return {
        requestPath: window.location.pathname + window.location.search,
        surfaceVisible: isVisible(surface),
        surfaceVersion: surface?.dataset.itriRequirementGapVersion ?? null,
        demoPolishDisposition:
          surface
            ?.querySelector("[data-itri-requirement-gap-demo-polish]")
            ?.dataset.itriRequirementGapDemoPolish ?? null,
        groups,
        visibleRouteText,
        stateRequirementGapSurface: state?.requirementGapSurface ?? null,
        stateTruthBoundary: {
          measuredLatency: state?.serviceState?.measuredLatency ?? null,
          measuredJitter: state?.serviceState?.measuredJitter ?? null,
          measuredThroughput: state?.serviceState?.measuredThroughput ?? null,
          activeSatelliteTruth: state?.relationCues?.activeSatelliteTruth ?? null,
          activeGatewayTruth: state?.relationCues?.activeGatewayTruth ?? null,
          pairSpecificTeleportPathTruth:
            state?.relationCues?.pairSpecificTeleportPathTruth ?? null,
          nativeRfHandoverTruth:
            state?.relationCues?.nativeRfHandoverTruth ?? null
        },
        documentTelemetry: {
          version: document.documentElement.dataset.m8aV4ItriRequirementGapSurface ?? null,
          truthLabels:
            document.documentElement.dataset.m8aV4ItriRequirementGapTruthLabels ?? null,
          groupIds:
            document.documentElement.dataset.m8aV4ItriRequirementGapGroupIds ?? null,
          groupStatuses:
            document.documentElement.dataset.m8aV4ItriRequirementGapGroupStatuses ?? null,
          groupDispositions:
            document.documentElement.dataset
              .m8aV4ItriRequirementGapGroupDispositions ?? null,
          openIds:
            document.documentElement.dataset.m8aV4ItriRequirementGapOpenIds ?? null,
          notMountedIds:
            document.documentElement.dataset.m8aV4ItriRequirementGapNotMountedIds ?? null,
          externalValidationIds:
            document.documentElement.dataset
              .m8aV4ItriRequirementGapExternalValidationIds ?? null,
          repoSeamIds:
            document.documentElement.dataset.m8aV4ItriRequirementGapRepoSeamIds ?? null,
          boundedRouteIds:
            document.documentElement.dataset.m8aV4ItriRequirementGapBoundedRouteIds ?? null,
          routeBaselineIds:
            document.documentElement.dataset.m8aV4ItriRequirementGapRouteBaselineIds ?? null,
          demoPolishDisposition:
            document.documentElement.dataset.m8aV4ItriDemoPolishDisposition ?? null,
          routeNativeMeasuredTruthClaimed:
            document.documentElement.dataset
              .m8aV4ItriRouteNativeMeasuredTruthClaimed ?? null
        },
        productRootTelemetry: {
          version: productRoot?.dataset.m8aV4ItriRequirementGapSurface ?? null,
          truthLabels: productRoot?.dataset.m8aV4ItriRequirementGapTruthLabels ?? null,
          openIds: productRoot?.dataset.m8aV4ItriRequirementGapOpenIds ?? null,
          notMountedIds:
            productRoot?.dataset.m8aV4ItriRequirementGapNotMountedIds ?? null,
          externalValidationIds:
            productRoot?.dataset.m8aV4ItriRequirementGapExternalValidationIds ?? null,
          repoSeamIds:
            productRoot?.dataset.m8aV4ItriRequirementGapRepoSeamIds ?? null,
          boundedRouteIds:
            productRoot?.dataset.m8aV4ItriRequirementGapBoundedRouteIds ?? null,
          routeBaselineIds:
            productRoot?.dataset.m8aV4ItriRequirementGapRouteBaselineIds ?? null,
          demoPolishDisposition:
            productRoot?.dataset.m8aV4ItriDemoPolishDisposition ?? null,
          routeNativeMeasuredTruthClaimed:
            productRoot?.dataset.m8aV4ItriRouteNativeMeasuredTruthClaimed ?? null
        },
        hudTelemetry: {
          version: hudRoot?.dataset.itriRequirementGapSurface ?? null,
          openIds: hudRoot?.dataset.itriRequirementGapOpenIds ?? null
        },
        policyRuleControls: {
          surfacePresent: Boolean(
            document.querySelector("[data-itri-policy-rule-controls-surface='true']")
          ),
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
        }
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
    await waitForRequirementGapReady(client);
    await waitForGlobeReady(client, "ITRI requirement gap surface");
    await openInspectorForCapture(client);
    await sleep(500);

    const inspection = await inspectRequirementGapSurface(client);

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
      inspection.surfaceVisible && inspection.surfaceVersion === EXPECTED_VERSION,
      `Requirement gap surface not visible/versioned: ${JSON.stringify(inspection)}`
    );
    assert(
      inspection.demoPolishDisposition === EXPECTED_DEMO_POLISH_DISPOSITION,
      `Demo polish disposition changed: ${JSON.stringify(inspection)}`
    );
    assert(
      inspection.groups.length === Object.keys(EXPECTED_GROUPS).length &&
        inspection.groups.every((group) => group.visible),
      `Expected compact visible groups: ${JSON.stringify(inspection.groups)}`
    );

    for (const [groupId, expected] of Object.entries(EXPECTED_GROUPS)) {
      assertGroup(
        inspection.groups.find((group) => group.groupId === groupId),
        { ...expected, groupId }
      );
    }

    assert(
      inspection.stateRequirementGapSurface?.version === EXPECTED_VERSION,
      `State must expose requirement gap surface: ${JSON.stringify(
        inspection.stateRequirementGapSurface
      )}`
    );
    assertExactSet(
      inspection.stateRequirementGapSurface.truthBoundaryLabels,
      EXPECTED_TRUTH_LABELS,
      "state truth labels"
    );
    assertExactSet(
      inspection.stateRequirementGapSurface.openRequirementIds,
      EXPECTED_OPEN_IDS,
      "state open IDs"
    );
    assert(
      inspection.stateRequirementGapSurface.routeNativeMeasuredTruthClaimed === false,
      `Route-native measured truth must remain false: ${JSON.stringify(
        inspection.stateRequirementGapSurface
      )}`
    );

    assert(
      inspection.documentTelemetry.version === EXPECTED_VERSION &&
        inspection.productRootTelemetry.version === EXPECTED_VERSION &&
        inspection.hudTelemetry.version === EXPECTED_VERSION,
      `Telemetry must mirror surface version: ${JSON.stringify({
        document: inspection.documentTelemetry,
        productRoot: inspection.productRootTelemetry,
        hud: inspection.hudTelemetry
      })}`
    );
    assertExactSet(
      parseList(inspection.documentTelemetry.truthLabels),
      EXPECTED_TRUTH_LABELS,
      "document truth labels"
    );
    assertExactSet(
      parseList(inspection.documentTelemetry.openIds),
      EXPECTED_OPEN_IDS,
      "document open IDs"
    );
    assertExactSet(
      parseList(inspection.documentTelemetry.notMountedIds),
      EXPECTED_GROUPS["not-mounted-route-gap"].ids,
      "document not-mounted IDs"
    );
    assertExactSet(
      parseList(inspection.documentTelemetry.externalValidationIds),
      EXPECTED_GROUPS["external-validation-gap"].ids,
      "document external validation IDs"
    );
    assertExactSet(
      parseList(inspection.documentTelemetry.repoSeamIds),
      EXPECTED_GROUPS["bounded-repo-owned-seam"].ids,
      "document repo seam IDs"
    );
    assertExactSet(
      parseList(inspection.documentTelemetry.boundedRouteIds),
      EXPECTED_GROUPS["bounded-route-representation"].ids,
      "document bounded route IDs"
    );
    assertExactSet(
      parseList(inspection.documentTelemetry.routeBaselineIds),
      EXPECTED_GROUPS["route-owned-visual-baseline"].ids,
      "document route baseline IDs"
    );
    assert(
      inspection.documentTelemetry.demoPolishDisposition ===
        EXPECTED_DEMO_POLISH_DISPOSITION &&
        inspection.documentTelemetry.routeNativeMeasuredTruthClaimed === "false" &&
        inspection.productRootTelemetry.routeNativeMeasuredTruthClaimed === "false",
      `Telemetry must preserve no-closure/no-measured-truth boundary: ${JSON.stringify({
        document: inspection.documentTelemetry,
        productRoot: inspection.productRootTelemetry
      })}`
    );
    assertExactSet(
      parseList(inspection.hudTelemetry.openIds),
      EXPECTED_OPEN_IDS,
      "hidden HUD open IDs"
    );
    assert(
      inspection.policyRuleControls.surfacePresent &&
        inspection.policyRuleControls.version ===
          "itri-demo-route-policy-rule-controls-runtime.v1" &&
        inspection.policyRuleControls.truthBoundary ===
          "modeled-policy-demo-not-live-control" &&
        inspection.policyRuleControls.policySelector &&
        inspection.policyRuleControls.rulePreset,
      `Route gap surface must expose bounded F-10/F-11 controls: ${JSON.stringify(
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

  console.log(`ITRI requirement gap surface validated. Output: ${outputRoot}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
