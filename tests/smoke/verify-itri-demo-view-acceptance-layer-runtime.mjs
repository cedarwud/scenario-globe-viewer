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
const outputRoot = path.join(repoRoot, "output/itri-demo-view-acceptance-layer");

const REQUEST_PATH = "/?scenePreset=regional&m8aV4GroundStationScene=1";
const EXPECTED_VERSION = "itri-demo-view-acceptance-layer-runtime.v1";
const EXPECTED_LAYER = "L2-acceptance-evidence";
const EXPECTED_F13_ARTIFACT =
  "output/validation/phase7.1/2026-05-11T16-43-23.879Z-phase7-1-first-slice/summary.json";
const EXPECTED_F13_FRESH_UNTIL = "2026-05-25T16:43:23.879Z";
const EXPECTED_F13_READINESS_VERSION =
  "itri-demo-route-f13-scale-readiness-runtime.v1";
const EXPECTED_F13_READINESS_SOURCE_TYPE = "fixture/model-backed";
const EXPECTED_F13_READINESS_SOURCE_URL = "not-applicable-repo-local-fixture";
const EXPECTED_F13_READINESS_BUILT_AT_UTC = "2026-05-12T09:53:20Z";
const EXPECTED_F13_READINESS_COUNTS = {
  currentRouteActorCount: 13,
  actorCount: 549,
  leoCount: 540,
  targetLeoCount: 500
};
const EXPECTED_EXTERNAL_VALIDATION_ARTIFACT =
  "output/validation/external-v02-v06/2026-05-11T16-59-27.404Z-external-validation/summary.json";
const EXPECTED_EXTERNAL_VALIDATION_STATUS = "explicit-fail-no-retained-pass";
const EXPECTED_REQUIREMENT_IDS = [
  "F-01",
  "F-02",
  "F-03",
  "F-04",
  "F-05",
  "F-06",
  "F-07",
  "F-08",
  "F-09",
  "F-10",
  "F-11",
  "F-12",
  "F-13",
  "F-14",
  "F-15",
  "F-16",
  "F-17",
  "F-18",
  "V-01",
  "V-02",
  "V-03",
  "V-04",
  "V-05",
  "V-06",
  "P-01",
  "P-02",
  "P-03",
  "D-01",
  "D-02",
  "D-03"
];
const EXPECTED_EXTERNAL_FAIL_IDS = ["V-02", "V-03", "V-04", "V-05", "V-06"];
const EXPECTED_BOUNDED_ROUTE_IDS = ["F-09", "F-10", "F-11", "F-16"];
const VIEWPORT_DESKTOP = {
  name: "desktop-1440x900",
  width: 1440,
  height: 900
};
const FORBIDDEN_POSITIVE_CLAIMS = [
  "500 leo validated",
  ">=500 leo validated",
  "measured throughput passed",
  "measured throughput ready",
  "live iperf",
  "external report truth ready",
  "v-02 passed",
  "v-03 passed",
  "v-04 passed",
  "v-05 passed",
  "v-06 passed"
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

function parsePairs(value) {
  return Object.fromEntries(
    parseList(value).map((pair) => {
      const [key, ...rest] = pair.split(":");
      return [key, rest.join(":")];
    })
  );
}

function assertExactSet(actual, expected, label) {
  const missing = expected.filter((item) => !actual.includes(item));
  const unexpected = actual.filter((item) => !expected.includes(item));

  assert(
    missing.length === 0 && unexpected.length === 0,
    `${label} set mismatch: ${JSON.stringify({ actual, expected, missing, unexpected })}`
  );
}

function assertUnique(actual, label) {
  const duplicates = actual.filter((item, index) => actual.indexOf(item) !== index);
  assert(duplicates.length === 0, `${label} has duplicates: ${JSON.stringify(duplicates)}`);
}

async function waitForAcceptanceLayerReady(client) {
  let lastState = null;

  for (let attempt = 0; attempt < 240; attempt += 1) {
    lastState = await evaluateRuntimeValue(
      client,
      `(() => {
        const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
        const state = capture?.m8aV4GroundStationScene?.getState?.();
        const productRoot = document.querySelector("[data-m8a-v47-product-ux='true']");
        const layer = productRoot?.querySelector("[data-itri-demo-l2-acceptance-layer='true']");

        return {
          bootstrapState: document.documentElement.dataset.bootstrapState ?? null,
          scenePreset: document.documentElement.dataset.scenePreset ?? null,
          hasViewer: Boolean(capture?.viewer),
          hasV4Scene: Boolean(state),
          stateVersion: state?.acceptanceLayer?.version ?? null,
          productVersion: productRoot?.dataset.m8aV4ItriDemoViewAcceptanceLayer ?? null,
          layerVersion: layer?.dataset.itriDemoL2Version ?? null
        };
      })()`
    );

    if (
      lastState?.bootstrapState === "ready" &&
      lastState?.scenePreset === "regional" &&
      lastState?.hasViewer &&
      lastState?.hasV4Scene &&
      lastState?.stateVersion === EXPECTED_VERSION &&
      lastState?.productVersion === EXPECTED_VERSION &&
      lastState?.layerVersion === EXPECTED_VERSION
    ) {
      return lastState;
    }

    await sleep(100);
  }

  throw new Error(
    `customer acceptance layer did not become ready: ${JSON.stringify(lastState)}`
  );
}

async function inspectAcceptanceLayer(client) {
  return await evaluateRuntimeValue(
    client,
    `(() => {
      const normalize = (value) => String(value ?? "").replace(/\\s+/g, " ").trim();
      const toList = (value) => String(value ?? "").split("|").filter(Boolean);
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
      const details = productRoot?.querySelector("[data-m8a-v47-control-id='details-toggle']");
      const evidence = productRoot?.querySelector("[data-m8a-v47-control-id='evidence-toggle']");
      const sheet = productRoot?.querySelector("[data-m8a-v48-inspector='true']");
      const layer = productRoot?.querySelector("[data-itri-demo-l2-acceptance-layer='true']");
      const f13Readiness = productRoot?.querySelector("[data-itri-f13-scale-readiness-surface='true']");
      const coverageItems = Array.from(
        layer?.querySelectorAll("[data-itri-acceptance-requirement='true']") ?? []
      ).map((item) => ({
        id: item.dataset.itriAcceptanceRequirementId ?? null,
        layer: item.dataset.itriAcceptancePrimaryLayer ?? null,
        status: item.dataset.itriAcceptanceStatus ?? null,
        disposition: item.dataset.itriAcceptanceDisposition ?? null,
        surface: item.dataset.itriAcceptanceSurface ?? null,
        text: normalize(item.textContent)
      }));
      const boundaryCards = Array.from(
        layer?.querySelectorAll("[data-itri-demo-l2-boundary-card]") ?? []
      ).map((card) => ({
        id: card.dataset.itriDemoL2BoundaryCard ?? null,
        text: normalize(card.textContent)
      }));

      return {
        route: window.location.pathname + window.location.search,
        sheetHidden: sheet instanceof HTMLElement ? sheet.hidden : null,
        activeTab: productRoot?.dataset.m8aV411InspectorActiveTab ?? null,
        detailsExpanded: details?.getAttribute("aria-expanded") ?? null,
        evidenceExpanded: evidence?.getAttribute("aria-expanded") ?? null,
        layerVisible: isVisible(layer),
        layerText: normalize(layer?.textContent),
        layerDataset: {
          version: layer?.dataset.itriDemoL2Version ?? null,
          layerId: layer?.dataset.itriDemoL2LayerId ?? null,
          open: layer?.dataset.itriDemoL2Open ?? null,
          requirementIds: layer?.dataset.itriDemoL2RequirementIds ?? null,
          requirementStatuses: layer?.dataset.itriDemoL2RequirementStatuses ?? null,
          requirementLayers: layer?.dataset.itriDemoL2RequirementLayers ?? null,
          externalFailIds: layer?.dataset.itriDemoL2ExternalFailIds ?? null,
          boundedRouteIds: layer?.dataset.itriDemoL2BoundedRouteIds ?? null,
          f13Artifact: layer?.dataset.itriDemoL2F13Artifact ?? null,
          f13FreshUntilUtc: layer?.dataset.itriDemoL2F13FreshUntilUtc ?? null,
          f13RouteNativeScaleClaimed:
            layer?.dataset.itriDemoL2F13RouteNativeScaleClaimed ?? null,
          f13ScaleReadinessVersion:
            layer?.dataset.itriDemoL2F13ScaleReadinessVersion ?? null,
          f13ScaleReadinessTargetReached:
            layer?.dataset.itriDemoL2F13ScaleReadinessTargetReached ?? null,
          f13ScaleReadinessCurrentRouteActorCount:
            layer?.dataset.itriDemoL2F13ScaleReadinessCurrentRouteActorCount ?? null,
          f13ScaleReadinessActorCount:
            layer?.dataset.itriDemoL2F13ScaleReadinessActorCount ?? null,
          f13ScaleReadinessLeoCount:
            layer?.dataset.itriDemoL2F13ScaleReadinessLeoCount ?? null,
          f13ScaleReadinessTargetLeoCount:
            layer?.dataset.itriDemoL2F13ScaleReadinessTargetLeoCount ?? null,
          f13ScaleReadinessSourceType:
            layer?.dataset.itriDemoL2F13ScaleReadinessSourceType ?? null,
          f13ScaleReadinessSourceUrl:
            layer?.dataset.itriDemoL2F13ScaleReadinessSourceUrl ?? null,
          f13ScaleReadinessPublicSourceUsed:
            layer?.dataset.itriDemoL2F13ScaleReadinessPublicSourceUsed ?? null,
          f13ScaleReadinessBuiltAtUtc:
            layer?.dataset.itriDemoL2F13ScaleReadinessBuiltAtUtc ?? null,
          f13ScaleReadinessFreshnessTimestampUtc:
            layer?.dataset.itriDemoL2F13ScaleReadinessFreshnessTimestampUtc ?? null,
          f13ScaleReadinessClosureClaimed:
            layer?.dataset.itriDemoL2F13ScaleReadinessClosureClaimed ?? null,
          externalValidationArtifact:
            layer?.dataset.itriDemoL2ExternalValidationArtifact ?? null,
          externalValidationStatus:
            layer?.dataset.itriDemoL2ExternalValidationStatus ?? null
        },
        coverageItems,
        boundaryCards,
        stateAcceptanceLayer: state?.acceptanceLayer ?? null,
        documentTelemetry: {
          version:
            document.documentElement.dataset.m8aV4ItriDemoViewAcceptanceLayer ?? null,
          layerId:
            document.documentElement.dataset.m8aV4ItriDemoViewAcceptanceLayerId ?? null,
          visible:
            document.documentElement.dataset.m8aV4ItriDemoViewAcceptanceVisible ?? null,
          requirementIds:
            document.documentElement.dataset
              .m8aV4ItriDemoViewAcceptanceRequirementIds ?? null,
          requirementStatuses:
            document.documentElement.dataset
              .m8aV4ItriDemoViewAcceptanceRequirementStatuses ?? null,
          requirementLayers:
            document.documentElement.dataset
              .m8aV4ItriDemoViewAcceptanceRequirementLayers ?? null,
          externalFailIds:
            document.documentElement.dataset
              .m8aV4ItriDemoViewAcceptanceExternalFailIds ?? null,
          boundedRouteIds:
            document.documentElement.dataset
              .m8aV4ItriDemoViewAcceptanceBoundedRouteIds ?? null,
          f13Artifact:
            document.documentElement.dataset
              .m8aV4ItriDemoViewAcceptanceF13Artifact ?? null,
          f13FreshUntilUtc:
            document.documentElement.dataset
              .m8aV4ItriDemoViewAcceptanceF13FreshUntilUtc ?? null,
          f13RouteNativeScaleClaimed:
            document.documentElement.dataset
              .m8aV4ItriDemoViewAcceptanceF13RouteNativeScaleClaimed ?? null,
          f13ScaleReadinessVersion:
            document.documentElement.dataset.m8aV4ItriF13ScaleReadinessSurface ?? null,
          f13ScaleReadinessTargetReached:
            document.documentElement.dataset
              .m8aV4ItriF13ScaleReadinessTargetReached ?? null,
          f13ScaleReadinessCurrentRouteActorCount:
            document.documentElement.dataset
              .m8aV4ItriF13ScaleReadinessCurrentRouteActorCount ?? null,
          f13ScaleReadinessActorCount:
            document.documentElement.dataset
              .m8aV4ItriF13ScaleReadinessActorCount ?? null,
          f13ScaleReadinessLeoCount:
            document.documentElement.dataset
              .m8aV4ItriF13ScaleReadinessLeoCount ?? null,
          f13ScaleReadinessTargetLeoCount:
            document.documentElement.dataset
              .m8aV4ItriF13ScaleReadinessTargetLeoCount ?? null,
          f13ScaleReadinessSourceType:
            document.documentElement.dataset
              .m8aV4ItriF13ScaleReadinessSourceType ?? null,
          f13ScaleReadinessSourceUrl:
            document.documentElement.dataset
              .m8aV4ItriF13ScaleReadinessSourceUrl ?? null,
          f13ScaleReadinessPublicSourceUsed:
            document.documentElement.dataset
              .m8aV4ItriF13ScaleReadinessPublicSourceUsed ?? null,
          f13ScaleReadinessBuiltAtUtc:
            document.documentElement.dataset
              .m8aV4ItriF13ScaleReadinessBuiltAtUtc ?? null,
          f13ScaleReadinessFreshnessTimestampUtc:
            document.documentElement.dataset
              .m8aV4ItriF13ScaleReadinessFreshnessTimestampUtc ?? null,
          f13ScaleReadinessClosureClaimed:
            document.documentElement.dataset
              .m8aV4ItriF13ScaleReadinessClosureClaimed ?? null,
          externalValidationArtifact:
            document.documentElement.dataset
              .m8aV4ItriDemoViewAcceptanceExternalValidationArtifact ?? null,
          externalValidationStatus:
            document.documentElement.dataset
              .m8aV4ItriDemoViewAcceptanceExternalValidationStatus ?? null,
          defaultRequirementMatrixVisible:
            document.documentElement.dataset
              .m8aV4ItriDemoViewDefaultRequirementMatrixVisible ?? null
        },
        productTelemetry: {
          version:
            productRoot?.dataset.m8aV4ItriDemoViewAcceptanceLayer ?? null,
          visible:
            productRoot?.dataset.m8aV4ItriDemoViewAcceptanceVisible ?? null,
          requirementIds:
            productRoot?.dataset.m8aV4ItriDemoViewAcceptanceRequirementIds ?? null,
          defaultRequirementMatrixVisible:
            productRoot?.dataset.m8aV4ItriDemoViewDefaultRequirementMatrixVisible ?? null
        },
        f13ScaleReadiness: {
          visible: isVisible(f13Readiness),
          text: normalize(f13Readiness?.textContent),
          version: f13Readiness?.dataset.itriF13ScaleReadinessVersion ?? null,
          targetReached:
            f13Readiness?.dataset.itriF13ScaleReadinessTargetReached ?? null,
          currentRouteActorCount:
            f13Readiness?.dataset.itriF13ScaleReadinessCurrentRouteActorCount ?? null,
          actorCount:
            f13Readiness?.dataset.itriF13ScaleReadinessActorCount ?? null,
          leoCount:
            f13Readiness?.dataset.itriF13ScaleReadinessLeoCount ?? null,
          targetLeoCount:
            f13Readiness?.dataset.itriF13ScaleReadinessTargetLeoCount ?? null,
          sourceType:
            f13Readiness?.dataset.itriF13ScaleReadinessSourceType ?? null,
          sourceUrl:
            f13Readiness?.dataset.itriF13ScaleReadinessSourceUrl ?? null,
          publicSourceUsed:
            f13Readiness?.dataset.itriF13ScaleReadinessPublicSourceUsed ?? null,
          builtAtUtc:
            f13Readiness?.dataset.itriF13ScaleReadinessBuiltAtUtc ?? null,
          freshnessTimestampUtc:
            f13Readiness?.dataset.itriF13ScaleReadinessFreshnessTimestampUtc ?? null,
          closureClaimed:
            f13Readiness?.dataset.itriF13ScaleReadinessClosureClaimed ?? null,
          knownGapCount:
            f13Readiness?.querySelectorAll(
              "[data-itri-f13-scale-readiness-known-gap='true']"
            ).length ?? 0
        },
        parsed: {
          layerRequirementIds: toList(layer?.dataset.itriDemoL2RequirementIds),
          documentRequirementIds:
            toList(document.documentElement.dataset.m8aV4ItriDemoViewAcceptanceRequirementIds),
          layerExternalFailIds: toList(layer?.dataset.itriDemoL2ExternalFailIds),
          layerBoundedRouteIds: toList(layer?.dataset.itriDemoL2BoundedRouteIds),
          documentStatuses:
            document.documentElement.dataset
              .m8aV4ItriDemoViewAcceptanceRequirementStatuses ?? "",
          documentLayers:
            document.documentElement.dataset
              .m8aV4ItriDemoViewAcceptanceRequirementLayers ?? ""
        }
      };
    })()`
  );
}

async function clickControl(client, selector) {
  return await evaluateRuntimeValue(
    client,
    `((selector) => {
      const control = document.querySelector(selector);
      if (control instanceof HTMLButtonElement) {
        control.click();
        return true;
      }
      return false;
    })(${JSON.stringify(selector)})`
  );
}

async function waitForLayerVisibility(client, expectedVisible, expectedTab) {
  let lastInspection = null;

  for (let attempt = 0; attempt < 60; attempt += 1) {
    lastInspection = await inspectAcceptanceLayer(client);

    if (
      lastInspection?.activeTab === expectedTab &&
      lastInspection?.layerVisible === expectedVisible &&
      lastInspection?.documentTelemetry.visible === String(expectedVisible) &&
      lastInspection?.productTelemetry.visible === String(expectedVisible)
    ) {
      return lastInspection;
    }

    await sleep(100);
  }

  throw new Error(
    `Acceptance layer visibility did not settle: ${JSON.stringify(lastInspection)}`
  );
}

function assertCoverage(inspection) {
  const layerIds = parseList(inspection.layerDataset.requirementIds);
  const docIds = parseList(inspection.documentTelemetry.requirementIds);
  const stateIds = inspection.stateAcceptanceLayer?.requirementIds ?? [];
  const itemIds = inspection.coverageItems.map((item) => item.id);

  assertExactSet(layerIds, EXPECTED_REQUIREMENT_IDS, "layer requirement IDs");
  assertExactSet(docIds, EXPECTED_REQUIREMENT_IDS, "document requirement IDs");
  assertExactSet(stateIds, EXPECTED_REQUIREMENT_IDS, "state requirement IDs");
  assertExactSet(itemIds, EXPECTED_REQUIREMENT_IDS, "coverage item IDs");
  assertUnique(itemIds, "coverage item IDs");

  const statuses = parsePairs(inspection.documentTelemetry.requirementStatuses);
  const layers = parsePairs(inspection.documentTelemetry.requirementLayers);

  for (const id of EXPECTED_REQUIREMENT_IDS) {
    assert(statuses[id], `Missing status pair for ${id}`);
    assert(layers[id], `Missing primary layer pair for ${id}`);
  }

  for (const id of EXPECTED_EXTERNAL_FAIL_IDS) {
    const item = inspection.coverageItems.find((entry) => entry.id === id);
    assert(
      statuses[id] === "external-fail" &&
        item?.status === "external-fail" &&
        item?.disposition === "external-validation-fail" &&
        item?.text.toLowerCase().includes("fail/gap"),
      `External validation ID must remain explicit fail/gap: ${JSON.stringify({ id, item, statuses })}`
    );
  }

  for (const id of EXPECTED_BOUNDED_ROUTE_IDS) {
    const item = inspection.coverageItems.find((entry) => entry.id === id);
    assert(
      statuses[id] === "bounded" &&
        item?.status === "bounded" &&
        item?.disposition === "bounded-route-representation",
      `Bounded route representation changed: ${JSON.stringify({ id, item, statuses })}`
    );
  }

  const f13Item = inspection.coverageItems.find((entry) => entry.id === "F-13");
  assert(
    statuses["F-13"] === "readiness" &&
      f13Item?.status === "readiness" &&
      f13Item?.disposition === "route-native-scale-readiness" &&
      f13Item?.surface === "f13-scale-readiness" &&
      f13Item?.text.includes("540 LEO / 549 total") &&
      f13Item?.text.includes("not route-native >=500 LEO closure/proof"),
    `F-13 must expose route-native scale readiness without closure/proof language: ${JSON.stringify(f13Item)}`
  );
  assert(
    inspection.layerDataset.f13Artifact === EXPECTED_F13_ARTIFACT &&
      inspection.documentTelemetry.f13Artifact === EXPECTED_F13_ARTIFACT &&
      inspection.layerDataset.f13FreshUntilUtc === EXPECTED_F13_FRESH_UNTIL &&
      inspection.documentTelemetry.f13FreshUntilUtc === EXPECTED_F13_FRESH_UNTIL &&
      inspection.layerDataset.f13RouteNativeScaleClaimed === "false" &&
      inspection.documentTelemetry.f13RouteNativeScaleClaimed === "false" &&
      inspection.stateAcceptanceLayer?.f13Phase71Evidence?.routeNativeScaleClaimed === false,
    `F-13 artifact/freshness/native-scale boundary changed: ${JSON.stringify({
      layer: inspection.layerDataset,
      document: inspection.documentTelemetry,
      state: inspection.stateAcceptanceLayer?.f13Phase71Evidence
    })}`
  );
  assert(
    inspection.layerDataset.f13ScaleReadinessVersion ===
      EXPECTED_F13_READINESS_VERSION &&
      inspection.documentTelemetry.f13ScaleReadinessVersion ===
        EXPECTED_F13_READINESS_VERSION &&
      inspection.f13ScaleReadiness.version === EXPECTED_F13_READINESS_VERSION &&
      inspection.stateAcceptanceLayer?.f13RouteNativeScaleReadiness?.version ===
        EXPECTED_F13_READINESS_VERSION,
    `F-13 readiness version missing: ${JSON.stringify({
      layer: inspection.layerDataset,
      document: inspection.documentTelemetry,
      surface: inspection.f13ScaleReadiness,
      state: inspection.stateAcceptanceLayer?.f13RouteNativeScaleReadiness
    })}`
  );
  assert(
    inspection.layerDataset.f13ScaleReadinessTargetReached === "true" &&
      inspection.documentTelemetry.f13ScaleReadinessTargetReached === "true" &&
      inspection.f13ScaleReadiness.targetReached === "true" &&
      inspection.stateAcceptanceLayer?.f13RouteNativeScaleReadiness?.targetReached === true,
    `F-13 readiness target must be reached in route runtime: ${JSON.stringify({
      layer: inspection.layerDataset,
      document: inspection.documentTelemetry,
      surface: inspection.f13ScaleReadiness,
      state: inspection.stateAcceptanceLayer?.f13RouteNativeScaleReadiness
    })}`
  );
  assert(
    inspection.layerDataset.f13ScaleReadinessCurrentRouteActorCount ===
      String(EXPECTED_F13_READINESS_COUNTS.currentRouteActorCount) &&
      inspection.documentTelemetry.f13ScaleReadinessCurrentRouteActorCount ===
        String(EXPECTED_F13_READINESS_COUNTS.currentRouteActorCount) &&
      inspection.f13ScaleReadiness.currentRouteActorCount ===
        String(EXPECTED_F13_READINESS_COUNTS.currentRouteActorCount) &&
      inspection.stateAcceptanceLayer?.f13RouteNativeScaleReadiness
        ?.currentRouteActorCount ===
        EXPECTED_F13_READINESS_COUNTS.currentRouteActorCount,
    `F-13 current route actor count changed: ${JSON.stringify({
      layer: inspection.layerDataset,
      document: inspection.documentTelemetry,
      surface: inspection.f13ScaleReadiness,
      state: inspection.stateAcceptanceLayer?.f13RouteNativeScaleReadiness
    })}`
  );
  assert(
    inspection.layerDataset.f13ScaleReadinessActorCount ===
      String(EXPECTED_F13_READINESS_COUNTS.actorCount) &&
      inspection.documentTelemetry.f13ScaleReadinessActorCount ===
        String(EXPECTED_F13_READINESS_COUNTS.actorCount) &&
      inspection.f13ScaleReadiness.actorCount ===
        String(EXPECTED_F13_READINESS_COUNTS.actorCount) &&
      inspection.stateAcceptanceLayer?.f13RouteNativeScaleReadiness
        ?.readinessActorCount === EXPECTED_F13_READINESS_COUNTS.actorCount,
    `F-13 readiness actor count changed: ${JSON.stringify({
      layer: inspection.layerDataset,
      document: inspection.documentTelemetry,
      surface: inspection.f13ScaleReadiness,
      state: inspection.stateAcceptanceLayer?.f13RouteNativeScaleReadiness
    })}`
  );
  assert(
    inspection.layerDataset.f13ScaleReadinessLeoCount ===
      String(EXPECTED_F13_READINESS_COUNTS.leoCount) &&
      inspection.documentTelemetry.f13ScaleReadinessLeoCount ===
        String(EXPECTED_F13_READINESS_COUNTS.leoCount) &&
      inspection.f13ScaleReadiness.leoCount ===
        String(EXPECTED_F13_READINESS_COUNTS.leoCount) &&
      inspection.stateAcceptanceLayer?.f13RouteNativeScaleReadiness
        ?.readinessLeoActorCount === EXPECTED_F13_READINESS_COUNTS.leoCount,
    `F-13 readiness LEO count changed: ${JSON.stringify({
      layer: inspection.layerDataset,
      document: inspection.documentTelemetry,
      surface: inspection.f13ScaleReadiness,
      state: inspection.stateAcceptanceLayer?.f13RouteNativeScaleReadiness
    })}`
  );
  assert(
    inspection.layerDataset.f13ScaleReadinessTargetLeoCount ===
      String(EXPECTED_F13_READINESS_COUNTS.targetLeoCount) &&
      inspection.documentTelemetry.f13ScaleReadinessTargetLeoCount ===
        String(EXPECTED_F13_READINESS_COUNTS.targetLeoCount) &&
      inspection.f13ScaleReadiness.targetLeoCount ===
        String(EXPECTED_F13_READINESS_COUNTS.targetLeoCount) &&
      inspection.stateAcceptanceLayer?.f13RouteNativeScaleReadiness
        ?.targetLeoCount === EXPECTED_F13_READINESS_COUNTS.targetLeoCount,
    `F-13 readiness target LEO count changed: ${JSON.stringify({
      layer: inspection.layerDataset,
      document: inspection.documentTelemetry,
      surface: inspection.f13ScaleReadiness,
      state: inspection.stateAcceptanceLayer?.f13RouteNativeScaleReadiness
    })}`
  );
  assert(
    inspection.layerDataset.f13ScaleReadinessSourceType ===
      EXPECTED_F13_READINESS_SOURCE_TYPE &&
      inspection.documentTelemetry.f13ScaleReadinessSourceType ===
        EXPECTED_F13_READINESS_SOURCE_TYPE &&
      inspection.f13ScaleReadiness.sourceType ===
        EXPECTED_F13_READINESS_SOURCE_TYPE &&
      inspection.stateAcceptanceLayer?.f13RouteNativeScaleReadiness?.sourceType ===
        EXPECTED_F13_READINESS_SOURCE_TYPE &&
      inspection.layerDataset.f13ScaleReadinessSourceUrl ===
        EXPECTED_F13_READINESS_SOURCE_URL &&
      inspection.documentTelemetry.f13ScaleReadinessSourceUrl ===
        EXPECTED_F13_READINESS_SOURCE_URL &&
      inspection.f13ScaleReadiness.sourceUrl === EXPECTED_F13_READINESS_SOURCE_URL &&
      inspection.stateAcceptanceLayer?.f13RouteNativeScaleReadiness?.sourceUrl ===
        EXPECTED_F13_READINESS_SOURCE_URL,
    `F-13 readiness source metadata changed: ${JSON.stringify({
      layer: inspection.layerDataset,
      document: inspection.documentTelemetry,
      surface: inspection.f13ScaleReadiness,
      state: inspection.stateAcceptanceLayer?.f13RouteNativeScaleReadiness
    })}`
  );
  assert(
    inspection.layerDataset.f13ScaleReadinessPublicSourceUsed === "false" &&
      inspection.documentTelemetry.f13ScaleReadinessPublicSourceUsed === "false" &&
      inspection.f13ScaleReadiness.publicSourceUsed === "false" &&
      inspection.stateAcceptanceLayer?.f13RouteNativeScaleReadiness
        ?.publicSourceUsed === false,
    `F-13 readiness must remain fixture/model-backed with no public retrieval: ${JSON.stringify({
      layer: inspection.layerDataset,
      document: inspection.documentTelemetry,
      surface: inspection.f13ScaleReadiness,
      state: inspection.stateAcceptanceLayer?.f13RouteNativeScaleReadiness
    })}`
  );
  assert(
    inspection.layerDataset.f13ScaleReadinessBuiltAtUtc ===
      EXPECTED_F13_READINESS_BUILT_AT_UTC &&
      inspection.documentTelemetry.f13ScaleReadinessBuiltAtUtc ===
        EXPECTED_F13_READINESS_BUILT_AT_UTC &&
      inspection.f13ScaleReadiness.builtAtUtc ===
        EXPECTED_F13_READINESS_BUILT_AT_UTC &&
      inspection.layerDataset.f13ScaleReadinessFreshnessTimestampUtc ===
        EXPECTED_F13_READINESS_BUILT_AT_UTC &&
      inspection.documentTelemetry.f13ScaleReadinessFreshnessTimestampUtc ===
        EXPECTED_F13_READINESS_BUILT_AT_UTC &&
      inspection.f13ScaleReadiness.freshnessTimestampUtc ===
        EXPECTED_F13_READINESS_BUILT_AT_UTC &&
      inspection.stateAcceptanceLayer?.f13RouteNativeScaleReadiness?.builtAtUtc ===
        EXPECTED_F13_READINESS_BUILT_AT_UTC &&
      inspection.stateAcceptanceLayer?.f13RouteNativeScaleReadiness
        ?.freshnessTimestampUtc === EXPECTED_F13_READINESS_BUILT_AT_UTC,
    `F-13 readiness timestamp metadata changed: ${JSON.stringify({
      layer: inspection.layerDataset,
      document: inspection.documentTelemetry,
      surface: inspection.f13ScaleReadiness,
      state: inspection.stateAcceptanceLayer?.f13RouteNativeScaleReadiness
    })}`
  );
  assert(
    inspection.layerDataset.f13ScaleReadinessClosureClaimed === "false" &&
      inspection.documentTelemetry.f13ScaleReadinessClosureClaimed === "false" &&
      inspection.f13ScaleReadiness.closureClaimed === "false" &&
      inspection.stateAcceptanceLayer?.f13RouteNativeScaleReadiness
        ?.routeNativeScaleClosureClaimed === false &&
      inspection.stateAcceptanceLayer?.f13RouteNativeScaleReadiness
        ?.externalValidationClosureClaimed === false &&
      inspection.stateAcceptanceLayer?.f13RouteNativeScaleReadiness
        ?.itriAuthorityClaimed === false,
    `F-13 readiness closure/authority claims changed: ${JSON.stringify({
      layer: inspection.layerDataset,
      document: inspection.documentTelemetry,
      surface: inspection.f13ScaleReadiness,
      state: inspection.stateAcceptanceLayer?.f13RouteNativeScaleReadiness
    })}`
  );
  assert(
    inspection.f13ScaleReadiness.visible === true &&
      inspection.f13ScaleReadiness.knownGapCount >= 4 &&
      inspection.f13ScaleReadiness.text.includes("fixture/model-backed") &&
      inspection.f13ScaleReadiness.text.includes("not external validation closure") &&
      inspection.f13ScaleReadiness.text.includes("not customer authority") &&
      inspection.f13ScaleReadiness.text.includes("not measured network truth"),
    `F-13 readiness surface must visibly expose source, boundary, and known gaps: ${JSON.stringify(inspection.f13ScaleReadiness)}`
  );

  assertExactSet(
    parseList(inspection.layerDataset.externalFailIds),
    EXPECTED_EXTERNAL_FAIL_IDS,
    "layer external fail IDs"
  );
  assertExactSet(
    parseList(inspection.layerDataset.boundedRouteIds),
    EXPECTED_BOUNDED_ROUTE_IDS,
    "layer bounded route IDs"
  );
  assert(
    inspection.layerDataset.externalValidationArtifact ===
      EXPECTED_EXTERNAL_VALIDATION_ARTIFACT &&
      inspection.documentTelemetry.externalValidationArtifact ===
        EXPECTED_EXTERNAL_VALIDATION_ARTIFACT &&
      inspection.layerDataset.externalValidationStatus ===
        EXPECTED_EXTERNAL_VALIDATION_STATUS &&
      inspection.documentTelemetry.externalValidationStatus ===
        EXPECTED_EXTERNAL_VALIDATION_STATUS,
    `External V-02..V-06 validation package boundary changed: ${JSON.stringify({
      layer: inspection.layerDataset,
      document: inspection.documentTelemetry
    })}`
  );

  const visibleText = String(inspection.layerText ?? "").toLowerCase();
  const hits = FORBIDDEN_POSITIVE_CLAIMS.filter((claim) =>
    visibleText.includes(claim)
  );
  assert(
    hits.length === 0,
    `Acceptance layer contains forbidden positive claim text: ${JSON.stringify({
      hits,
      layerText: inspection.layerText
    })}`
  );
}

async function main() {
  ensureOutputRoot(outputRoot);

  await withStaticSmokeBrowser(async ({ client, baseUrl }) => {
    await setViewport(client, VIEWPORT_DESKTOP);
    await client.send("Page.navigate", {
      url: `${baseUrl}${REQUEST_PATH}`
    });
    await waitForAcceptanceLayerReady(client);
    await waitForGlobeReady(client, "customer demo view acceptance layer");
    await evaluateRuntimeValue(
      client,
      `window.__SCENARIO_GLOBE_VIEWER_CAPTURE__?.m8aV4GroundStationScene?.pause?.()`
    );
    await sleep(500);

    const defaultInspection = await inspectAcceptanceLayer(client);
    assert(
      defaultInspection.sheetHidden === true &&
        !defaultInspection.layerVisible &&
        defaultInspection.documentTelemetry.visible === "false" &&
        defaultInspection.documentTelemetry.defaultRequirementMatrixVisible ===
          "false" &&
        defaultInspection.productTelemetry.defaultRequirementMatrixVisible ===
          "false",
      `Acceptance layer must not be visible by default: ${JSON.stringify(defaultInspection)}`
    );

    const detailsClicked = await clickControl(
      client,
      "[data-m8a-v47-control-id='details-toggle']"
    );
    assert(detailsClicked, "Details control missing");
    const detailsInspection = await waitForLayerVisibility(client, false, "decision");
    assert(
      detailsInspection.detailsExpanded === "true" &&
        detailsInspection.documentTelemetry.defaultRequirementMatrixVisible ===
          "false",
      `Details must open L1 decision view without L2 matrix: ${JSON.stringify(detailsInspection)}`
    );

    const evidenceClicked = await clickControl(
      client,
      "[data-m8a-v47-control-id='evidence-toggle']"
    );
    assert(evidenceClicked, "Evidence control missing");
    const evidenceInspection = await waitForLayerVisibility(client, true, "evidence");
    assert(
      evidenceInspection.evidenceExpanded === "true" &&
        evidenceInspection.layerDataset.version === EXPECTED_VERSION &&
        evidenceInspection.layerDataset.layerId === EXPECTED_LAYER &&
        evidenceInspection.layerDataset.open === "true",
      `Evidence must open L2 acceptance layer: ${JSON.stringify(evidenceInspection)}`
    );
    assertCoverage(evidenceInspection);

    writeJsonArtifact(
      outputRoot,
      `${VIEWPORT_DESKTOP.name}-default.json`,
      defaultInspection
    );
    writeJsonArtifact(
      outputRoot,
      `${VIEWPORT_DESKTOP.name}-details.json`,
      detailsInspection
    );
    writeJsonArtifact(
      outputRoot,
      `${VIEWPORT_DESKTOP.name}-evidence.json`,
      evidenceInspection
    );

    const screenshot = await captureScreenshot(
      client,
      outputRoot,
      `${VIEWPORT_DESKTOP.name}-evidence.png`
    );
    assertScreenshot(screenshot);
  });

  console.log(`customer demo view acceptance layer validated. Output: ${outputRoot}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
