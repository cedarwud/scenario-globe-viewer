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
  "output/itri-demo-route-policy-rule-controls"
);

const REQUEST_PATH = "/?scenePreset=regional&m8aV4GroundStationScene=1";
const EXPECTED_VERSION = "itri-demo-route-policy-rule-controls-runtime.v1";
const EXPECTED_DISPOSITION = "bounded-route-representation";
const EXPECTED_EXTERNAL_TRUTH_DISPOSITION = "external-validation-required";
const EXPECTED_TRUTH_BOUNDARY = "modeled-policy-demo-not-live-control";
const EXPECTED_EXPORT_ADJACENT_TRUTH =
  "modeled-replay-preset-state-not-live-control";
const EXPECTED_POLICY_MODE =
  "modeled-replay-policy-preset-not-live-control";
const EXPECTED_RULE_MODE =
  "bounded-replay-rule-parameter-preset-not-live-control";
const DEFAULT_POLICY_PRESET = "balanced-continuity-review";
const DEFAULT_RULE_PRESET = "standard-window-thresholds";
const ALT_POLICY_PRESET = "candidate-first-review";
const ALT_RULE_PRESET = "guard-hold-review";
const EXPECTED_POLICY_PRESETS = [
  "balanced-continuity-review",
  "candidate-first-review",
  "continuity-guard-review"
];
const EXPECTED_RULE_PRESETS = [
  "standard-window-thresholds",
  "early-candidate-review",
  "guard-hold-review"
];
const EXPECTED_ENDPOINT_PAIR =
  "taiwan-cht-speedcast-singapore-operator-family-2026-04-26";
const EXPECTED_PRECISION = "operator-family-only";
const EXPECTED_LINK_FLOW_VERSION = "m8a-v4-link-flow-direction-cue-runtime.v1";
const EXPECTED_LINK_FLOW_MODE =
  "uplink-downlink-arrow-segments-with-moving-packet-trails";
const EXPECTED_LINK_FLOW_TRUTH =
  "modeled-direction-cue-not-packet-capture-or-measured-throughput";
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
    `${label} mismatch: ${JSON.stringify({ actual, expected, missing, unexpected })}`
  );
}

function assertScreenshot(absolutePath) {
  const stat = statSync(absolutePath);
  assert(stat.size > 10_000, `Screenshot is unexpectedly small: ${absolutePath}`);
}

async function waitForPolicyRuleReady(client) {
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
          version: state?.policyRuleControls?.version ?? null,
          telemetry: root?.dataset.m8aV4ItriPolicyRuleControlsSurface ?? null
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
    `F-10/F-11 policy/rule controls did not become ready: ${JSON.stringify(
      lastState
    )}`
  );
}

async function openInspectorForCapture(client) {
  let lastState = null;

  for (let attempt = 0; attempt < 40; attempt += 1) {
    lastState = await evaluateRuntimeValue(
      client,
      `(() => {
        const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
        capture?.m8aV4GroundStationScene?.pause?.();

        const productRoot = document.querySelector("[data-m8a-v47-product-ux='true']");
        const evidence = productRoot?.querySelector("[data-m8a-v47-control-id='evidence-toggle']");
        const sheet = productRoot?.querySelector("[data-m8a-v48-inspector='true']");
        const surface = productRoot?.querySelector("[data-itri-policy-rule-controls-surface='true']");

        if (
          evidence instanceof HTMLButtonElement &&
          (sheet?.hidden || productRoot?.dataset.m8aV411InspectorActiveTab !== "evidence")
        ) {
          evidence.click();
        }
        if (surface instanceof HTMLElement) {
          surface.scrollIntoView({ block: "center" });
        }

        return {
          hasProductRoot: Boolean(productRoot),
          evidenceExpanded: evidence?.getAttribute("aria-expanded") ?? null,
          activeTab: productRoot?.dataset.m8aV411InspectorActiveTab ?? null,
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
      lastState?.evidenceExpanded === "true" &&
      lastState?.activeTab === "evidence" &&
      lastState?.sheetHidden === false &&
      lastState?.surfaceVisible &&
      lastState?.surfaceRect?.width > 0 &&
      lastState?.surfaceRect?.height > 0
    ) {
      return lastState;
    }

    await sleep(100);
  }

  throw new Error(
    `Inspector did not expose F-10/F-11 controls: ${JSON.stringify(lastState)}`
  );
}

async function inspectPolicyRuleControls(client) {
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
      const optionValues = (select) =>
        Array.from(select?.querySelectorAll("option") ?? []).map((option) => option.value);
      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      const state = capture?.m8aV4GroundStationScene?.getState?.();
      const productRoot = document.querySelector("[data-m8a-v47-product-ux='true']");
      const hudRoot = document.querySelector("[data-m8a-v4-ground-station-scene='true']");
      const surface = productRoot?.querySelector("[data-itri-policy-rule-controls-surface='true']");
      const policySelect = productRoot?.querySelector("[data-itri-f10-policy-selector='true']");
      const ruleSelect = productRoot?.querySelector("[data-itri-f11-rule-preset='true']");
      const policyPreview = productRoot?.querySelector("[data-itri-f10-policy-preview='true']");
      const rulePreview = productRoot?.querySelector("[data-itri-f11-rule-preview='true']");
      const ruleChips = Array.from(
        productRoot?.querySelectorAll("[data-itri-f11-rule-parameter-chip='true']") ?? []
      ).map((chip) => normalize(chip.textContent));
      const status = productRoot?.querySelector("[data-itri-policy-rule-status='true']");

      return {
        requestPath: window.location.pathname + window.location.search,
        surface: {
          visible: isVisible(surface),
          version: surface?.dataset.itriPolicyRuleControlsVersion ?? null,
          disposition: surface?.dataset.itriPolicyRuleControlsDisposition ?? null,
          externalTruthDisposition:
            surface?.dataset.itriPolicyRuleExternalTruthDisposition ?? null,
          truthBoundary: surface?.dataset.itriPolicyRuleTruthBoundary ?? null,
          exportAdjacentTruth:
            surface?.dataset.itriPolicyRuleExportAdjacentTruth ?? null,
          routeOwnedStateOnly:
            surface?.dataset.itriPolicyRuleRouteOwnedStateOnly ?? null,
          liveControlClaimed:
            surface?.dataset.itriPolicyRuleLiveControlClaimed ?? null,
          arbitraryRuleEditorClaimed:
            surface?.dataset.itriPolicyRuleArbitraryRuleEditorClaimed ?? null,
          measuredDecisionTruthClaimed:
            surface?.dataset.itriPolicyRuleMeasuredDecisionTruthClaimed ?? null,
          visibleText: normalize(surface?.innerText)
        },
        controls: {
          policyVisible: isVisible(policySelect),
          policyValue: policySelect?.value ?? null,
          policyAria: policySelect?.getAttribute("aria-label") ?? null,
          policyOptions: optionValues(policySelect),
          ruleVisible: isVisible(ruleSelect),
          ruleValue: ruleSelect?.value ?? null,
          ruleAria: ruleSelect?.getAttribute("aria-label") ?? null,
          ruleOptions: optionValues(ruleSelect),
          policyPreview: normalize(policyPreview?.textContent),
          rulePreview: normalize(rulePreview?.textContent),
          ruleChips,
          statusText: normalize(status?.textContent)
        },
        statePolicyRuleControls: state?.policyRuleControls ?? null,
        routeInvariants: {
          endpointPairId: state?.simulationHandoverModel?.endpointPairId ?? null,
          precision: state?.simulationHandoverModel?.acceptedPairPrecision ?? null,
          actorCounts: {
            leo: state?.orbitActorCounts?.leo ?? null,
            meo: state?.orbitActorCounts?.meo ?? null,
            geo: state?.orbitActorCounts?.geo ?? null,
            total: state?.actorCount ?? null
          },
          f09Disposition: state?.f09RateSurface?.disposition ?? null,
          f09MeasuredThroughputClaimed:
            state?.f09RateSurface?.measuredThroughputClaimed ?? null,
          f16Disposition: state?.f16ExportSurface?.disposition ?? null,
          f16MeasuredValuesIncluded:
            state?.f16ExportSurface?.measuredValuesIncluded ?? null,
          f16ExternalReportTruthClaimed:
            state?.f16ExportSurface?.externalReportSystemTruthClaimed ?? null,
          linkFlowVersion: state?.relationCues?.dataFlowCueVersion ?? null,
          linkFlowMode: state?.relationCues?.dataFlowCueMode ?? null,
          linkFlowTruth: state?.relationCues?.dataFlowTruthBoundary ?? null
        },
        documentTelemetry: {
          version:
            document.documentElement.dataset.m8aV4ItriPolicyRuleControlsSurface ?? null,
          disposition:
            document.documentElement.dataset
              .m8aV4ItriPolicyRuleControlsDisposition ?? null,
          externalTruthDisposition:
            document.documentElement.dataset
              .m8aV4ItriPolicyRuleExternalTruthDisposition ?? null,
          truthBoundary:
            document.documentElement.dataset
              .m8aV4ItriPolicyRuleTruthBoundary ?? null,
          exportAdjacentTruth:
            document.documentElement.dataset
              .m8aV4ItriPolicyRuleExportAdjacentTruth ?? null,
          policyPresetId:
            document.documentElement.dataset.m8aV4ItriF10PolicyPresetId ?? null,
          policyPresetLabel:
            document.documentElement.dataset.m8aV4ItriF10PolicyPresetLabel ?? null,
          policyPresetMode:
            document.documentElement.dataset.m8aV4ItriF10PolicyPresetMode ?? null,
          policyPresetIds:
            document.documentElement.dataset.m8aV4ItriF10PolicyPresetIds ?? null,
          rulePresetId:
            document.documentElement.dataset.m8aV4ItriF11RulePresetId ?? null,
          rulePresetLabel:
            document.documentElement.dataset.m8aV4ItriF11RulePresetLabel ?? null,
          rulePresetMode:
            document.documentElement.dataset.m8aV4ItriF11RulePresetMode ?? null,
          rulePresetIds:
            document.documentElement.dataset.m8aV4ItriF11RulePresetIds ?? null,
          ruleParameterChips:
            document.documentElement.dataset.m8aV4ItriF11RuleParameterChips ?? null,
          routeOwnedStateOnly:
            document.documentElement.dataset
              .m8aV4ItriPolicyRuleRouteOwnedStateOnly ?? null,
          liveControlClaimed:
            document.documentElement.dataset
              .m8aV4ItriPolicyRuleLiveControlClaimed ?? null,
          backendControlClaimed:
            document.documentElement.dataset
              .m8aV4ItriPolicyRuleBackendControlClaimed ?? null,
          networkControlClaimed:
            document.documentElement.dataset
              .m8aV4ItriPolicyRuleNetworkControlClaimed ?? null,
          arbitraryRuleEditorClaimed:
            document.documentElement.dataset
              .m8aV4ItriPolicyRuleArbitraryRuleEditorClaimed ?? null,
          measuredDecisionTruthClaimed:
            document.documentElement.dataset
              .m8aV4ItriPolicyRuleMeasuredDecisionTruthClaimed ?? null,
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
          version:
            productRoot?.dataset.m8aV4ItriPolicyRuleControlsSurface ?? null,
          policyPresetId:
            productRoot?.dataset.m8aV4ItriF10PolicyPresetId ?? null,
          rulePresetId:
            productRoot?.dataset.m8aV4ItriF11RulePresetId ?? null,
          liveControlClaimed:
            productRoot?.dataset.m8aV4ItriPolicyRuleLiveControlClaimed ?? null
        },
        hudTelemetry: {
          version: hudRoot?.dataset.itriPolicyRuleControlsSurface ?? null,
          disposition: hudRoot?.dataset.itriPolicyRuleControlsDisposition ?? null,
          truthBoundary: hudRoot?.dataset.itriPolicyRuleTruthBoundary ?? null,
          policyPresetId: hudRoot?.dataset.itriF10PolicyPresetId ?? null,
          rulePresetId: hudRoot?.dataset.itriF11RulePresetId ?? null,
          liveControlClaimed:
            hudRoot?.dataset.itriPolicyRuleLiveControlClaimed ?? null
        }
      };
    })()`
  );
}

async function setPresetCombination(client, policyPresetId, rulePresetId) {
  const result = await evaluateRuntimeValue(
    client,
    `((policyPresetId, rulePresetId) => {
      const policySelect = document.querySelector("[data-itri-f10-policy-selector='true']");
      const ruleSelect = document.querySelector("[data-itri-f11-rule-preset='true']");

      if (!(policySelect instanceof HTMLSelectElement) || !(ruleSelect instanceof HTMLSelectElement)) {
        return { changed: false };
      }

      policySelect.value = policyPresetId;
      policySelect.dispatchEvent(new Event("change", { bubbles: true }));
      ruleSelect.value = rulePresetId;
      ruleSelect.dispatchEvent(new Event("change", { bubbles: true }));

      return {
        changed: true,
        policyValue: policySelect.value,
        ruleValue: ruleSelect.value
      };
    })(${JSON.stringify(policyPresetId)}, ${JSON.stringify(rulePresetId)})`
  );

  assert(result?.changed === true, `Unable to change presets: ${JSON.stringify(result)}`);
}

async function waitForPresetCombination(client, policyPresetId, rulePresetId) {
  let lastInspection = null;

  for (let attempt = 0; attempt < 80; attempt += 1) {
    lastInspection = await inspectPolicyRuleControls(client);

    if (
      lastInspection.controls.policyValue === policyPresetId &&
      lastInspection.controls.ruleValue === rulePresetId &&
      lastInspection.statePolicyRuleControls?.activePolicyPreset?.presetId ===
        policyPresetId &&
      lastInspection.statePolicyRuleControls?.activeRulePreset?.presetId ===
        rulePresetId &&
      lastInspection.documentTelemetry.policyPresetId === policyPresetId &&
      lastInspection.documentTelemetry.rulePresetId === rulePresetId
    ) {
      return lastInspection;
    }

    await sleep(100);
  }

  throw new Error(
    `Preset combination did not settle: ${JSON.stringify(lastInspection)}`
  );
}

function assertRouteInvariants(inspection) {
  assert(
    inspection.requestPath === REQUEST_PATH,
    `Route path changed: ${inspection.requestPath}`
  );
  assert(
    inspection.routeInvariants.endpointPairId === EXPECTED_ENDPOINT_PAIR &&
      inspection.routeInvariants.precision === EXPECTED_PRECISION,
    `Endpoint pair or precision changed: ${JSON.stringify(
      inspection.routeInvariants
    )}`
  );
  assert(
    inspection.routeInvariants.actorCounts.leo === EXPECTED_ACTOR_COUNTS.leo &&
      inspection.routeInvariants.actorCounts.meo === EXPECTED_ACTOR_COUNTS.meo &&
      inspection.routeInvariants.actorCounts.geo === EXPECTED_ACTOR_COUNTS.geo &&
      inspection.routeInvariants.actorCounts.total === EXPECTED_ACTOR_COUNTS.total,
    `Actor counts changed: ${JSON.stringify(inspection.routeInvariants.actorCounts)}`
  );
  assert(
    inspection.routeInvariants.f09Disposition === EXPECTED_DISPOSITION &&
      inspection.routeInvariants.f09MeasuredThroughputClaimed === false,
    `F-09 bounded disposition changed: ${JSON.stringify(inspection.routeInvariants)}`
  );
  assert(
    inspection.routeInvariants.f16Disposition === EXPECTED_DISPOSITION &&
      inspection.routeInvariants.f16MeasuredValuesIncluded === false &&
      inspection.routeInvariants.f16ExternalReportTruthClaimed === false,
    `F-16 bounded disposition changed: ${JSON.stringify(inspection.routeInvariants)}`
  );
  assert(
    inspection.routeInvariants.linkFlowVersion === EXPECTED_LINK_FLOW_VERSION &&
      inspection.routeInvariants.linkFlowMode === EXPECTED_LINK_FLOW_MODE &&
      inspection.routeInvariants.linkFlowTruth === EXPECTED_LINK_FLOW_TRUTH,
    `Link-flow cue changed: ${JSON.stringify(inspection.routeInvariants)}`
  );
}

function assertPolicyRuleSurface(inspection, expectedPolicy, expectedRule) {
  assert(
    inspection.surface.visible &&
      inspection.surface.version === EXPECTED_VERSION &&
      inspection.surface.disposition === EXPECTED_DISPOSITION &&
      inspection.surface.externalTruthDisposition ===
        EXPECTED_EXTERNAL_TRUTH_DISPOSITION &&
      inspection.surface.truthBoundary === EXPECTED_TRUTH_BOUNDARY &&
      inspection.surface.exportAdjacentTruth === EXPECTED_EXPORT_ADJACENT_TRUTH &&
      inspection.surface.routeOwnedStateOnly === "true" &&
      inspection.surface.liveControlClaimed === "false" &&
      inspection.surface.arbitraryRuleEditorClaimed === "false" &&
      inspection.surface.measuredDecisionTruthClaimed === "false",
    `Policy/rule surface must be visible and bounded: ${JSON.stringify(
      inspection.surface
    )}`
  );
  assert(
    inspection.surface.visibleText.includes("F-10/F-11") &&
      inspection.surface.visibleText.includes("Modeled Replay Presets") &&
      inspection.surface.visibleText.includes("Preset-only") &&
      inspection.surface.visibleText.includes("not live control") &&
      inspection.surface.visibleText.includes("Route-local modeled replay preset controls"),
    `Visible copy must preserve modeled preset boundary: ${inspection.surface.visibleText}`
  );
  assert(
    inspection.controls.policyVisible &&
      inspection.controls.ruleVisible &&
      inspection.controls.policyValue === expectedPolicy &&
      inspection.controls.ruleValue === expectedRule,
    `Preset controls not active as expected: ${JSON.stringify(inspection.controls)}`
  );
  assert(
    inspection.controls.policyAria?.includes("modeled replay policy preset") &&
      inspection.controls.policyAria?.includes("not live control") &&
      inspection.controls.ruleAria?.includes("bounded replay rule and parameter preset") &&
      inspection.controls.ruleAria?.includes("not live control"),
    `ARIA labels must state modeled/replay/preset/not-live boundary: ${JSON.stringify(
      inspection.controls
    )}`
  );
  assertExactSet(
    inspection.controls.policyOptions,
    EXPECTED_POLICY_PRESETS,
    "policy select options"
  );
  assertExactSet(
    inspection.controls.ruleOptions,
    EXPECTED_RULE_PRESETS,
    "rule select options"
  );
  assert(
    inspection.controls.policyPreview.includes("Modeled replay preview") &&
      inspection.controls.policyPreview.includes("Preset only") &&
      inspection.controls.rulePreview.includes("Bounded replay rule preset") &&
      inspection.controls.rulePreview.includes("Preset only") &&
      inspection.controls.statusText.includes("Modeled replay presets") &&
      inspection.controls.statusText.includes("not live control") &&
      inspection.controls.ruleChips.length === 3,
    `Preview copy must stay bounded to modeled replay presets: ${JSON.stringify(
      inspection.controls
    )}`
  );
}

function assertStateAndTelemetry(inspection, expectedPolicy, expectedRule) {
  const state = inspection.statePolicyRuleControls;

  assert(
    state?.version === EXPECTED_VERSION &&
      state?.disposition === EXPECTED_DISPOSITION &&
      state?.externalTruthDisposition === EXPECTED_EXTERNAL_TRUTH_DISPOSITION &&
      state?.truthBoundary === EXPECTED_TRUTH_BOUNDARY &&
      state?.exportAdjacentTruth === EXPECTED_EXPORT_ADJACENT_TRUTH &&
      state?.policyPresetMode === EXPECTED_POLICY_MODE &&
      state?.rulePresetMode === EXPECTED_RULE_MODE &&
      state?.defaultPolicyPresetId === DEFAULT_POLICY_PRESET &&
      state?.defaultRulePresetId === DEFAULT_RULE_PRESET &&
      state?.activePolicyPreset?.presetId === expectedPolicy &&
      state?.activeRulePreset?.presetId === expectedRule &&
      state?.routeOwnedStateOnly === true &&
      state?.liveControlClaimed === false &&
      state?.backendControlClaimed === false &&
      state?.networkControlClaimed === false &&
      state?.arbitraryRuleEditorClaimed === false &&
      state?.measuredDecisionTruthClaimed === false,
    `State must expose bounded preset-only controls: ${JSON.stringify(state)}`
  );
  assertExactSet(
    state.policyPresets.map((preset) => preset.presetId),
    EXPECTED_POLICY_PRESETS,
    "state policy presets"
  );
  assertExactSet(
    state.rulePresets.map((preset) => preset.presetId),
    EXPECTED_RULE_PRESETS,
    "state rule presets"
  );
  assert(
    inspection.documentTelemetry.version === EXPECTED_VERSION &&
      inspection.documentTelemetry.disposition === EXPECTED_DISPOSITION &&
      inspection.documentTelemetry.externalTruthDisposition ===
        EXPECTED_EXTERNAL_TRUTH_DISPOSITION &&
      inspection.documentTelemetry.truthBoundary === EXPECTED_TRUTH_BOUNDARY &&
      inspection.documentTelemetry.exportAdjacentTruth ===
        EXPECTED_EXPORT_ADJACENT_TRUTH &&
      inspection.documentTelemetry.policyPresetId === expectedPolicy &&
      inspection.documentTelemetry.rulePresetId === expectedRule &&
      inspection.documentTelemetry.policyPresetMode === EXPECTED_POLICY_MODE &&
      inspection.documentTelemetry.rulePresetMode === EXPECTED_RULE_MODE &&
      inspection.documentTelemetry.routeOwnedStateOnly === "true" &&
      inspection.documentTelemetry.liveControlClaimed === "false" &&
      inspection.documentTelemetry.backendControlClaimed === "false" &&
      inspection.documentTelemetry.networkControlClaimed === "false" &&
      inspection.documentTelemetry.arbitraryRuleEditorClaimed === "false" &&
      inspection.documentTelemetry.measuredDecisionTruthClaimed === "false",
    `Document telemetry must mirror bounded preset state: ${JSON.stringify(
      inspection.documentTelemetry
    )}`
  );
  assertExactSet(
    parseList(inspection.documentTelemetry.policyPresetIds),
    EXPECTED_POLICY_PRESETS,
    "document policy preset IDs"
  );
  assertExactSet(
    parseList(inspection.documentTelemetry.rulePresetIds),
    EXPECTED_RULE_PRESETS,
    "document rule preset IDs"
  );
  assert(
    inspection.productRootTelemetry.version === EXPECTED_VERSION &&
      inspection.productRootTelemetry.policyPresetId === expectedPolicy &&
      inspection.productRootTelemetry.rulePresetId === expectedRule &&
      inspection.productRootTelemetry.liveControlClaimed === "false" &&
      inspection.hudTelemetry.version === EXPECTED_VERSION &&
      inspection.hudTelemetry.disposition === EXPECTED_DISPOSITION &&
      inspection.hudTelemetry.truthBoundary === EXPECTED_TRUTH_BOUNDARY &&
      inspection.hudTelemetry.policyPresetId === expectedPolicy &&
      inspection.hudTelemetry.rulePresetId === expectedRule &&
      inspection.hudTelemetry.liveControlClaimed === "false",
    `Product/HUD telemetry must mirror controls: ${JSON.stringify({
      productRoot: inspection.productRootTelemetry,
      hud: inspection.hudTelemetry
    })}`
  );
  assert(
    parseList(inspection.documentTelemetry.boundedRouteIds).includes("F-10") &&
      parseList(inspection.documentTelemetry.boundedRouteIds).includes("F-11") &&
      !parseList(inspection.documentTelemetry.notMountedIds).includes("F-10") &&
      !parseList(inspection.documentTelemetry.notMountedIds).includes("F-11") &&
      parseList(inspection.documentTelemetry.externalValidationIds).includes("F-10") &&
      parseList(inspection.documentTelemetry.externalValidationIds).includes("F-11"),
    `Requirement gap telemetry must move F-10/F-11 to bounded route and out of not-mounted: ${JSON.stringify(
      inspection.documentTelemetry
    )}`
  );
}

async function main() {
  ensureOutputRoot(outputRoot);

  await withStaticSmokeBrowser(async ({ client, baseUrl }) => {
    await setViewport(client, VIEWPORT_DESKTOP);
    await client.send("Page.navigate", {
      url: `${baseUrl}${REQUEST_PATH}`
    });
    await waitForPolicyRuleReady(client);
    await waitForGlobeReady(client, "customer policy/rule controls");
    await openInspectorForCapture(client);
    await sleep(500);

    const defaults = await inspectPolicyRuleControls(client);
    assertRouteInvariants(defaults);
    assertPolicyRuleSurface(defaults, DEFAULT_POLICY_PRESET, DEFAULT_RULE_PRESET);
    assertStateAndTelemetry(defaults, DEFAULT_POLICY_PRESET, DEFAULT_RULE_PRESET);
    writeJsonArtifact(
      outputRoot,
      `${VIEWPORT_DESKTOP.name}-default-inspection.json`,
      defaults
    );

    await setPresetCombination(client, ALT_POLICY_PRESET, ALT_RULE_PRESET);
    const changed = await waitForPresetCombination(
      client,
      ALT_POLICY_PRESET,
      ALT_RULE_PRESET
    );
    assertRouteInvariants(changed);
    assertPolicyRuleSurface(changed, ALT_POLICY_PRESET, ALT_RULE_PRESET);
    assertStateAndTelemetry(changed, ALT_POLICY_PRESET, ALT_RULE_PRESET);
    writeJsonArtifact(
      outputRoot,
      `${VIEWPORT_DESKTOP.name}-changed-inspection.json`,
      changed
    );

    const screenshot = await captureScreenshot(
      client,
      outputRoot,
      `${VIEWPORT_DESKTOP.name}.png`
    );
    assertScreenshot(screenshot);

    await setPresetCombination(client, DEFAULT_POLICY_PRESET, DEFAULT_RULE_PRESET);
    const reset = await waitForPresetCombination(
      client,
      DEFAULT_POLICY_PRESET,
      DEFAULT_RULE_PRESET
    );
    assertPolicyRuleSurface(reset, DEFAULT_POLICY_PRESET, DEFAULT_RULE_PRESET);
    assertStateAndTelemetry(reset, DEFAULT_POLICY_PRESET, DEFAULT_RULE_PRESET);
    writeJsonArtifact(
      outputRoot,
      `${VIEWPORT_DESKTOP.name}-reset-inspection.json`,
      reset
    );
  });

  console.log(`customer policy/rule controls validated. Output: ${outputRoot}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
