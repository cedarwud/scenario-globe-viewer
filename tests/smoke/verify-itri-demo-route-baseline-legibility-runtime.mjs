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
const outputRoot = path.join(repoRoot, "output/itri-demo-route-baseline-legibility");

const REQUEST_PATH = "/?scenePreset=regional&m8aV4GroundStationScene=1";
const EXPECTED_ROUTE = "scenePreset=regional";
const EXPECTED_ENDPOINT_PAIR_ID =
  "taiwan-cht-speedcast-singapore-operator-family-2026-04-26";
const EXPECTED_PRECISION = "operator-family-only";
const EXPECTED_ACTOR_COUNTS = { leo: 6, meo: 5, geo: 2 };
const EXPECTED_TOTAL_ACTORS = 13;
const EXPECTED_LINK_FLOW_CUE_VERSION =
  "m8a-v4-link-flow-direction-cue-runtime.v1";
const EXPECTED_LINK_FLOW_MODE =
  "uplink-downlink-arrow-segments-with-moving-packet-trails";
const EXPECTED_LINK_FLOW_TRUTH_BOUNDARY =
  "modeled-direction-cue-not-packet-capture-or-measured-throughput";
const VIEWPORT_DESKTOP = {
  name: "desktop-1440x900",
  width: 1440,
  height: 900
};
const FORBIDDEN_POSITIVE_PHRASES = [
  "active serving satellite",
  "active gateway assignment",
  "active pair-specific teleport path",
  "pair-specific teleport path truth",
  "measured latency",
  "measured jitter",
  "measured throughput",
  "measured continuity",
  "native rf handover truth",
  "r2 runtime selector",
  "live ping",
  "iperf closure",
  "traffic generator closure"
];
const FORBIDDEN_UNIT_PATTERNS = [
  /\b\d+(?:\.\d+)?\s*ms\b/i,
  /\b\d+(?:\.\d+)?\s*Mbps\b/i,
  /\b\d+(?:\.\d+)?\s*Gbps\b/i
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertActorCounts(actual) {
  assert(
    actual?.leo === EXPECTED_ACTOR_COUNTS.leo &&
      actual?.meo === EXPECTED_ACTOR_COUNTS.meo &&
      actual?.geo === EXPECTED_ACTOR_COUNTS.geo,
    `Actor counts changed: ${JSON.stringify({ actual, expected: EXPECTED_ACTOR_COUNTS })}`
  );
}

function assertScreenshot(absolutePath) {
  const stat = statSync(absolutePath);
  assert(stat.size > 10_000, `Screenshot is unexpectedly small: ${absolutePath}`);
}

function assertNoForbiddenPositiveClaims(inspection) {
  const lowered = String(inspection.visibleRouteText ?? "").toLowerCase();
  const phraseHits = FORBIDDEN_POSITIVE_PHRASES.filter((phrase) =>
    lowered.includes(phrase)
  );
  const unitHits = FORBIDDEN_UNIT_PATTERNS.filter((pattern) =>
    pattern.test(inspection.visibleRouteText ?? "")
  ).map((pattern) => pattern.toString());

  assert(
    phraseHits.length === 0 && unitHits.length === 0,
    `Visible route text contains forbidden positive claims: ${JSON.stringify({
      phraseHits,
      unitHits
    })}`
  );
  assert(
    inspection.truthBoundaryTelemetry.activeSatelliteTruth === "not-claimed" &&
      inspection.truthBoundaryTelemetry.activeGatewayTruth === "not-claimed" &&
      inspection.truthBoundaryTelemetry.pairSpecificTeleportPathTruth ===
        "not-claimed" &&
      inspection.truthBoundaryTelemetry.nativeRfHandoverTruth === "not-claimed" &&
      inspection.truthBoundaryTelemetry.measuredLatency === false &&
      inspection.truthBoundaryTelemetry.measuredJitter === false &&
      inspection.truthBoundaryTelemetry.measuredThroughput === false,
    `Telemetry must keep forbidden truth unclaimed: ${JSON.stringify(
      inspection.truthBoundaryTelemetry
    )}`
  );
}

async function waitForRouteBaselineReady(client) {
  let lastState = null;

  for (let attempt = 0; attempt < 240; attempt += 1) {
    lastState = await evaluateRuntimeValue(
      client,
      `(() => {
        const root = document.documentElement;
        const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
        const state = capture?.m8aV4GroundStationScene?.getState?.();

        return {
          bootstrapState: root?.dataset.bootstrapState ?? null,
          scenePreset: root?.dataset.scenePreset ?? null,
          hasViewer: Boolean(capture?.viewer),
          hasV4Scene: Boolean(state),
          endpointPairId: state?.simulationHandoverModel?.endpointPairId ?? null,
          actorCount: state?.actorCount ?? null,
          linkFlowCue: state?.relationCues?.dataFlowCueVersion ?? null
        };
      })()`
    );

    if (
      lastState?.bootstrapState === "ready" &&
      lastState?.scenePreset === "regional" &&
      lastState?.hasViewer &&
      lastState?.hasV4Scene &&
      lastState?.endpointPairId === EXPECTED_ENDPOINT_PAIR_ID &&
      lastState?.actorCount === EXPECTED_TOTAL_ACTORS &&
      lastState?.linkFlowCue === EXPECTED_LINK_FLOW_CUE_VERSION
    ) {
      return lastState;
    }

    await sleep(100);
  }

  throw new Error(`ITRI demo route did not become ready: ${JSON.stringify(lastState)}`);
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
            : null
        };
      })()`
    );

    if (
      lastState?.hasProductRoot &&
      lastState?.detailsExpanded === "true" &&
      lastState?.sheetHidden === false &&
      lastState?.sheetRect?.width > 0 &&
      lastState?.sheetRect?.height > 0
    ) {
      return lastState;
    }

    await sleep(100);
  }

  throw new Error(`Inspector did not open for baseline capture: ${JSON.stringify(lastState)}`);
}

async function inspectBaseline(client) {
  await evaluateRuntimeValue(client, `document.fonts.ready.then(() => true)`, {
    awaitPromise: true
  });

  return await evaluateRuntimeValue(
    client,
    `(() => {
      const normalize = (value) => String(value ?? "").replace(/\\s+/g, " ").trim();
      const hasCjk = (value) => /\\p{Script=Han}|[\\u3000-\\u303f\\uff00-\\uffef]/u.test(value);
      const rectToPlain = (rect) => ({
        left: Math.round(rect.left),
        top: Math.round(rect.top),
        right: Math.round(rect.right),
        bottom: Math.round(rect.bottom),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      });
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
          rect.height > 0 &&
          rect.bottom >= 0 &&
          rect.right >= 0 &&
          rect.top <= window.innerHeight &&
          rect.left <= window.innerWidth
        );
      };
      const visibleTextNodes = (root) => {
        const records = [];

        if (!root) {
          return records;
        }

        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

        while (walker.nextNode()) {
          const node = walker.currentNode;
          const text = normalize(node.textContent);
          const parent = node.parentElement;

          if (!text || !parent || !isVisible(parent)) {
            continue;
          }

          const style = window.getComputedStyle(parent);
          records.push({
            text,
            hasCjk: hasCjk(text),
            tagName: parent.tagName.toLowerCase(),
            className: parent.className,
            fontFamily: style.fontFamily,
            fontSize: style.fontSize,
            fontWeight: style.fontWeight,
            rect: rectToPlain(parent.getBoundingClientRect())
          });
        }

        return records;
      };
      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      const state = capture?.m8aV4GroundStationScene?.getState?.();
      const productRoot = document.querySelector("[data-m8a-v47-product-ux='true']");
      const hudRoot = document.querySelector("[data-m8a-v4-ground-station-scene='true']");
      const rootStyle = window.getComputedStyle(document.documentElement);
      const productTextRecords = visibleTextNodes(productRoot);
      const visibleRouteText = productTextRecords.map((record) => record.text).join(" ");
      const cjkVisibleTextRecords = productTextRecords.filter((record) => record.hasCjk);
      const tofuLiteralHits = cjkVisibleTextRecords.filter((record) =>
        /[\\u25a1\\ufffd]/u.test(record.text)
      );
      const fontCheckFailures = cjkVisibleTextRecords
        .map((record) => ({
          text: record.text,
          ok: document.fonts.check(
            \`\${record.fontWeight} \${record.fontSize} "Noto Sans TC M8A V411 Subset"\`,
            record.text
          )
        }))
        .filter((record) => !record.ok);
      const countdown = productRoot?.querySelector(
        "[data-m8a-v411-countdown-surface='true']"
      );

      return {
        route: {
          requestPath: window.location.pathname + window.location.search,
          expectedRoute: ${JSON.stringify(EXPECTED_ROUTE)},
          scenePreset: document.documentElement.dataset.scenePreset ?? null,
          directRoute: state?.directRoute ?? null
        },
        baseline: {
          actorCount: state?.actorCount ?? null,
          orbitActorCounts: state?.orbitActorCounts ?? null,
          endpointPairId: state?.simulationHandoverModel?.endpointPairId ?? null,
          acceptedPairPrecision:
            state?.simulationHandoverModel?.acceptedPairPrecision ?? null,
          route: state?.simulationHandoverModel?.route ?? null
        },
        linkFlowCue: {
          version: state?.relationCues?.dataFlowCueVersion ?? null,
          mode: state?.relationCues?.dataFlowCueMode ?? null,
          directions: state?.relationCues?.dataFlowDirections ?? null,
          pulseCount: state?.relationCues?.dataFlowPulseCount ?? null,
          truthBoundary: state?.relationCues?.dataFlowTruthBoundary ?? null,
          documentTelemetry: {
            version: document.documentElement.dataset.m8aV4LinkFlowCue ?? null,
            mode: document.documentElement.dataset.m8aV4LinkFlowCueMode ?? null,
            directions:
              document.documentElement.dataset.m8aV4LinkFlowDirections ?? null,
            pulseCount:
              document.documentElement.dataset.m8aV4LinkFlowPulseCount ?? null,
            truthBoundary:
              document.documentElement.dataset.m8aV4LinkFlowTruthBoundary ?? null
          },
          hudTelemetry: {
            version: hudRoot?.dataset.linkFlowCue ?? null,
            mode: hudRoot?.dataset.linkFlowCueMode ?? null,
            directions: hudRoot?.dataset.linkFlowDirections ?? null,
            pulseCount: hudRoot?.dataset.linkFlowPulseCount ?? null,
            truthBoundary: hudRoot?.dataset.linkFlowTruthBoundary ?? null
          }
        },
        truthBoundaryTelemetry: {
          activeSatelliteTruth: state?.relationCues?.activeSatelliteTruth ?? null,
          activeGatewayTruth: state?.relationCues?.activeGatewayTruth ?? null,
          pairSpecificTeleportPathTruth:
            state?.relationCues?.pairSpecificTeleportPathTruth ?? null,
          nativeRfHandoverTruth: state?.relationCues?.nativeRfHandoverTruth ?? null,
          measuredLatency: state?.serviceState?.measuredLatency ?? null,
          measuredJitter: state?.serviceState?.measuredJitter ?? null,
          measuredThroughput: state?.serviceState?.measuredThroughput ?? null
        },
        fontLegibility: {
          fontStatus: document.fonts.status,
          cjkSubsetFaces: Array.from(document.fonts)
            .filter((face) => face.family === "Noto Sans TC M8A V411 Subset")
            .map((face) => ({
              family: face.family,
              status: face.status,
              weight: face.weight,
              style: face.style
            })),
          uiFontToken: rootStyle.getPropertyValue("--m8a-v411-font-ui").trim(),
          dataFontToken: rootStyle.getPropertyValue("--m8a-v411-font-data").trim(),
          productRootFontFamily: productRoot
            ? window.getComputedStyle(productRoot).fontFamily
            : null,
          countdownFontFamily:
            countdown instanceof HTMLElement
              ? window.getComputedStyle(countdown).fontFamily
              : null,
          cjkVisibleTextCount: cjkVisibleTextRecords.length,
          cjkVisibleTextSamples: cjkVisibleTextRecords.slice(0, 18),
          fontCheckFailures,
          tofuLiteralHits
        },
        visibleRouteText
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
    await waitForRouteBaselineReady(client);
    await waitForGlobeReady(client, "ITRI demo route baseline legibility");
    await openInspectorForCapture(client);
    await sleep(500);

    const inspection = await inspectBaseline(client);

    writeJsonArtifact(
      outputRoot,
      `${VIEWPORT_DESKTOP.name}-inspection.json`,
      inspection
    );

    assert(
      inspection.route.requestPath === REQUEST_PATH,
      `Route path changed: ${JSON.stringify(inspection.route)}`
    );
    assert(
      inspection.route.scenePreset === "regional",
      `Scene preset must remain regional: ${JSON.stringify(inspection.route)}`
    );
    assert(
      inspection.baseline.actorCount === EXPECTED_TOTAL_ACTORS,
      `Actor total changed: ${JSON.stringify(inspection.baseline)}`
    );
    assertActorCounts(inspection.baseline.orbitActorCounts);
    assert(
      inspection.baseline.endpointPairId === EXPECTED_ENDPOINT_PAIR_ID,
      `Endpoint pair changed: ${JSON.stringify(inspection.baseline)}`
    );
    assert(
      inspection.baseline.acceptedPairPrecision === EXPECTED_PRECISION,
      `Precision changed: ${JSON.stringify(inspection.baseline)}`
    );
    assert(
      inspection.linkFlowCue.version === EXPECTED_LINK_FLOW_CUE_VERSION &&
        inspection.linkFlowCue.documentTelemetry.version ===
          EXPECTED_LINK_FLOW_CUE_VERSION &&
        inspection.linkFlowCue.hudTelemetry.version ===
          EXPECTED_LINK_FLOW_CUE_VERSION,
      `Link-flow cue version changed: ${JSON.stringify(inspection.linkFlowCue)}`
    );
    assert(
      inspection.linkFlowCue.mode === EXPECTED_LINK_FLOW_MODE &&
        inspection.linkFlowCue.documentTelemetry.mode === EXPECTED_LINK_FLOW_MODE,
      `Link-flow cue mode changed: ${JSON.stringify(inspection.linkFlowCue)}`
    );
    assert(
      inspection.linkFlowCue.truthBoundary === EXPECTED_LINK_FLOW_TRUTH_BOUNDARY &&
        inspection.linkFlowCue.documentTelemetry.truthBoundary ===
          EXPECTED_LINK_FLOW_TRUTH_BOUNDARY,
      `Link-flow truth boundary changed: ${JSON.stringify(inspection.linkFlowCue)}`
    );
    assert(
      inspection.linkFlowCue.pulseCount === 12 &&
        inspection.linkFlowCue.documentTelemetry.pulseCount === "12",
      `Link-flow pulse count changed: ${JSON.stringify(inspection.linkFlowCue)}`
    );
    assertNoForbiddenPositiveClaims(inspection);
    assert(
      inspection.fontLegibility.cjkSubsetFaces.some(
        (face) => face.status === "loaded"
      ),
      `Local CJK subset font did not load: ${JSON.stringify(
        inspection.fontLegibility.cjkSubsetFaces
      )}`
    );
    assert(
      inspection.fontLegibility.dataFontToken.includes(
        "Noto Sans TC M8A V411 Subset"
      ),
      `Data font stack must keep CJK fallback: ${inspection.fontLegibility.dataFontToken}`
    );
    assert(
      inspection.fontLegibility.countdownFontFamily?.includes(
        "Noto Sans TC M8A V411 Subset"
      ),
      `Countdown/data labels must resolve the local CJK fallback: ${JSON.stringify(
        inspection.fontLegibility
      )}`
    );
    assert(
      inspection.fontLegibility.cjkVisibleTextCount > 0,
      `Expected visible CJK text samples: ${JSON.stringify(
        inspection.fontLegibility
      )}`
    );
    assert(
      inspection.fontLegibility.fontCheckFailures.length === 0 &&
        inspection.fontLegibility.tofuLiteralHits.length === 0,
      `CJK legibility probe found missing local font coverage: ${JSON.stringify(
        inspection.fontLegibility
      )}`
    );

    const screenshot = await captureScreenshot(
      client,
      outputRoot,
      `${VIEWPORT_DESKTOP.name}.png`
    );
    assertScreenshot(screenshot);
  });

  console.log(`ITRI demo route baseline legibility validated. Output: ${outputRoot}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
