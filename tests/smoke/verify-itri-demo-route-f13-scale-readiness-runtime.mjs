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
  "output/itri-demo-route-f13-scale-readiness"
);

const REQUEST_PATH = "/?scenePreset=regional&m8aV4GroundStationScene=1";
const EXPECTED_VERSION = "itri-demo-route-f13-scale-readiness-runtime.v1";
const EXPECTED_SOURCE_TYPE = "fixture/model-backed";
const EXPECTED_SOURCE_URL = "not-applicable-repo-local-fixture";
const EXPECTED_BUILT_AT_UTC = "2026-05-12T09:53:20Z";
const EXPECTED_ROUTE_ACTORS = {
  total: 13,
  leo: 6,
  meo: 5,
  geo: 2
};
const EXPECTED_READINESS = {
  total: 549,
  leo: 540,
  meo: 6,
  geo: 3,
  targetLeo: 500
};
const VIEWPORT_DESKTOP = {
  name: "desktop-1440x900",
  width: 1440,
  height: 900
};
const FORBIDDEN_POSITIVE_CLAIMS = [
  "route-native >=500 leo closure achieved",
  "route-native >=500 leo proof complete",
  "external validation closure achieved",
  "full itri external validation closure",
  "itri authority confirmed",
  "active satellite path confirmed",
  "active gateway path confirmed",
  "measured throughput passed",
  "measured latency passed",
  "live iperf passed",
  "live estnet ready"
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

async function waitForF13ScaleReadinessReady(client) {
  let lastState = null;

  for (let attempt = 0; attempt < 240; attempt += 1) {
    lastState = await evaluateRuntimeValue(
      client,
      `(() => {
        const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
        const state = capture?.m8aV4GroundStationScene?.getState?.();
        const root = document.documentElement;
        const productRoot = document.querySelector("[data-m8a-v47-product-ux='true']");

        return {
          bootstrapState: root.dataset.bootstrapState ?? null,
          scenePreset: root.dataset.scenePreset ?? null,
          hasViewer: Boolean(capture?.viewer),
          hasV4Scene: Boolean(state),
          stateVersion:
            state?.acceptanceLayer?.f13RouteNativeScaleReadiness?.version ?? null,
          documentVersion:
            root.dataset.m8aV4ItriF13ScaleReadinessSurface ?? null,
          productVersion:
            productRoot?.dataset.m8aV4ItriF13ScaleReadinessSurface ?? null
        };
      })()`
    );

    if (
      lastState?.bootstrapState === "ready" &&
      lastState?.scenePreset === "regional" &&
      lastState?.hasViewer &&
      lastState?.hasV4Scene &&
      lastState?.stateVersion === EXPECTED_VERSION &&
      lastState?.documentVersion === EXPECTED_VERSION &&
      lastState?.productVersion === EXPECTED_VERSION
    ) {
      return lastState;
    }

    await sleep(100);
  }

  throw new Error(
    `F-13 route-native scale readiness did not become ready: ${JSON.stringify(
      lastState
    )}`
  );
}

async function inspectF13ScaleReadiness(client) {
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
      const datasetOf = (element) => (
        element instanceof HTMLElement ? { ...element.dataset } : {}
      );
      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      const state = capture?.m8aV4GroundStationScene?.getState?.();
      const productRoot = document.querySelector("[data-m8a-v47-product-ux='true']");
      const evidence = productRoot?.querySelector("[data-m8a-v47-control-id='evidence-toggle']");
      const sheet = productRoot?.querySelector("[data-m8a-v48-inspector='true']");
      const layer = productRoot?.querySelector("[data-itri-demo-l2-acceptance-layer='true']");
      const surface = productRoot?.querySelector("[data-itri-f13-scale-readiness-surface='true']");
      const hiddenHud = document.querySelector("[data-m8a-v4-ground-station-scene='true']");

      return {
        route: window.location.pathname + window.location.search,
        sheetHidden: sheet instanceof HTMLElement ? sheet.hidden : null,
        activeTab: productRoot?.dataset.m8aV411InspectorActiveTab ?? null,
        evidenceExpanded: evidence?.getAttribute("aria-expanded") ?? null,
        layerVisible: isVisible(layer),
        surfaceVisible: isVisible(surface),
        surfaceText: normalize(surface?.textContent),
        layerText: normalize(layer?.textContent),
        knownGapCount:
          surface?.querySelectorAll("[data-itri-f13-scale-readiness-known-gap='true']")
            .length ?? 0,
        routeActorCount: state?.actorCount ?? null,
        routeOrbitActorCounts: state?.orbitActorCounts ?? null,
        stateReadiness:
          state?.acceptanceLayer?.f13RouteNativeScaleReadiness ?? null,
        statePhase71Evidence:
          state?.acceptanceLayer?.f13Phase71Evidence ?? null,
        documentTelemetry: {
          version:
            document.documentElement.dataset.m8aV4ItriF13ScaleReadinessSurface ?? null,
          targetReached:
            document.documentElement.dataset
              .m8aV4ItriF13ScaleReadinessTargetReached ?? null,
          currentRouteActorCount:
            document.documentElement.dataset
              .m8aV4ItriF13ScaleReadinessCurrentRouteActorCount ?? null,
          actorCount:
            document.documentElement.dataset
              .m8aV4ItriF13ScaleReadinessActorCount ?? null,
          leoCount:
            document.documentElement.dataset
              .m8aV4ItriF13ScaleReadinessLeoCount ?? null,
          targetLeoCount:
            document.documentElement.dataset
              .m8aV4ItriF13ScaleReadinessTargetLeoCount ?? null,
          sourceType:
            document.documentElement.dataset
              .m8aV4ItriF13ScaleReadinessSourceType ?? null,
          sourceUrl:
            document.documentElement.dataset
              .m8aV4ItriF13ScaleReadinessSourceUrl ?? null,
          publicSourceUsed:
            document.documentElement.dataset
              .m8aV4ItriF13ScaleReadinessPublicSourceUsed ?? null,
          builtAtUtc:
            document.documentElement.dataset
              .m8aV4ItriF13ScaleReadinessBuiltAtUtc ?? null,
          freshnessTimestampUtc:
            document.documentElement.dataset
              .m8aV4ItriF13ScaleReadinessFreshnessTimestampUtc ?? null,
          closureClaimed:
            document.documentElement.dataset
              .m8aV4ItriF13ScaleReadinessClosureClaimed ?? null
        },
        productTelemetry: {
          version:
            productRoot?.dataset.m8aV4ItriF13ScaleReadinessSurface ?? null,
          targetReached:
            productRoot?.dataset.m8aV4ItriF13ScaleReadinessTargetReached ?? null,
          currentRouteActorCount:
            productRoot?.dataset
              .m8aV4ItriF13ScaleReadinessCurrentRouteActorCount ?? null,
          actorCount:
            productRoot?.dataset.m8aV4ItriF13ScaleReadinessActorCount ?? null,
          leoCount:
            productRoot?.dataset.m8aV4ItriF13ScaleReadinessLeoCount ?? null,
          targetLeoCount:
            productRoot?.dataset.m8aV4ItriF13ScaleReadinessTargetLeoCount ?? null,
          sourceType:
            productRoot?.dataset.m8aV4ItriF13ScaleReadinessSourceType ?? null,
          sourceUrl:
            productRoot?.dataset.m8aV4ItriF13ScaleReadinessSourceUrl ?? null,
          publicSourceUsed:
            productRoot?.dataset
              .m8aV4ItriF13ScaleReadinessPublicSourceUsed ?? null,
          builtAtUtc:
            productRoot?.dataset.m8aV4ItriF13ScaleReadinessBuiltAtUtc ?? null,
          freshnessTimestampUtc:
            productRoot?.dataset
              .m8aV4ItriF13ScaleReadinessFreshnessTimestampUtc ?? null,
          closureClaimed:
            productRoot?.dataset.m8aV4ItriF13ScaleReadinessClosureClaimed ?? null
        },
        layerDataset: datasetOf(layer),
        surfaceDataset: datasetOf(surface),
        hiddenHudDataset: datasetOf(hiddenHud)
      };
    })()`
  );
}

async function openEvidenceSurface(client) {
  let lastInspection = null;

  for (let attempt = 0; attempt < 60; attempt += 1) {
    lastInspection = await evaluateRuntimeValue(
      client,
      `(() => {
        const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
        capture?.m8aV4GroundStationScene?.pause?.();

        const productRoot = document.querySelector("[data-m8a-v47-product-ux='true']");
        const evidence = productRoot?.querySelector("[data-m8a-v47-control-id='evidence-toggle']");
        const sheet = productRoot?.querySelector("[data-m8a-v48-inspector='true']");

        if (
          evidence instanceof HTMLButtonElement &&
          (sheet?.hidden || productRoot?.dataset.m8aV411InspectorActiveTab !== "evidence")
        ) {
          evidence.click();
        }

        return {
          sheetHidden: sheet instanceof HTMLElement ? sheet.hidden : null,
          activeTab: productRoot?.dataset.m8aV411InspectorActiveTab ?? null,
          evidenceExpanded: evidence?.getAttribute("aria-expanded") ?? null
        };
      })()`
    );

    const inspection = await inspectF13ScaleReadiness(client);
    if (
      inspection.activeTab === "evidence" &&
      inspection.evidenceExpanded === "true" &&
      inspection.layerVisible === true &&
      inspection.surfaceVisible === true
    ) {
      return inspection;
    }

    await sleep(100);
  }

  throw new Error(
    `F-13 scale readiness evidence surface did not open: ${JSON.stringify(
      lastInspection
    )}`
  );
}

function assertString(value, expected, label, context) {
  assert(
    value === expected,
    `${label} mismatch: ${JSON.stringify({ value, expected, context })}`
  );
}

function assertCountString(value, expected, label, context) {
  assertString(value, String(expected), label, context);
}

function assertInspection(inspection) {
  assertString(inspection.route, REQUEST_PATH, "route", inspection);
  assert(
    inspection.routeActorCount === EXPECTED_ROUTE_ACTORS.total &&
      inspection.routeOrbitActorCounts?.leo === EXPECTED_ROUTE_ACTORS.leo &&
      inspection.routeOrbitActorCounts?.meo === EXPECTED_ROUTE_ACTORS.meo &&
      inspection.routeOrbitActorCounts?.geo === EXPECTED_ROUTE_ACTORS.geo,
    `Canonical route actor counts changed: ${JSON.stringify(inspection)}`
  );

  const stateReadiness = inspection.stateReadiness;
  assert(
    stateReadiness?.version === EXPECTED_VERSION &&
      stateReadiness?.currentRouteActorCount === EXPECTED_ROUTE_ACTORS.total &&
      stateReadiness?.currentRouteLeoActorCount === EXPECTED_ROUTE_ACTORS.leo &&
      stateReadiness?.currentRouteMeoActorCount === EXPECTED_ROUTE_ACTORS.meo &&
      stateReadiness?.currentRouteGeoActorCount === EXPECTED_ROUTE_ACTORS.geo &&
      stateReadiness?.readinessActorCount === EXPECTED_READINESS.total &&
      stateReadiness?.readinessLeoActorCount === EXPECTED_READINESS.leo &&
      stateReadiness?.readinessMeoActorCount === EXPECTED_READINESS.meo &&
      stateReadiness?.readinessGeoActorCount === EXPECTED_READINESS.geo &&
      stateReadiness?.targetLeoCount === EXPECTED_READINESS.targetLeo &&
      stateReadiness?.targetReached === true,
    `F-13 readiness state counts changed: ${JSON.stringify(stateReadiness)}`
  );

  assert(
    stateReadiness?.sourceType === EXPECTED_SOURCE_TYPE &&
      stateReadiness?.sourceUrl === EXPECTED_SOURCE_URL &&
      stateReadiness?.publicSourceUsed === false &&
      stateReadiness?.builtAtUtc === EXPECTED_BUILT_AT_UTC &&
      stateReadiness?.freshnessTimestampUtc === EXPECTED_BUILT_AT_UTC,
    `F-13 readiness state metadata changed: ${JSON.stringify(stateReadiness)}`
  );

  assert(
    stateReadiness?.routeNativeScaleClosureClaimed === false &&
      stateReadiness?.externalValidationClosureClaimed === false &&
      stateReadiness?.itriAuthorityClaimed === false &&
      inspection.statePhase71Evidence?.routeNativeScaleClaimed === false,
    `F-13 readiness must not claim closure or authority: ${JSON.stringify({
      stateReadiness,
      phase71: inspection.statePhase71Evidence
    })}`
  );

  for (const [label, telemetry] of [
    ["document", inspection.documentTelemetry],
    ["product", inspection.productTelemetry]
  ]) {
    assertString(telemetry.version, EXPECTED_VERSION, `${label} version`, telemetry);
    assertString(telemetry.targetReached, "true", `${label} target`, telemetry);
    assertCountString(
      telemetry.currentRouteActorCount,
      EXPECTED_ROUTE_ACTORS.total,
      `${label} current route actors`,
      telemetry
    );
    assertCountString(
      telemetry.actorCount,
      EXPECTED_READINESS.total,
      `${label} readiness actors`,
      telemetry
    );
    assertCountString(
      telemetry.leoCount,
      EXPECTED_READINESS.leo,
      `${label} readiness LEO actors`,
      telemetry
    );
    assertCountString(
      telemetry.targetLeoCount,
      EXPECTED_READINESS.targetLeo,
      `${label} target LEO actors`,
      telemetry
    );
    assertString(
      telemetry.sourceType,
      EXPECTED_SOURCE_TYPE,
      `${label} source type`,
      telemetry
    );
    assertString(
      telemetry.sourceUrl,
      EXPECTED_SOURCE_URL,
      `${label} source URL`,
      telemetry
    );
    assertString(
      telemetry.publicSourceUsed,
      "false",
      `${label} public source flag`,
      telemetry
    );
    assertString(
      telemetry.builtAtUtc,
      EXPECTED_BUILT_AT_UTC,
      `${label} built timestamp`,
      telemetry
    );
    assertString(
      telemetry.freshnessTimestampUtc,
      EXPECTED_BUILT_AT_UTC,
      `${label} freshness timestamp`,
      telemetry
    );
    assertString(
      telemetry.closureClaimed,
      "false",
      `${label} closure flag`,
      telemetry
    );
  }

  assertString(
    inspection.layerDataset.itriDemoL2F13ScaleReadinessVersion,
    EXPECTED_VERSION,
    "acceptance layer readiness version",
    inspection.layerDataset
  );
  assertString(
    inspection.surfaceDataset.itriF13ScaleReadinessVersion,
    EXPECTED_VERSION,
    "surface readiness version",
    inspection.surfaceDataset
  );
  assertString(
    inspection.surfaceDataset.itriF13ScaleReadinessSourceType,
    EXPECTED_SOURCE_TYPE,
    "surface source type",
    inspection.surfaceDataset
  );
  assertString(
    inspection.surfaceDataset.itriF13ScaleReadinessSourceUrl,
    EXPECTED_SOURCE_URL,
    "surface source URL",
    inspection.surfaceDataset
  );
  assertString(
    inspection.surfaceDataset.itriF13ScaleReadinessPublicSourceUsed,
    "false",
    "surface public source flag",
    inspection.surfaceDataset
  );
  assertString(
    inspection.surfaceDataset.itriF13ScaleReadinessBuiltAtUtc,
    EXPECTED_BUILT_AT_UTC,
    "surface built timestamp",
    inspection.surfaceDataset
  );
  assertString(
    inspection.surfaceDataset.itriF13ScaleReadinessFreshnessTimestampUtc,
    EXPECTED_BUILT_AT_UTC,
    "surface freshness timestamp",
    inspection.surfaceDataset
  );
  assertString(
    inspection.surfaceDataset.itriF13ScaleReadinessClosureClaimed,
    "false",
    "surface closure flag",
    inspection.surfaceDataset
  );

  assert(
    inspection.hiddenHudDataset.itriF13ScaleReadinessSurface ===
      EXPECTED_VERSION &&
      inspection.hiddenHudDataset.itriF13ScaleReadinessTargetReached === "true" &&
      inspection.hiddenHudDataset.itriF13ScaleReadinessClosureClaimed === "false",
    `Hidden runtime HUD must expose F-13 readiness telemetry: ${JSON.stringify(
      inspection.hiddenHudDataset
    )}`
  );

  const surfaceText = String(inspection.surfaceText ?? "").toLowerCase();
  assert(
    inspection.surfaceVisible === true &&
      inspection.knownGapCount >= 4 &&
      surfaceText.includes("current route actors") &&
      surfaceText.includes("readiness fixture actors") &&
      surfaceText.includes(">=500 leo readiness target") &&
      surfaceText.includes("fixture/model-backed") &&
      surfaceText.includes("not external validation closure") &&
      surfaceText.includes("not itri authority") &&
      surfaceText.includes("not measured network truth") &&
      surfaceText.includes("license/freshness notes"),
    `F-13 readiness surface text is incomplete: ${JSON.stringify({
      surfaceText: inspection.surfaceText,
      knownGapCount: inspection.knownGapCount
    })}`
  );

  const scanText = [inspection.surfaceText, inspection.layerText]
    .join(" ")
    .toLowerCase();
  const hits = FORBIDDEN_POSITIVE_CLAIMS.filter((claim) =>
    scanText.includes(claim)
  );
  assert(
    hits.length === 0,
    `F-13 readiness surface contains forbidden positive claims: ${JSON.stringify({
      hits,
      surfaceText: inspection.surfaceText
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
    await waitForF13ScaleReadinessReady(client);
    await waitForGlobeReady(client, "customer F-13 route-native scale readiness");

    const inspection = await openEvidenceSurface(client);
    assertInspection(inspection);

    writeJsonArtifact(
      outputRoot,
      `${VIEWPORT_DESKTOP.name}-f13-scale-readiness.json`,
      inspection
    );

    const screenshot = await captureScreenshot(
      client,
      outputRoot,
      `${VIEWPORT_DESKTOP.name}-f13-scale-readiness.png`
    );
    assertScreenshot(screenshot);
  });

  console.log(
    `customer F-13 route-native scale readiness validated. Output: ${outputRoot}`
  );
}

await main();
