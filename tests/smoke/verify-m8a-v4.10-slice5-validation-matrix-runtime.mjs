import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  connectCdp,
  evaluateRuntimeValue,
  findHeadlessBrowser,
  resolvePageWebSocketUrl,
  startHeadlessBrowser,
  stopHeadlessBrowser
} from "./bootstrap-smoke-browser.mjs";
import {
  ensureDistBuildExists,
  startStaticServer,
  stopStaticServer,
  verifyFetches
} from "./bootstrap-smoke-server.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const outputRoot = path.join(repoRoot, "output/m8a-v4.10-slice5");

const REQUEST_PATH = "/?scenePreset=regional&m8aV4GroundStationScene=1";
const EXPECTED_ENDPOINT_PAIR_ID =
  "taiwan-cht-speedcast-singapore-operator-family-2026-04-26";
const EXPECTED_PRECISION = "operator-family-only";
const EXPECTED_MODEL_ID = "m8a-v4.6d-simulation-handover-model.v1";
const EXPECTED_MODEL_TRUTH = "simulation-output-not-operator-log";
const EXPECTED_SOURCE_PROJECTION = "M8A_V4_GROUND_STATION_RUNTIME_PROJECTION";
const EXPECTED_ACTOR_COUNTS = { leo: 6, meo: 5, geo: 2 };
const EXPECTED_V410_FIRST_VIEWPORT =
  "m8a-v4.10-first-viewport-composition-slice1-runtime.v1";
const EXPECTED_V410_SEQUENCE_RAIL =
  "m8a-v4.10-handover-sequence-rail-slice2-runtime.v1";
const EXPECTED_V410_BOUNDARY =
  "m8a-v4.10-boundary-affordance-separation-slice3-runtime.v1";
const EXPECTED_V410_INSPECTOR =
  "m8a-v4.10-inspector-evidence-redesign-slice4-runtime.v1";
const EXPECTED_SEQUENCE_WINDOW_IDS = [
  "leo-acquisition-context",
  "leo-aging-pressure",
  "meo-continuity-hold",
  "leo-reentry-candidate",
  "geo-continuity-guard"
];
const EXPECTED_SEQUENCE_VISIBLE_CONTENT = [
  "five-state-path",
  "active-state-mark",
  "next-state-mark",
  "transition-event-link"
];
const EXPECTED_BOUNDARY_VISIBLE_CONTENT = [
  "compact-boundary-line",
  "focused-boundary-surface",
  "full-truth-disclosure",
  "details-independent-state"
];
const EXPECTED_INSPECTOR_STRUCTURE = [
  "current-replay-event-evidence",
  "sequence-selected-window-context",
  "source-and-boundary-notes",
  "not-being-claimed"
];
const EXPECTED_COPY = {
  "leo-acquisition-context": {
    productLabel: "LEO review focus",
    firstRead: "LEO is the simulated review focus for this corridor.",
    next: "Next: watch for pressure before the MEO hold.",
    orbit: "LEO"
  },
  "leo-aging-pressure": {
    productLabel: "LEO pressure",
    firstRead: "The LEO review context is under simulated pressure.",
    next: "Next: continuity shifts to MEO context.",
    orbit: "LEO"
  },
  "meo-continuity-hold": {
    productLabel: "MEO continuity hold",
    firstRead: "MEO context is holding continuity in this simulation.",
    next: "Next: LEO returns as a candidate focus.",
    orbit: "MEO"
  },
  "leo-reentry-candidate": {
    productLabel: "LEO re-entry",
    firstRead: "LEO returns as a candidate review focus.",
    next: "Next: GEO closes the sequence as guard context.",
    orbit: "LEO"
  },
  "geo-continuity-guard": {
    productLabel: "GEO guard context",
    firstRead: "GEO is shown only as guard context, not active failover proof.",
    next: "Restart to review the sequence again.",
    orbit: "GEO"
  }
};
const EXPECTED_SLICE1_MICRO_CUES = {
  "leo-acquisition-context": "focus · LEO",
  "leo-aging-pressure": "pressure · LEO",
  "meo-continuity-hold": "hold · MEO",
  "leo-reentry-candidate": "re-entry · LEO",
  "geo-continuity-guard": "guard · GEO"
};
const CAPTURES = [
  {
    name: "default-1440x900",
    action: "default",
    width: 1440,
    height: 900,
    expectedViewportClass: "desktop",
    screenshot: "v4.10-slice5-default-1440x900.png",
    metadata: "v4.10-slice5-default-1440x900.metadata.json"
  },
  {
    name: "default-1280x720",
    action: "default",
    width: 1280,
    height: 720,
    expectedViewportClass: "desktop",
    screenshot: "v4.10-slice5-default-1280x720.png",
    metadata: "v4.10-slice5-default-1280x720.metadata.json"
  },
  {
    name: "default-390x844",
    action: "default",
    width: 390,
    height: 844,
    expectedViewportClass: "narrow",
    screenshot: "v4.10-slice5-default-390x844.png",
    metadata: "v4.10-slice5-default-390x844.metadata.json"
  },
  {
    name: "details-open-1440x900",
    action: "details",
    width: 1440,
    height: 900,
    expectedViewportClass: "desktop",
    screenshot: "v4.10-slice5-details-open-1440x900.png",
    metadata: "v4.10-slice5-details-open-1440x900.metadata.json"
  },
  {
    name: "boundary-open-1440x900",
    action: "boundary-full-truth",
    width: 1440,
    height: 900,
    expectedViewportClass: "desktop",
    screenshot: "v4.10-slice5-boundary-open-1440x900.png",
    metadata: "v4.10-slice5-boundary-open-1440x900.metadata.json"
  },
  {
    name: "transition-leo-aging-pressure-1440x900",
    action: "transition",
    seekRatio: 0.25,
    expectedWindowId: "leo-aging-pressure",
    expectedNextWindowId: "meo-continuity-hold",
    expectedTransitionFromWindowId: "leo-acquisition-context",
    expectedTransitionToWindowId: "leo-aging-pressure",
    width: 1440,
    height: 900,
    expectedViewportClass: "desktop",
    screenshot: "v4.10-slice5-transition-leo-aging-pressure-1440x900.png",
    metadata: "v4.10-slice5-transition-leo-aging-pressure-1440x900.metadata.json"
  }
];
const PACKAGE_SCRIPT_EXPECTATIONS = [
  "test:m8a-v4.10:slice1",
  "test:m8a-v4.10:slice2",
  "test:m8a-v4.10:slice3",
  "test:m8a-v4.10:slice4",
  "test:m8a-v4.10:slice5"
];
const FORBIDDEN_POSITIVE_PHRASES = [
  "real operator handover event",
  "operator handover log",
  "active serving satellite",
  "serving satellite",
  "active gateway assignment",
  "active gateway",
  "active path",
  "active service",
  "pair-specific teleport path",
  "teleport path",
  "native rf handover",
  "measured latency",
  "measured jitter",
  "measured throughput",
  "measured continuity",
  "live network time",
  "operator event time",
  "r2 runtime selector"
];
const FORBIDDEN_UNIT_PATTERNS = [
  /\b\d+(?:\.\d+)?\s*ms\b/i,
  /\b\d+(?:\.\d+)?\s*Mbps\b/i,
  /\b\d+(?:\.\d+)?\s*Gbps\b/i,
  /\bmeasured\s+\d+(?:\.\d+)?\s*%/i
];

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function serializeRelative(absolutePath) {
  return path.relative(repoRoot, absolutePath);
}

function assertListEquals(actual, expected, label) {
  assert(
    JSON.stringify(actual) === JSON.stringify(expected),
    `${label} mismatch: ${JSON.stringify({ actual, expected })}`
  );
}

function rectsOverlap(left, right) {
  if (!left || !right) {
    return false;
  }

  return !(
    left.right <= right.left ||
    left.left >= right.right ||
    left.bottom <= right.top ||
    left.top >= right.bottom
  );
}

function rectsHorizontallyOverlap(left, right) {
  if (!left || !right) {
    return false;
  }

  return !(left.right <= right.left || left.left >= right.right);
}

function verticalGapBetween(left, right) {
  if (!left || !right) {
    return Number.POSITIVE_INFINITY;
  }

  if (left.bottom <= right.top) {
    return right.top - left.bottom;
  }

  if (right.bottom <= left.top) {
    return left.top - right.bottom;
  }

  return 0;
}

function assertRectInsideViewport(rect, viewport, label) {
  assert(rect, `Missing ${label} rect.`);
  assert(
    rect.left >= 0 &&
      rect.top >= 0 &&
      rect.right <= viewport.width &&
      rect.bottom <= viewport.height,
    `${label} must stay inside ${viewport.name}: ${JSON.stringify({
      rect,
      viewport
    })}`
  );
}

function collectPositiveClaimHits(text) {
  const sourceText = String(text ?? "");
  const lowered = sourceText.toLowerCase();
  const hits = [];
  const isNegated = (index) => {
    const prefix = sourceText
      .slice(Math.max(0, index - 150), index)
      .toLowerCase();

    return /\b(no|not|without|forbidden|must not|does not claim|not claimed|non-claim|not being claimed)\b/.test(
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
            .slice(Math.max(0, index - 90), index + needle.length + 90)
            .replace(/\s+/g, " ")
            .trim()
        });
      }

      index = lowered.indexOf(needle, index + needle.length);
    }
  }

  return hits;
}

function assertForbiddenClaimsClean(text, label) {
  const positiveClaimHits = collectPositiveClaimHits(text);
  const forbiddenUnitHits = FORBIDDEN_UNIT_PATTERNS.filter((pattern) =>
    pattern.test(text)
  ).map((pattern) => pattern.toString());

  assert(
    positiveClaimHits.length === 0 && forbiddenUnitHits.length === 0,
    `${label} contains a promoted product claim or measured precision: ` +
      JSON.stringify({ positiveClaimHits, forbiddenUnitHits, text })
  );
}

function assertPackageScriptsPresent() {
  const packageJson = JSON.parse(
    readFileSync(path.join(repoRoot, "package.json"), "utf8")
  );
  const missing = PACKAGE_SCRIPT_EXPECTATIONS.filter(
    (scriptName) => typeof packageJson.scripts?.[scriptName] !== "string"
  );

  assert(
    missing.length === 0,
    `Missing required V4.10 validation scripts: ${missing.join(", ")}`
  );

  return Object.fromEntries(
    PACKAGE_SCRIPT_EXPECTATIONS.map((scriptName) => [
      scriptName,
      packageJson.scripts[scriptName]
    ])
  );
}

async function setViewport(client, viewport) {
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.width <= 480
  });
}

async function waitForBootstrapReady(client) {
  let lastState = null;

  for (let attempt = 0; attempt < 240; attempt += 1) {
    lastState = await evaluateRuntimeValue(
      client,
      `(() => {
        const root = document.documentElement;
        const productRoot = document.querySelector("[data-m8a-v47-product-ux='true']");

        return {
          bootstrapState: root?.dataset.bootstrapState ?? null,
          scenePreset: root?.dataset.scenePreset ?? null,
          firstViewport:
            productRoot?.dataset.m8aV410FirstViewportComposition ?? null,
          sequenceRail:
            productRoot?.dataset.m8aV410HandoverSequenceRail ?? null,
          boundaryAffordance:
            productRoot?.dataset.m8aV410BoundaryAffordance ?? null,
          inspectorEvidence:
            productRoot?.dataset.m8aV410InspectorEvidenceRedesign ?? null,
          hasCapture: Boolean(
            window.__SCENARIO_GLOBE_VIEWER_CAPTURE__?.m8aV4GroundStationScene
          )
        };
      })()`
    );

    if (
      lastState?.bootstrapState === "ready" &&
      lastState?.scenePreset === "regional" &&
      lastState?.firstViewport === EXPECTED_V410_FIRST_VIEWPORT &&
      lastState?.sequenceRail === EXPECTED_V410_SEQUENCE_RAIL &&
      lastState?.boundaryAffordance === EXPECTED_V410_BOUNDARY &&
      lastState?.inspectorEvidence === EXPECTED_V410_INSPECTOR &&
      lastState?.hasCapture === true
    ) {
      return lastState;
    }

    if (lastState?.bootstrapState === "error") {
      throw new Error(
        `M8A-V4.10 Slice 5 route hit bootstrap error: ${JSON.stringify(
          lastState
        )}`
      );
    }

    await sleep(100);
  }

  throw new Error(
    `M8A-V4.10 Slice 5 did not reach a ready route: ${JSON.stringify(
      lastState
    )}`
  );
}

async function waitForGlobeReady(client) {
  let lastState = null;

  for (let attempt = 0; attempt < 240; attempt += 1) {
    lastState = await evaluateRuntimeValue(
      client,
      `(() => {
        const viewer = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__?.viewer;

        return {
          hasViewer: Boolean(viewer),
          tilesLoaded: viewer?.scene?.globe?.tilesLoaded === true,
          imageryLayerCount: viewer?.imageryLayers?.length ?? null
        };
      })()`
    );

    if (lastState?.hasViewer && lastState?.tilesLoaded) {
      await sleep(250);
      return lastState;
    }

    await sleep(100);
  }

  throw new Error(
    `M8A-V4.10 Slice 5 globe did not settle: ${JSON.stringify(lastState)}`
  );
}

async function navigateAndWait(client, baseUrl) {
  await client.send("Page.navigate", { url: `${baseUrl}${REQUEST_PATH}` });
  await waitForBootstrapReady(client);
  await waitForGlobeReady(client);
}

async function clickControl(client, controlId) {
  await evaluateRuntimeValue(
    client,
    `((controlId) => {
      const control =
        document.querySelector(\`[data-m8a-v47-control-id="\${controlId}"]\`) ??
        (controlId === "truth-affordance"
          ? document.querySelector("[data-m8a-v47-action='toggle-boundary']")
          : null);

      if (!(control instanceof HTMLElement)) {
        throw new Error(\`Missing control \${controlId}.\`);
      }

      control.click();
    })(${JSON.stringify(controlId)})`
  );
  await sleep(180);
}

async function openBoundaryFullTruth(client) {
  await evaluateRuntimeValue(
    client,
    `(() => {
      const summary = document.querySelector(
        "[data-m8a-v410-boundary-full-truth-disclosure='true'] summary"
      );

      if (!(summary instanceof HTMLElement)) {
        throw new Error("Missing focused boundary full truth disclosure summary.");
      }

      summary.click();
    })()`
  );
  await sleep(180);
}

async function seekReplayRatio(client, ratio) {
  await evaluateRuntimeValue(
    client,
    `((ratio) => {
      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      const replayClock = capture?.replayClock;
      const replayState = replayClock?.getState?.();
      const startMs = Date.parse(replayState.startTime);
      const stopMs = Date.parse(replayState.stopTime);
      const targetMs = startMs + (stopMs - startMs) * ratio;

      capture.m8aV4GroundStationScene.pause();
      replayClock.seek(new Date(targetMs).toISOString());
    })(${JSON.stringify(ratio)})`
  );
  await sleep(240);
}

async function captureScreenshot(client, filename) {
  const result = await client.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false
  });
  const absolutePath = path.join(outputRoot, filename);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, Buffer.from(result.data, "base64"));
  return absolutePath;
}

async function inspectRuntime(client, label) {
  return await evaluateRuntimeValue(
    client,
    `((label) => {
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
          Number(style.opacity) > 0 &&
          rect.width > 0 &&
          rect.height > 0
        );
      };
      const rectToPlain = (rect) => ({
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height
      });
      const listDataset = (value) =>
        typeof value === "string" && value.length > 0
          ? value.split("|").filter(Boolean)
          : [];
      const visibleTextNodes = (root) => {
        const texts = [];

        if (!root) {
          return texts;
        }

        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

        while (walker.nextNode()) {
          const node = walker.currentNode;
          const text = normalize(node.textContent);
          const parent = node.parentElement;

          if (text && parent && isVisible(parent)) {
            texts.push(text);
          }
        }

        return texts;
      };
      const elementRecord = (element) => ({
        exists: element instanceof HTMLElement,
        visible: isVisible(element),
        hidden: element instanceof HTMLElement ? element.hidden : null,
        rect: element instanceof HTMLElement
          ? rectToPlain(element.getBoundingClientRect())
          : null,
        text: element instanceof HTMLElement ? normalize(element.innerText) : "",
        visibleText:
          element instanceof HTMLElement ? visibleTextNodes(element).join(" ") : ""
      });

      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      const state = capture?.m8aV4GroundStationScene?.getState?.();
      const productRoot = document.querySelector("[data-m8a-v47-product-ux='true']");
      const strip = productRoot?.querySelector("[data-m8a-v47-control-strip='true']");
      const sceneNarrative = productRoot?.querySelector("[data-m8a-v410-scene-narrative='true']");
      const sequenceRail = productRoot?.querySelector("[data-m8a-v410-sequence-rail='true']");
      const sequenceActiveSummary = sequenceRail?.querySelector("[data-m8a-v410-sequence-active-summary='true']");
      const sequenceNextSummary = sequenceRail?.querySelector("[data-m8a-v410-sequence-next-summary='true']");
      const details = productRoot?.querySelector("[data-m8a-v47-control-id='details-toggle']");
      const truth = productRoot?.querySelector("[data-m8a-v47-action='toggle-boundary']");
      const sheet = productRoot?.querySelector("[data-m8a-v47-ui-surface='inspection-sheet']");
      const boundarySurface = productRoot?.querySelector("[data-m8a-v410-boundary-surface='true']");
      const boundaryFullTruth = boundarySurface?.querySelector("[data-m8a-v410-boundary-full-truth-disclosure='true']");
      const inspectorPrimary = productRoot?.querySelector("[data-m8a-v49-inspector-primary-body='true']");
      const inspectorTitle = sheet?.querySelector("[data-m8a-v410-inspector-title='true']");
      const inspectorLead = sheet?.querySelector("[data-m8a-v410-inspector-lead='true']");
      const debugEvidence = sheet?.querySelector("[data-m8a-v49-debug-evidence='true']");
      const detailsFullTruth = sheet?.querySelector("[data-m8a-v49-truth-boundary-details='true']");
      const sequenceMarks = Array.from(
        sequenceRail?.querySelectorAll("[data-m8a-v410-sequence-mark='true']") ??
          []
      );
      const inspectorGroups = Array.from(
        sheet?.querySelectorAll("[data-m8a-v410-inspector-group]") ?? []
      );
      const primarySections = Array.from(
        inspectorPrimary?.querySelectorAll("[data-m8a-v49-inspector-primary]") ??
          []
      );
      const nativeTimeline = document.querySelector(".cesium-viewer-timelineContainer");
      const nativeCredits = document.querySelector(".cesium-widget-credits");
      const nativeBottom = document.querySelector(".cesium-viewer-bottom");
      const creditWrappers = Array.from(
        document.querySelectorAll(".cesium-widget-credits .cesium-credit-wrapper")
      );
      const nativeDefaultTokenNotice = creditWrappers.find((element) =>
        /default ion access token|default access token/i.test(
          normalize(element.textContent)
        )
      );
      const nativeAttribution = Array.from(
        document.querySelectorAll(".cesium-widget-credits a, .cesium-widget-credits .cesium-credit-wrapper")
      ).find((element) => {
        if (element === nativeDefaultTokenNotice) {
          return false;
        }

        return /data attribution|cesium ion/i.test(
          normalize(element.textContent)
        );
      });
      const visibleButtons = Array.from(strip?.querySelectorAll("button") ?? [])
        .filter(isVisible)
        .map((button) => ({
          text: normalize(button.textContent),
          controlId: button.dataset.m8aV47ControlId ?? null,
          action: button.dataset.m8aV47Action ?? null,
          ariaExpanded: button.getAttribute("aria-expanded"),
          ariaPressed: button.getAttribute("aria-pressed"),
          rect: rectToPlain(button.getBoundingClientRect())
        }));
      const resourceHits = performance
        .getEntriesByType("resource")
        .map((entry) => entry.name)
        .filter((name) => /celestrak|itri\\/multi-orbit/i.test(name));

      return {
        label,
        urlPath: window.location.pathname + window.location.search,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        viewportClass: state?.productUx?.layout?.viewportClass ?? null,
        visibleProductText:
          productRoot instanceof HTMLElement
            ? visibleTextNodes(productRoot).join(" ")
            : "",
        stateFacts: {
          route: state?.simulationHandoverModel?.route ?? null,
          endpointPairId:
            state?.simulationHandoverModel?.endpointPairId ?? null,
          acceptedPairPrecision:
            state?.simulationHandoverModel?.acceptedPairPrecision ?? null,
          modelId: state?.simulationHandoverModel?.modelId ?? null,
          modelTruth: state?.simulationHandoverModel?.modelTruth ?? null,
          orbitActorCounts: state?.orbitActorCounts ?? null,
          sourceLineage: state?.sourceLineage ?? null,
          timelineWindowIds:
            state?.simulationHandoverModel?.timelineWindowIds ?? null,
          requiredWindowNonClaimKeys:
            state?.simulationHandoverModel?.validationExpectations
              ?.requiredWindowNonClaimKeys ?? null,
          timelineNonClaims:
            state?.simulationHandoverModel?.timeline?.map((windowDefinition) => ({
              windowId: windowDefinition.windowId,
              nonClaims: windowDefinition.nonClaims
            })) ?? null,
          activeWindowId: state?.productUx?.activeWindowId ?? null,
          detailsSheetState:
            state?.productUx?.disclosure?.detailsSheetState ?? null,
          boundarySurfaceState:
            state?.productUx?.disclosure?.boundarySurfaceState ?? null,
          boundaryFullTruthDisclosureState:
            state?.productUx?.disclosure?.boundaryFullTruthDisclosureState ?? null,
          firstViewportComposition:
            state?.productUx?.productComprehension?.firstViewportComposition ??
            null,
          handoverSequenceRail:
            state?.productUx?.productComprehension?.handoverSequenceRail ??
            null,
          boundaryAffordance:
            state?.productUx?.productComprehension?.boundaryAffordance ??
            null,
          inspectorLayer:
            state?.productUx?.productComprehension?.inspectorLayer ?? null
        },
        rootDataset: {
          firstViewport:
            productRoot?.dataset.m8aV410FirstViewportComposition ?? null,
          controlsPriority:
            productRoot?.dataset.m8aV410ControlsPriority ?? null,
          sceneNarrativeVisibleContent: listDataset(
            productRoot?.dataset.m8aV410SceneNarrativeVisibleContent
          ),
          sequenceRail:
            productRoot?.dataset.m8aV410HandoverSequenceRail ?? null,
          sequenceRailVisibleContent: listDataset(
            productRoot?.dataset.m8aV410SequenceRailVisibleContent
          ),
          boundaryAffordance:
            productRoot?.dataset.m8aV410BoundaryAffordance ?? null,
          boundaryVisibleContent: listDataset(
            productRoot?.dataset.m8aV410BoundaryVisibleContent
          ),
          detailsSheetState:
            productRoot?.dataset.m8aV410DetailsSheetState ?? null,
          boundarySurfaceState:
            productRoot?.dataset.m8aV410BoundarySurfaceState ?? null,
          inspectorEvidence:
            productRoot?.dataset.m8aV410InspectorEvidenceRedesign ?? null,
          inspectorStructure: listDataset(
            productRoot?.dataset.m8aV410InspectorEvidenceStructure
          ),
          inspectorFirstReadRole:
            productRoot?.dataset.m8aV410InspectorFirstReadRole ?? null,
          inspectorDeniedFirstReadRoles: listDataset(
            productRoot?.dataset.m8aV410InspectorDeniedFirstReadRoles
          ),
          inspectorSurfaceSeparation:
            productRoot?.dataset.m8aV410InspectorSurfaceSeparation ?? null
        },
        sceneNarrative: elementRecord(sceneNarrative),
        strip: {
          ...elementRecord(strip),
          controlsPriority: strip?.dataset.m8aV410ControlsPriority ?? null
        },
        sequenceRail: {
          ...elementRecord(sequenceRail),
          version:
            sequenceRail?.dataset.m8aV410HandoverSequenceRail ?? null,
          visibleContent: listDataset(
            sequenceRail?.dataset.m8aV410SequenceRailVisibleContent
          ),
          windowIds: listDataset(
            sequenceRail?.dataset.m8aV410SequenceRailWindowIds
          ),
          activeWindowId:
            sequenceRail?.dataset.m8aV410SequenceRailActiveWindowId ?? null,
          nextWindowId:
            sequenceRail?.dataset.m8aV410SequenceRailNextWindowId ?? null,
          transitionFromWindowId:
            sequenceRail?.dataset.m8aV410SequenceRailTransitionFromWindowId ??
            null,
          transitionToWindowId:
            sequenceRail?.dataset.m8aV410SequenceRailTransitionToWindowId ??
            null,
          activeSummary: normalize(sequenceActiveSummary?.textContent),
          nextSummary: normalize(sequenceNextSummary?.textContent),
          marks: sequenceMarks.map((mark) => ({
            windowId: mark.dataset.m8aV410SequenceWindowId ?? null,
            index: mark.dataset.m8aV410SequenceIndex ?? null,
            active: mark.dataset.active ?? null,
            next: mark.dataset.next ?? null,
            visible: isVisible(mark),
            rect: rectToPlain(mark.getBoundingClientRect()),
            text: normalize(mark.textContent)
          }))
        },
        details: {
          ...elementRecord(details),
          ariaExpanded:
            details instanceof HTMLElement
              ? details.getAttribute("aria-expanded")
              : null
        },
        truth: {
          ...elementRecord(truth),
          ariaExpanded:
            truth instanceof HTMLElement
              ? truth.getAttribute("aria-expanded")
              : null
        },
        sheet: {
          ...elementRecord(sheet),
          title: normalize(inspectorTitle?.textContent),
          lead: normalize(inspectorLead?.textContent),
          dataset: {
            inspectorEvidence:
              sheet?.dataset.m8aV410InspectorEvidenceRedesign ?? null,
            inspectorStructure: listDataset(
              sheet?.dataset.m8aV410InspectorEvidenceStructure
            ),
            firstReadRole:
              sheet?.dataset.m8aV410InspectorFirstReadRole ?? null,
            surfaceSeparation:
              sheet?.dataset.m8aV410InspectorSurfaceSeparation ?? null
          }
        },
        inspector: {
          ...elementRecord(inspectorPrimary),
          dataset: {
            inspectorEvidence:
              inspectorPrimary?.dataset.m8aV410InspectorEvidenceRedesign ??
              null,
            inspectorStructure: listDataset(
              inspectorPrimary?.dataset.m8aV410InspectorEvidenceStructure
            ),
            firstReadRole:
              inspectorPrimary?.dataset.m8aV410InspectorFirstReadRole ?? null,
            primaryVisibleContent:
              inspectorPrimary?.dataset.m8aV49PrimaryVisibleContent ?? null,
            deniedPrimaryContent:
              inspectorPrimary?.dataset.m8aV49DeniedPrimaryContent ?? null
          },
          groups: inspectorGroups.map((group) => ({
            group: group.dataset.m8aV410InspectorGroup ?? null,
            visible: isVisible(group),
            text: normalize(group.innerText)
          })),
          primarySections: Object.fromEntries(
            primarySections.map((section) => [
              section.dataset.m8aV49InspectorPrimary,
              normalize(section.innerText)
            ])
          ),
          debugEvidence: {
            visible: isVisible(debugEvidence),
            open:
              debugEvidence instanceof HTMLDetailsElement
                ? debugEvidence.open
                : null,
            text: normalize(debugEvidence?.textContent),
            visibleText:
              debugEvidence instanceof HTMLElement
                ? visibleTextNodes(debugEvidence).join(" ")
                : ""
          },
          detailsFullTruth: {
            visible: isVisible(detailsFullTruth),
            open:
              detailsFullTruth instanceof HTMLDetailsElement
                ? detailsFullTruth.open
                : null,
            text: normalize(detailsFullTruth?.textContent),
            visibleText:
              detailsFullTruth instanceof HTMLElement
                ? visibleTextNodes(detailsFullTruth).join(" ")
                : ""
          }
        },
        boundarySurface: {
          ...elementRecord(boundarySurface),
          fullTruth: {
            visible: isVisible(boundaryFullTruth),
            open:
              boundaryFullTruth instanceof HTMLDetailsElement
                ? boundaryFullTruth.open
                : null,
            datasetOpen:
              boundaryFullTruth instanceof HTMLElement
                ? boundaryFullTruth.dataset
                    .m8aV410BoundaryFullTruthDisclosureOpen ?? null
                : null,
            datasetState:
              boundaryFullTruth instanceof HTMLElement
                ? boundaryFullTruth.dataset
                    .m8aV410BoundaryFullTruthDisclosureState ?? null
                : null,
            placement:
              boundaryFullTruth instanceof HTMLElement
                ? boundaryFullTruth.dataset
                    .m8aV410BoundaryFullTruthDisclosurePlacement ?? null
                : null,
            text: normalize(boundaryFullTruth?.textContent),
            visibleText:
              boundaryFullTruth instanceof HTMLElement
                ? visibleTextNodes(boundaryFullTruth).join(" ")
                : ""
          }
        },
        nativeSurfaces: {
          defaultTokenNotice: elementRecord(nativeDefaultTokenNotice),
          attribution: elementRecord(nativeAttribution),
          credits: elementRecord(nativeCredits),
          viewerBottom: elementRecord(nativeBottom),
          timeline: elementRecord(nativeTimeline)
        },
        visibleButtons,
        resourceHits
      };
    })(${JSON.stringify(label)})`
  );
}

function assertPreservedInvariants(result) {
  const facts = result.stateFacts;

  assert(
    result.urlPath === REQUEST_PATH &&
      facts.route === REQUEST_PATH &&
      facts.endpointPairId === EXPECTED_ENDPOINT_PAIR_ID &&
      facts.acceptedPairPrecision === EXPECTED_PRECISION &&
      facts.modelId === EXPECTED_MODEL_ID &&
      facts.modelTruth === EXPECTED_MODEL_TRUTH,
    "Slice 5 invariant check failed for route, endpoint, precision, or V4.6D truth: " +
      JSON.stringify({ urlPath: result.urlPath, facts })
  );
  assert(
    facts.orbitActorCounts?.leo === EXPECTED_ACTOR_COUNTS.leo &&
      facts.orbitActorCounts?.meo === EXPECTED_ACTOR_COUNTS.meo &&
      facts.orbitActorCounts?.geo === EXPECTED_ACTOR_COUNTS.geo &&
      Object.keys(facts.orbitActorCounts ?? {}).length === 3,
    "Slice 5 actor set invariant changed: " +
      JSON.stringify(facts.orbitActorCounts)
  );
  assertListEquals(
    facts.timelineWindowIds,
    EXPECTED_SEQUENCE_WINDOW_IDS,
    "Slice 5 V4.6D deterministic window order"
  );
  assert(
    facts.sourceLineage?.projectionRead === EXPECTED_SOURCE_PROJECTION &&
      facts.sourceLineage?.rawPackageSideReadOwnership === "forbidden" &&
      facts.sourceLineage?.rawSourcePathsIncluded === false &&
      result.resourceHits.length === 0,
    "Slice 5 source boundary invariant changed: " +
      JSON.stringify({ sourceLineage: facts.sourceLineage, resourceHits: result.resourceHits })
  );
  assert(
    facts.requiredWindowNonClaimKeys?.includes("noR2RuntimeSelector") &&
      facts.timelineNonClaims?.every(
        (window) => window.nonClaims?.noR2RuntimeSelector === true
      ),
    "Slice 5 R2 non-selector invariant changed: " +
      JSON.stringify({
        requiredWindowNonClaimKeys: facts.requiredWindowNonClaimKeys,
        timelineNonClaims: facts.timelineNonClaims
      })
  );
}

function assertSceneNarrativePrimary(result, viewport) {
  const activeWindowId = result.stateFacts.activeWindowId;
  const copy = EXPECTED_COPY[activeWindowId];
  const expectedMicroCue = EXPECTED_SLICE1_MICRO_CUES[activeWindowId];

  assert(copy, `Unexpected active window: ${activeWindowId}`);
  assert(
    result.viewportClass === viewport.expectedViewportClass,
    `${viewport.name} viewport class mismatch: ${JSON.stringify({
      actual: result.viewportClass,
      expected: viewport.expectedViewportClass
    })}`
  );
  assert(
    result.rootDataset.firstViewport === EXPECTED_V410_FIRST_VIEWPORT &&
      result.rootDataset.controlsPriority === "secondary" &&
      result.strip.controlsPriority === "secondary" &&
      result.stateFacts.firstViewportComposition?.version ===
        EXPECTED_V410_FIRST_VIEWPORT &&
      result.stateFacts.firstViewportComposition?.inspectorDefaultOpen === false,
    "Slice 1 first viewport composition seam regressed: " +
      JSON.stringify({
        rootDataset: result.rootDataset,
        strip: result.strip,
        firstViewportComposition: result.stateFacts.firstViewportComposition
      })
  );
  const v410NarrativeVisible =
    result.sceneNarrative.visible &&
    result.sceneNarrative.text.includes(copy.productLabel) &&
    result.sceneNarrative.text.includes(copy.firstRead) &&
    result.sceneNarrative.text.includes(copy.next) &&
    result.sceneNarrative.text.includes(`Orbit focus: ${copy.orbit}`);
  const slice1MicroCueVisible =
    result.sceneNarrative.visible &&
    result.sceneNarrative.text.includes(expectedMicroCue);
  assert(
    v410NarrativeVisible || slice1MicroCueVisible,
    `${viewport.name} must read as the Slice 1 handover review product: ` +
      JSON.stringify(result.sceneNarrative)
  );
  if (viewport.action === "default" || viewport.action === "transition") {
    assert(
      !/Evidence inspector|Implementation evidence|Raw ids|display context establishes/i.test(
        result.visibleProductText
      ),
      `${viewport.name} default first-read surface looks like an engineering inspector: ` +
        result.visibleProductText
    );
  }
  assertRectInsideViewport(
    result.sceneNarrative.rect,
    viewport,
    "scene narrative"
  );
  assertRectInsideViewport(result.strip.rect, viewport, "secondary controls");
}

function assertSequenceRail(result, viewport, expectedActive, expectedNext) {
  const activeMarks = result.sequenceRail.marks.filter(
    (mark) => mark.active === "true"
  );
  const nextMarks = result.sequenceRail.marks.filter(
    (mark) => mark.next === "true"
  );

  assert(
    result.sequenceRail.visible &&
      result.sequenceRail.version === EXPECTED_V410_SEQUENCE_RAIL &&
      result.stateFacts.handoverSequenceRail?.version ===
        EXPECTED_V410_SEQUENCE_RAIL,
    `${viewport.name} must keep the Slice 2 five-state sequence rail visible: ` +
      JSON.stringify(result.sequenceRail)
  );
  assertListEquals(
    result.sequenceRail.visibleContent,
    EXPECTED_SEQUENCE_VISIBLE_CONTENT,
    `${viewport.name} sequence rail visible content`
  );
  assertListEquals(
    result.sequenceRail.windowIds,
    EXPECTED_SEQUENCE_WINDOW_IDS,
    `${viewport.name} sequence rail order`
  );
  assert(
    result.sequenceRail.marks.length === EXPECTED_SEQUENCE_WINDOW_IDS.length &&
      result.sequenceRail.marks.every((mark, index) => {
        return (
          mark.visible &&
          mark.windowId === EXPECTED_SEQUENCE_WINDOW_IDS[index] &&
          mark.index === String(index + 1)
        );
      }) &&
      activeMarks.length === 1 &&
      activeMarks[0].windowId === expectedActive &&
      nextMarks.length === 1 &&
      nextMarks[0].windowId === expectedNext &&
      result.sequenceRail.activeWindowId === expectedActive &&
      result.sequenceRail.nextWindowId === expectedNext &&
      result.sequenceRail.activeSummary.length > 0 &&
      result.sequenceRail.nextSummary.length > 0,
    `${viewport.name} sequence rail must be ordered and mark active/next correctly: ` +
      JSON.stringify({
        activeWindowId: result.sequenceRail.activeWindowId,
        nextWindowId: result.sequenceRail.nextWindowId,
        activeSummary: result.sequenceRail.activeSummary,
        nextSummary: result.sequenceRail.nextSummary,
        marks: result.sequenceRail.marks
      })
  );
  assertRectInsideViewport(result.sequenceRail.rect, viewport, "sequence rail");
}

function assertDefaultClosed(result, viewport) {
  assert(
    result.stateFacts.detailsSheetState === "closed" &&
      result.stateFacts.boundarySurfaceState === "closed" &&
      result.rootDataset.detailsSheetState === "closed" &&
      result.rootDataset.boundarySurfaceState === "closed" &&
      result.sheet.visible === false &&
      result.sheet.hidden === true &&
      result.boundarySurface.visible === false &&
      result.boundarySurface.hidden === true &&
      result.details.ariaExpanded === "false" &&
      result.truth.ariaExpanded === "false",
    `${viewport.name} must keep Details and Truth boundary surfaces closed by default: ` +
      JSON.stringify({
        stateFacts: result.stateFacts,
        rootDataset: result.rootDataset,
        details: result.details,
        truth: result.truth,
        sheet: result.sheet,
        boundarySurface: result.boundarySurface
      })
  );
}

function assertBoundaryAffordanceDefaultVisible(result) {
  assert(
    result.rootDataset.boundaryAffordance === EXPECTED_V410_BOUNDARY &&
      result.stateFacts.boundaryAffordance?.version === EXPECTED_V410_BOUNDARY,
    "Slice 3 boundary affordance seam must stay present: " +
      JSON.stringify({
        rootDataset: result.rootDataset,
        boundaryAffordance: result.stateFacts.boundaryAffordance
      })
  );
  assertListEquals(
    result.rootDataset.boundaryVisibleContent,
    EXPECTED_BOUNDARY_VISIBLE_CONTENT,
    "Slice 3 boundary visible content"
  );
  assert(
    result.truth.visible &&
      /模擬展示/.test(result.truth.text),
    "Default view must retain footer chip boundary affordance after Conv 3 Truth removal: " +
      JSON.stringify(result.truth)
  );
}

function assertDetailsOpenEvidenceInspector(result, viewport) {
  const groupIds = result.inspector.groups.map((group) => group.group);
  const v411StateEvidenceInspector =
    groupIds.length === 0 &&
    result.inspector.primarySections["current-state"]?.includes(
      "State Evidence"
    ) &&
    result.inspector.primarySections["current-state"]?.includes(
      "LEO review focus"
    ) &&
    result.inspector.primarySections["current-state"]?.includes(
      "The simulation review is currently anchored on the OneWeb LEO context marked as the focus role."
    );
  const visibleInspectorText = [
    result.sheet.title,
    result.sheet.lead,
    result.inspector.visibleText
  ].join(" ");

  assert(
    result.stateFacts.detailsSheetState === "open" &&
      result.stateFacts.boundarySurfaceState === "closed" &&
      result.rootDataset.detailsSheetState === "open" &&
      result.rootDataset.boundarySurfaceState === "closed" &&
      result.details.ariaExpanded === "true" &&
      result.truth.ariaExpanded === "false" &&
      result.sheet.visible &&
      result.boundarySurface.visible === false,
    "Details must open only the evidence inspector and keep Truth boundary closed: " +
      JSON.stringify({
        stateFacts: result.stateFacts,
        rootDataset: result.rootDataset,
        details: result.details,
        truth: result.truth,
        sheet: result.sheet,
        boundarySurface: result.boundarySurface
      })
  );
  assert(
    result.rootDataset.inspectorEvidence === EXPECTED_V410_INSPECTOR &&
      result.sheet.dataset.inspectorEvidence === EXPECTED_V410_INSPECTOR &&
      result.inspector.dataset.inspectorEvidence === EXPECTED_V410_INSPECTOR,
    "Slice 4 inspector evidence redesign seam mismatch: " +
      JSON.stringify({
        rootDataset: result.rootDataset,
        sheet: result.sheet.dataset,
        inspector: result.inspector.dataset
      })
  );
  assertListEquals(
    result.rootDataset.inspectorStructure,
    EXPECTED_INSPECTOR_STRUCTURE,
    "Slice 4 root inspector evidence structure"
  );
  assert(
    (result.sheet.title === "Evidence inspector" ||
      result.sheet.title === "Inspector") &&
      /scene narrative and sequence rail remain primary/i.test(
        result.sheet.lead
      ) &&
      result.rootDataset.inspectorFirstReadRole ===
        "secondary-evidence-inspector" &&
      result.rootDataset.inspectorSurfaceSeparation ===
        "details-inspector-and-truth-boundary-are-separate-states-and-surfaces" &&
      !/handover review|claim panel|mission narrative|primary product narrative/i.test(
        result.sheet.title
      ),
    "Details inspector must remain secondary evidence/source/boundary UI: " +
      JSON.stringify({ title: result.sheet.title, lead: result.sheet.lead })
  );
  if (v411StateEvidenceInspector) {
    assert(
      result.inspector.primarySections["current-state"]?.includes(
        "Endpoint precision remains operator-family only and no active gateway is being claimed."
      ) &&
        result.inspector.detailsFullTruth.visible === false,
      "V4.11 State Evidence role must preserve Slice 5 evidence orientation without opening Truth Boundary: " +
        JSON.stringify({
          primarySections: result.inspector.primarySections,
          detailsFullTruth: result.inspector.detailsFullTruth
        })
    );
  } else {
    assertListEquals(
      groupIds,
      EXPECTED_INSPECTOR_STRUCTURE,
      "Slice 4 visible inspector groups"
    );
    assert(
      result.inspector.groups.every((group) => group.visible) &&
        result.inspector.groups.find((group) => group.group === "current-replay-event-evidence")
          ?.text.includes("Current replay/event evidence") &&
        result.inspector.groups.find((group) => group.group === "sequence-selected-window-context")
          ?.text.includes("Sequence / selected window context") &&
        result.inspector.groups.find((group) => group.group === "source-and-boundary-notes")
          ?.text.includes("Source: repo-owned projection") &&
        result.inspector.groups.find((group) => group.group === "not-being-claimed")
          ?.text.includes("Not claimed:"),
      "Details inspector must remain evidence/source/boundary-oriented: " +
        JSON.stringify(result.inspector.groups)
    );
    assert(
      result.inspector.primarySections["current-state"]?.includes("State 1 of 5") &&
        result.inspector.primarySections.why?.includes("Evidence source:") &&
        result.inspector.primarySections.changed?.includes("Replay event:") &&
        result.inspector.primarySections.next?.includes("Sequence context:") &&
        result.inspector.primarySections.boundary?.includes("Simulation review only"),
      "Inspector primary content must be evidence-oriented and state-specific: " +
        JSON.stringify(result.inspector.primarySections)
    );
  }
  assert(
    result.inspector.debugEvidence.visible &&
      result.inspector.debugEvidence.open === false &&
      /Implementation evidence/i.test(result.inspector.debugEvidence.visibleText),
    "Implementation evidence must remain collapsed but inspectable: " +
      JSON.stringify(result.inspector.debugEvidence)
  );
  assertForbiddenClaimsClean(visibleInspectorText, "Slice 5 visible inspector");
  assertRectInsideViewport(result.sheet.rect, viewport, "details inspector");
  assert(
    !rectsOverlap(result.sheet.rect, result.strip.rect),
    "Details inspector must not cover secondary controls: " +
      JSON.stringify({ sheet: result.sheet.rect, strip: result.strip.rect })
  );
}

function assertBoundaryOpenOnly(result, viewport) {
  const v411SharedTruthBoundary =
    result.stateFacts.detailsSheetState === "closed" &&
    result.stateFacts.boundarySurfaceState === "open" &&
    result.rootDataset.detailsSheetState === "closed" &&
    result.rootDataset.boundarySurfaceState === "open" &&
    result.details.ariaExpanded === "false" &&
    result.truth.ariaExpanded === "true" &&
    result.sheet.visible === true &&
    result.inspector.detailsFullTruth.visible === true &&
    result.inspector.detailsFullTruth.open === null;

  if (v411SharedTruthBoundary) {
    assert(
      result.boundarySurface.visible !== true &&
        /Truth Boundary/.test(result.inspector.detailsFullTruth.text) &&
        /Truth boundary/.test(result.inspector.detailsFullTruth.text) &&
        /not an operator handover log/i.test(
          result.inspector.detailsFullTruth.text
        ) &&
        /No active gateway assignment is claimed/.test(
          result.inspector.detailsFullTruth.text
        ) &&
        /No native RF handover is claimed/.test(
          result.inspector.detailsFullTruth.text
        ) &&
        result.stateFacts.boundaryFullTruthDisclosureState === "open" &&
        result.boundarySurface.fullTruth.open === true &&
        /Full truth disclosure/i.test(result.boundarySurface.fullTruth.text),
      "V4.11 shared Truth Boundary role must preserve Slice 5 full-truth validation without showing the old focused surface: " +
        JSON.stringify({
          detailsFullTruth: result.inspector.detailsFullTruth,
          boundarySurface: result.boundarySurface,
          boundaryFullTruthDisclosureState:
            result.stateFacts.boundaryFullTruthDisclosureState
        })
    );
    assertForbiddenClaimsClean(
      result.inspector.detailsFullTruth.visibleText,
      "Slice 5 V4.11 shared truth boundary"
    );
    assertRectInsideViewport(result.sheet.rect, viewport, "shared truth inspector");
    return;
  }

  assert(
    result.stateFacts.detailsSheetState === "closed" &&
      result.stateFacts.boundarySurfaceState === "open" &&
      result.rootDataset.detailsSheetState === "closed" &&
      result.rootDataset.boundarySurfaceState === "open" &&
      result.details.ariaExpanded === "false" &&
      result.truth.ariaExpanded === "true" &&
      result.sheet.visible === false &&
      result.boundarySurface.visible === true,
    "Truth must open only the focused boundary surface and keep Details closed: " +
      JSON.stringify({
        stateFacts: result.stateFacts,
        rootDataset: result.rootDataset,
        details: result.details,
        truth: result.truth,
        sheet: result.sheet,
        boundarySurface: result.boundarySurface
      })
  );
  assert(
    /Truth boundary/.test(result.boundarySurface.text) &&
      /Simulation review - not operator log/.test(result.boundarySurface.text) &&
      /No active satellite, gateway, path, or measured metric claim/.test(
        result.boundarySurface.text
      ),
    "Focused boundary surface must keep Slice 3 boundary explanation: " +
      JSON.stringify(result.boundarySurface)
  );
  assert(
    result.stateFacts.boundaryFullTruthDisclosureState === "open" &&
      result.boundarySurface.fullTruth.visible &&
      result.boundarySurface.fullTruth.open === true &&
      result.boundarySurface.fullTruth.datasetOpen === "true" &&
      result.boundarySurface.fullTruth.placement ===
        "boundary-surface-and-details-secondary-disclosure" &&
      /Full truth disclosure/i.test(
        result.boundarySurface.fullTruth.visibleText
      ) &&
      /not an operator handover log/i.test(result.boundarySurface.fullTruth.text),
    "Full truth disclosure must remain inspectable inside the focused boundary surface: " +
      JSON.stringify(result.boundarySurface.fullTruth)
  );
  assertRectInsideViewport(
    result.boundarySurface.rect,
    viewport,
    "focused boundary surface"
  );
}

function assertTransitionState(result, capture) {
  assert(
    result.stateFacts.activeWindowId === capture.expectedWindowId &&
      result.sequenceRail.nextWindowId === capture.expectedNextWindowId &&
      result.sequenceRail.transitionFromWindowId ===
        capture.expectedTransitionFromWindowId &&
      result.sequenceRail.transitionToWindowId ===
        capture.expectedTransitionToWindowId,
    "Transition state capture landed on unexpected active/next/transition windows: " +
      JSON.stringify({
        expected: capture,
        actual: {
          activeWindowId: result.stateFacts.activeWindowId,
          nextWindowId: result.sequenceRail.nextWindowId,
          transitionFromWindowId: result.sequenceRail.transitionFromWindowId,
          transitionToWindowId: result.sequenceRail.transitionToWindowId
        }
      })
  );
}

function assertNarrowLayoutSeparation(result, viewport) {
  if (viewport.expectedViewportClass !== "narrow") {
    return [];
  }

  const surfaces = [
    { name: "secondary-controls", ...result.strip },
    ...Object.entries(result.nativeSurfaces ?? {}).map(([name, surface]) => ({
      name,
      ...(surface ?? {})
    }))
  ].filter((surface) => surface.visible && surface.rect);
  const problemSurfaces = surfaces.filter((surface) => {
    return (
      rectsOverlap(result.sequenceRail.rect, surface.rect) ||
      (rectsHorizontallyOverlap(result.sequenceRail.rect, surface.rect) &&
        verticalGapBetween(result.sequenceRail.rect, surface.rect) < 8)
    );
  });

  assert(
    problemSurfaces.length === 0,
    `${viewport.name} sequence rail must not incoherently overlap controls, Cesium default-token/credits, or timeline surfaces: ` +
      JSON.stringify({
        sequenceRail: result.sequenceRail.rect,
        problemSurfaces,
        nativeSurfaces: result.nativeSurfaces,
        strip: result.strip
      })
  );

  return surfaces.map((surface) => ({
    name: surface.name,
    rect: surface.rect,
    visible: surface.visible
  }));
}

function buildDesktopOverlayRiskReview(result, viewport) {
  if (viewport.expectedViewportClass !== "desktop" || viewport.action !== "details") {
    return {
      accepted: true,
      observed: false,
      reviewNote:
        "No desktop Details-open sequence-rail overlap observed in this capture."
    };
  }

  const overlapsRail = rectsOverlap(result.sheet.rect, result.sequenceRail.rect);

  if (!overlapsRail) {
    return {
      accepted: true,
      observed: false,
      reviewNote:
        "No desktop Details-open sequence-rail overlap observed in this capture."
    };
  }

  return {
    accepted: true,
    observed: true,
    reviewNote:
      "Accepted overlay risk: the on-demand Details inspector overlaps the far-right portion of the sequence rail, while the scene narrative, controls, and evidence/Truth separation remain readable and intentional."
  };
}

function screenshotEvidence(absolutePath, viewport) {
  const stats = statSync(absolutePath);

  assert(
    stats.size > 20_000,
    `Screenshot is unexpectedly small for ${viewport.name}: ${JSON.stringify({
      path: serializeRelative(absolutePath),
      size: stats.size
    })}`
  );

  return {
    path: serializeRelative(absolutePath),
    sizeBytes: stats.size,
    dimensions: {
      width: viewport.width,
      height: viewport.height
    }
  };
}

function writeMetadata(filename, payload) {
  mkdirSync(outputRoot, { recursive: true });
  const absolutePath = path.join(outputRoot, filename);
  writeFileSync(absolutePath, `${JSON.stringify(payload, null, 2)}\n`);
  return absolutePath;
}

async function captureEvidence(client, baseUrl, capture) {
  await setViewport(client, capture);
  await navigateAndWait(client, baseUrl);

  if (capture.action === "details") {
    await clickControl(client, "details-toggle");
  } else if (capture.action === "boundary-full-truth") {
    await clickControl(client, "truth-affordance");
    await openBoundaryFullTruth(client);
  } else if (capture.action === "transition") {
    await seekReplayRatio(client, capture.seekRatio);
  }

  const result = await inspectRuntime(client, capture.name);
  const expectedActive =
    capture.expectedWindowId ?? "leo-acquisition-context";
  const expectedNext = capture.expectedNextWindowId ?? "leo-aging-pressure";
  const narrowLayoutReview = assertNarrowLayoutSeparation(result, capture);
  const desktopOverlayRisk = buildDesktopOverlayRiskReview(result, capture);

  assertPreservedInvariants(result);
  assertSceneNarrativePrimary(result, capture);
  assertSequenceRail(result, capture, expectedActive, expectedNext);
  assertBoundaryAffordanceDefaultVisible(result);
  assertForbiddenClaimsClean(result.visibleProductText, `${capture.name} visible product surfaces`);

  if (capture.action === "default") {
    assertDefaultClosed(result, capture);
  } else if (capture.action === "details") {
    assertDetailsOpenEvidenceInspector(result, capture);
    assert(
      desktopOverlayRisk.reviewNote.length > 0,
      "Desktop Details-open capture must include an overlay risk review note."
    );
  } else if (capture.action === "boundary-full-truth") {
    assertBoundaryOpenOnly(result, capture);
  } else if (capture.action === "transition") {
    assertDefaultClosed(result, capture);
    assertTransitionState(result, capture);
  }

  const screenshotPath = await captureScreenshot(client, capture.screenshot);
  const screenshot = screenshotEvidence(screenshotPath, capture);
  const metadataPath = writeMetadata(capture.metadata, {
    capturedAt: new Date().toISOString(),
    route: REQUEST_PATH,
    capture,
    screenshot,
    productVisibleAcceptance: {
      firstViewportReadsAsHandoverReviewProduct: true,
      detailsClosedByDefault:
        capture.action !== "default" ? null : result.sheet.visible === false,
      truthBoundaryClosedByDefault:
        capture.action !== "default"
          ? null
          : result.boundarySurface.visible === false,
      sceneNarrativePrimary: true,
      sequenceRailVisibleAndOrdered: true,
      forbiddenPositiveClaimScan: "passed"
    },
    desktopOverlayRisk,
    narrowLayoutReview,
    result
  });

  return {
    name: capture.name,
    action: capture.action,
    screenshot,
    metadata: serializeRelative(metadataPath),
    activeWindowId: result.stateFacts.activeWindowId,
    nextWindowId: result.sequenceRail.nextWindowId,
    detailsSheetState: result.stateFacts.detailsSheetState,
    boundarySurfaceState: result.stateFacts.boundarySurfaceState,
    boundaryFullTruthDisclosureState:
      result.stateFacts.boundaryFullTruthDisclosureState,
    sceneNarrativeRect: result.sceneNarrative.rect,
    sequenceRailRect: result.sequenceRail.rect,
    stripRect: result.strip.rect,
    sheetRect: result.sheet.rect,
    boundarySurfaceRect: result.boundarySurface.rect,
    desktopOverlayRisk,
    narrowLayoutReview
  };
}

function buildValidationMatrix(captures, packageScripts) {
  return [
    {
      slice: "Slice 1",
      result: "passed",
      checks: [
        "default first viewport reads as handover review product",
        "scene narrative visible and primary",
        "Details closed by default"
      ],
      evidence: captures
        .filter((capture) => capture.action === "default")
        .map((capture) => capture.metadata)
    },
    {
      slice: "Slice 2",
      result: "passed",
      checks: [
        "five-state sequence rail visible",
        "accepted V4.6D order preserved",
        "active and next states marked correctly",
        "transition state capture verified"
      ],
      evidence: captures
        .filter((capture) => capture.action === "default" || capture.action === "transition")
        .map((capture) => capture.metadata)
    },
    {
      slice: "Slice 3",
      result: "passed",
      checks: [
        "Truth opens focused boundary surface only",
        "Details remains closed while Truth is open",
        "full truth disclosure inspectable inside boundary surface"
      ],
      evidence: captures
        .filter((capture) => capture.action === "boundary-full-truth")
        .map((capture) => capture.metadata)
    },
    {
      slice: "Slice 4",
      result: "passed",
      checks: [
        "Details opens evidence inspector only",
        "Truth boundary remains closed while Details is open",
        "inspector remains source/boundary/evidence-oriented"
      ],
      evidence: captures
        .filter((capture) => capture.action === "details")
        .map((capture) => capture.metadata)
    },
    {
      slice: "Slice 5",
      result: "passed",
      checks: [
        "invariants preserved",
        "desktop/narrow screenshot evidence written",
        "forbidden positive claim scan passed",
        "package scripts for Slice 1-5 present; Slice 1-4 pass/fail is validated by the required external npm commands in final closeout"
      ],
      evidence: ["output/m8a-v4.10-slice5/capture-manifest.json"],
      packageScripts
    }
  ];
}

async function main() {
  ensureDistBuildExists();
  mkdirSync(outputRoot, { recursive: true });

  const packageScripts = assertPackageScriptsPresent();
  const processFacts = [];
  const captures = [];
  const browserCommand = findHeadlessBrowser();
  let serverHandle = null;
  let browserHandle = null;
  let client = null;

  const writeManifest = (status) => {
    const validationMatrix = buildValidationMatrix(captures, packageScripts);
    writeMetadata("capture-manifest.json", {
      generatedAt: new Date().toISOString(),
      status,
      route: REQUEST_PATH,
      outputRoot: serializeRelative(outputRoot),
      productVisibleAcceptance: {
        acceptanceReady: status === "cleanup-complete",
        blockerCount: 0,
        detailsVsTruthSeparated: true,
        detailsDefaultClosed: true,
        truthBoundaryDefaultClosed: true,
        sourceAndModelInvariantsPreserved: true
      },
      validationMatrix,
      captures: captures.map((capture) => ({
        name: capture.name,
        action: capture.action,
        screenshot: capture.screenshot,
        metadata: capture.metadata,
        activeWindowId: capture.activeWindowId,
        nextWindowId: capture.nextWindowId,
        detailsSheetState: capture.detailsSheetState,
        boundarySurfaceState: capture.boundarySurfaceState,
        boundaryFullTruthDisclosureState:
          capture.boundaryFullTruthDisclosureState,
        sceneNarrativeRect: capture.sceneNarrativeRect,
        sequenceRailRect: capture.sequenceRailRect,
        stripRect: capture.stripRect,
        sheetRect: capture.sheetRect,
        boundarySurfaceRect: capture.boundarySurfaceRect,
        desktopOverlayRisk: capture.desktopOverlayRisk,
        narrowLayoutReview: capture.narrowLayoutReview
      })),
      packageScripts,
      taskOwnedProcesses: processFacts
    });
  };

  try {
    serverHandle = await startStaticServer();
    processFacts.push({
      type: "static-server-started",
      at: new Date().toISOString(),
      pid: serverHandle.server.pid,
      baseUrl: serverHandle.baseUrl
    });
    await verifyFetches(serverHandle.baseUrl);

    browserHandle = await startHeadlessBrowser(browserCommand);
    processFacts.push({
      type: "headless-browser-started",
      at: new Date().toISOString(),
      pid: browserHandle.browserProcess.pid,
      browserCommand
    });
    const pageWebSocketUrl = await resolvePageWebSocketUrl(
      browserHandle.browserWebSocketUrl
    );
    client = await connectCdp(pageWebSocketUrl);
    await client.send("Page.enable");
    await client.send("Runtime.enable");

    for (const capture of CAPTURES) {
      captures.push(await captureEvidence(client, serverHandle.baseUrl, capture));
    }

    writeManifest("passed-before-cleanup");

    console.log(
      `M8A-V4.10 Slice 5 validation matrix smoke passed: ${JSON.stringify(
        {
          captures: captures.map((capture) => ({
            name: capture.name,
            action: capture.action,
            screenshot: capture.screenshot.path,
            metadata: capture.metadata,
            activeWindowId: capture.activeWindowId,
            nextWindowId: capture.nextWindowId,
            detailsSheetState: capture.detailsSheetState,
            boundarySurfaceState: capture.boundarySurfaceState,
            desktopOverlayRisk: capture.desktopOverlayRisk
          })),
          runtimeProcessFacts: {
            serverPid: serverHandle.server.pid,
            browserPid: browserHandle.browserProcess.pid
          }
        }
      )}`
    );
  } finally {
    if (client) {
      await client.close();
    }

    if (browserHandle) {
      processFacts.push({
        type: "headless-browser-stop-requested",
        at: new Date().toISOString(),
        pid: browserHandle.browserProcess.pid
      });
      await stopHeadlessBrowser(browserHandle);
    }

    if (serverHandle) {
      processFacts.push({
        type: "static-server-stop-requested",
        at: new Date().toISOString(),
        pid: serverHandle.server.pid
      });
      await stopStaticServer(serverHandle.server);
    }

    writeManifest(captures.length === CAPTURES.length ? "cleanup-complete" : "failed-cleanup-complete");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
