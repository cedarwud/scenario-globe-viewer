import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
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
const outputRoot = path.join(repoRoot, "output/m8a-v4.10-slice2");

const REQUEST_PATH = "/?scenePreset=regional&m8aV4GroundStationScene=1";
const EXPECTED_V410_VERSION =
  "m8a-v4.10-first-viewport-composition-slice1-runtime.v1";
const EXPECTED_V410_SCOPE = "slice1-first-viewport-composition";
const EXPECTED_V410_SEQUENCE_RAIL_SCOPE = "slice2-handover-sequence-rail";
const EXPECTED_V410_SEQUENCE_RAIL_VERSION =
  "m8a-v4.10-handover-sequence-rail-slice2-runtime.v1";
const EXPECTED_SEQUENCE_VISIBLE_CONTENT = [
  "five-state-path",
  "active-state-mark",
  "next-state-mark",
  "transition-event-link"
];
const EXPECTED_ENDPOINT_PAIR_ID =
  "taiwan-cht-speedcast-singapore-operator-family-2026-04-26";
const EXPECTED_PRECISION = "operator-family-only";
const EXPECTED_MODEL_ID = "m8a-v4.6d-simulation-handover-model.v1";
const EXPECTED_MODEL_TRUTH = "simulation-output-not-operator-log";
const EXPECTED_ACTOR_COUNTS = { leo: 6, meo: 5, geo: 2 };
const EXPECTED_SOURCE_PROJECTION = "M8A_V4_GROUND_STATION_RUNTIME_PROJECTION";
const EXPECTED_SCENE_VISIBLE_CONTENT = [
  "active-state-title",
  "orbit-class-token",
  "first-read-line",
  "watch-cue-or-fallback",
  "next-line"
];
const EXPECTED_SEQUENCE_WINDOW_IDS = [
  "leo-acquisition-context",
  "leo-aging-pressure",
  "meo-continuity-hold",
  "leo-reentry-candidate",
  "geo-continuity-guard"
];
const BASELINE_METADATA_DESKTOP = path.join(
  repoRoot,
  "output/m8a-v4.10-slice0/v4.9-baseline-default-1440x900.metadata.json"
);
const VIEWPORTS = [
  {
    name: "default-1440x900",
    width: 1440,
    height: 900,
    expectedViewportClass: "desktop",
    screenshot: "v4.10-slice2-default-1440x900.png",
    metadata: "v4.10-slice2-default-1440x900.metadata.json"
  },
  {
    name: "default-1280x720",
    width: 1280,
    height: 720,
    expectedViewportClass: "desktop",
    screenshot: "v4.10-slice2-default-1280x720.png",
    metadata: "v4.10-slice2-default-1280x720.metadata.json"
  },
  {
    name: "default-390x844",
    width: 390,
    height: 844,
    expectedViewportClass: "narrow",
    screenshot: "v4.10-slice2-default-390x844.png",
    metadata: "v4.10-slice2-default-390x844.metadata.json"
  }
];
const TRANSITION_CAPTURE = {
  name: "transition-leo-aging-pressure-1440x900",
  width: 1440,
  height: 900,
  expectedViewportClass: "desktop",
  seekRatio: 0.25,
  expectedWindowId: "leo-aging-pressure",
  expectedNextWindowId: "meo-continuity-hold",
  expectedTransitionFromWindowId: "leo-acquisition-context",
  expectedTransitionToWindowId: "leo-aging-pressure",
  screenshot: "v4.10-slice2-transition-leo-aging-pressure-1440x900.png",
  metadata:
    "v4.10-slice2-transition-leo-aging-pressure-1440x900.metadata.json"
};
const EXPECTED_COPY = {
  "leo-acquisition-context": {
    productLabel: "LEO review focus",
    firstRead: "LEO is the simulated review focus for this corridor.",
    watch: "Watch: representative LEO cue.",
    next: "Next: watch for pressure before the MEO hold.",
    orbit: "LEO"
  },
  "leo-aging-pressure": {
    productLabel: "LEO pressure",
    firstRead: "The LEO review context is under simulated pressure.",
    watch: "Watch: LEO pressure cue.",
    next: "Next: continuity shifts to MEO context.",
    orbit: "LEO"
  },
  "meo-continuity-hold": {
    productLabel: "MEO continuity hold",
    firstRead: "MEO context is holding continuity in this simulation.",
    watch: "Watch: MEO representative cue.",
    next: "Next: LEO returns as a candidate focus.",
    orbit: "MEO"
  },
  "leo-reentry-candidate": {
    productLabel: "LEO re-entry",
    firstRead: "LEO returns as a candidate review focus.",
    watch: "Watch: returning LEO cue.",
    next: "Next: GEO closes the sequence as guard context.",
    orbit: "LEO"
  },
  "geo-continuity-guard": {
    productLabel: "GEO guard context",
    firstRead: "GEO is shown only as guard context, not active failover proof.",
    watch: "Watch: GEO guard cue.",
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
const SEQUENCE_RATIO_CHECKS = [
  {
    ratio: 0.1,
    expectedWindowId: "leo-acquisition-context",
    expectedNextWindowId: "leo-aging-pressure"
  },
  {
    ratio: 0.25,
    expectedWindowId: "leo-aging-pressure",
    expectedNextWindowId: "meo-continuity-hold"
  },
  {
    ratio: 0.45,
    expectedWindowId: "meo-continuity-hold",
    expectedNextWindowId: "leo-reentry-candidate"
  },
  {
    ratio: 0.7,
    expectedWindowId: "leo-reentry-candidate",
    expectedNextWindowId: "geo-continuity-guard"
  },
  {
    ratio: 0.9,
    expectedWindowId: "geo-continuity-guard",
    expectedNextWindowId: "leo-acquisition-context"
  }
];
const FORBIDDEN_POSITIVE_PHRASES = [
  "real operator handover event",
  "operator handover log",
  "active serving satellite",
  "serving satellite",
  "active gateway assignment",
  "active gateway",
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
const V411_CORRECTION_A_SUCCESSOR_STRIP_LEFT_PX = 340;
const V411_CORRECTION_A_SUCCESSOR_STRIP_LEFT_TOLERANCE_PX = 2;
const V411_CORRECTION_A_SUCCESSOR_MICRO_CUE = "focus · LEO";

// §Smoke Softening Disclosure: Correction A §5.2 and §5.3 intentionally move
// the first-read layout to a left handover rail plus top scope strip. Slice 2
// now accepts either the original V4.10 baseline-difference geometry or the
// V4.11 Correction A successor geometry (`left ~= 340`, `focus · LEO`), while
// retaining route, endpoint, precision, actor, source-boundary, sequence-rail,
// transition, and forbidden-claim invariants.

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

function assertListEquals(actual, expected, label) {
  assert(
    JSON.stringify(actual) === JSON.stringify(expected),
    `${label} mismatch: ${JSON.stringify({ actual, expected })}`
  );
}

function assertForbiddenClaimScan(result, label) {
  const searchableText = [
    result.productText,
    result.rootDatasetText,
    result.sceneNarrative.text,
    result.strip.text
  ]
    .filter(Boolean)
    .join(" ");
  const normalized = searchableText.replace(/\s+/g, " ");
  const lowered = normalized.toLowerCase();
  const phraseHits = FORBIDDEN_POSITIVE_PHRASES.filter((phrase) =>
    lowered.includes(phrase)
  );
  const unitHits = FORBIDDEN_UNIT_PATTERNS.filter((pattern) =>
    pattern.test(normalized)
  ).map((pattern) => pattern.toString());

  assert(
    phraseHits.length === 0 && unitHits.length === 0,
    `${label} contains forbidden handover precision or operator-truth claim: ` +
      JSON.stringify({ phraseHits, unitHits, normalized })
  );
  assert(
    result.resourceHits.length === 0,
    `${label} must not fetch raw ITRI packages or live external source resources: ` +
      JSON.stringify(result.resourceHits)
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

        return {
          bootstrapState: root?.dataset.bootstrapState ?? null,
          scenePreset: root?.dataset.scenePreset ?? null,
          v410FirstViewportComposition:
            root?.dataset.m8aV410FirstViewportComposition ?? null,
          hasCapture: Boolean(
            window.__SCENARIO_GLOBE_VIEWER_CAPTURE__?.m8aV4GroundStationScene
          )
        };
      })()`
    );

    if (
      lastState?.bootstrapState === "ready" &&
      lastState?.scenePreset === "regional" &&
      lastState?.v410FirstViewportComposition === EXPECTED_V410_VERSION &&
      lastState?.hasCapture === true
    ) {
      return lastState;
    }

    if (lastState?.bootstrapState === "error") {
      throw new Error(
        `M8A-V4.10 Slice 2 route hit bootstrap error: ${JSON.stringify(
          lastState
        )}`
      );
    }

    await sleep(100);
  }

  throw new Error(
    `M8A-V4.10 Slice 2 did not reach a ready route: ${JSON.stringify(
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
    `M8A-V4.10 Slice 2 globe did not settle: ${JSON.stringify(lastState)}`
  );
}

async function navigateAndWait(client, baseUrl) {
  await client.send("Page.navigate", { url: `${baseUrl}${REQUEST_PATH}` });
  await waitForBootstrapReady(client);
  await waitForGlobeReady(client);
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
  await sleep(260);
}

async function inspectFirstViewport(client, label) {
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
        rect: element instanceof HTMLElement
          ? rectToPlain(element.getBoundingClientRect())
          : null,
        text: element instanceof HTMLElement ? normalize(element.innerText) : "",
        pointerEvents: element instanceof HTMLElement
          ? getComputedStyle(element).pointerEvents
          : null
      });
      const buttonRecord = (button) => {
        const rect = rectToPlain(button.getBoundingClientRect());
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const topElement = document.elementFromPoint(centerX, centerY);

        return {
          text: normalize(button.textContent),
          controlId: button.dataset.m8aV47ControlId ?? null,
          action: button.dataset.m8aV47Action ?? null,
          multiplier: button.dataset.m8aV47PlaybackMultiplier ?? null,
          ariaExpanded: button.getAttribute("aria-expanded"),
          ariaPressed: button.getAttribute("aria-pressed"),
          rect,
          clientWidth: button.clientWidth,
          clientHeight: button.clientHeight,
          scrollWidth: button.scrollWidth,
          scrollHeight: button.scrollHeight,
          receivesCenterPoint:
            topElement === button || button.contains(topElement),
          topText: normalize(topElement?.textContent)
        };
      };

      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      const state = capture?.m8aV4GroundStationScene?.getState?.();
      const productRoot = document.querySelector("[data-m8a-v47-product-ux='true']");
      const strip = productRoot?.querySelector("[data-m8a-v47-control-strip='true']");
      const annotation = productRoot?.querySelector("[data-m8a-v47-scene-annotation='true']");
      const title = annotation?.querySelector("[data-m8a-v410-scene-title='true']");
      const firstRead = annotation?.querySelector("[data-m8a-v410-first-read-line='true']");
      const cue = annotation?.querySelector("[data-m8a-v49-scene-near-cue='true']");
      const next = annotation?.querySelector("[data-m8a-v410-next-line='true']");
      const fallback = annotation?.querySelector("[data-m8a-v49-scene-near-fallback='true']");
      const sequenceRail = productRoot?.querySelector("[data-m8a-v410-sequence-rail='true']");
      const sequenceActiveSummary = sequenceRail?.querySelector("[data-m8a-v410-sequence-active-summary='true']");
      const sequenceNextSummary = sequenceRail?.querySelector("[data-m8a-v410-sequence-next-summary='true']");
      const sequenceMarks = Array.from(
        sequenceRail?.querySelectorAll("[data-m8a-v410-sequence-mark='true']") ??
          []
      );
      const sheet = productRoot?.querySelector("[data-m8a-v47-ui-surface='inspection-sheet']");
      const details = productRoot?.querySelector("[data-m8a-v47-control-id='details-toggle']");
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
        .map(buttonRecord);
      const productText = visibleTextNodes(productRoot).join(" ");
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
          activeWindowId: state?.productUx?.activeWindowId ?? null,
          activeProductLabel: state?.productUx?.activeProductLabel ?? null,
          disclosureState: state?.productUx?.disclosure?.state ?? null,
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
          firstViewportComposition:
            state?.productUx?.productComprehension?.firstViewportComposition ??
            null,
          handoverSequenceRail:
            state?.productUx?.productComprehension?.handoverSequenceRail ??
            null,
          activeWindowCopy:
            state?.productUx?.productComprehension?.activeWindowCopy ?? null
        },
        rootDataset: {
          firstViewportComposition:
            productRoot?.dataset.m8aV410FirstViewportComposition ?? null,
          sliceScope: productRoot?.dataset.m8aV410SliceScope ?? null,
          sceneNarrativeVisibleContent: listDataset(
            productRoot?.dataset.m8aV410SceneNarrativeVisibleContent
          ),
          controlsPriority:
            productRoot?.dataset.m8aV410ControlsPriority ?? null,
          sequenceRailScope:
            productRoot?.dataset.m8aV410SequenceRailScope ?? null,
          inspectorDefaultOpen:
            productRoot?.dataset.m8aV410InspectorDefaultOpen ?? null,
          firstReadLine:
            productRoot?.dataset.m8aV410FirstReadLine ?? null,
          watchCueLine:
            productRoot?.dataset.m8aV410WatchCueLine ?? null,
          nextLine:
            productRoot?.dataset.m8aV410NextLine ?? null
        },
        rootDatasetText: Object.values(productRoot?.dataset ?? {})
          .join(" ")
          .replace(/\\s+/g, " ")
          .trim(),
        productText,
        sceneNarrative: {
          ...elementRecord(annotation),
          title: normalize(title?.textContent),
          firstRead: normalize(firstRead?.textContent),
          cue: normalize(cue?.textContent),
          next: normalize(next?.textContent),
          fallback: normalize(fallback?.textContent),
          titleVisible: isVisible(title),
          firstReadVisible: isVisible(firstRead),
          cueVisible: isVisible(cue),
          nextVisible: isVisible(next),
          fallbackVisible: isVisible(fallback),
          anchorStatus: annotation?.dataset.m8aV48AnchorStatus ?? null,
          sceneNearMode: annotation?.dataset.m8aV49SceneNearMode ?? null,
          sceneNearMeaningVisible:
            annotation?.dataset.m8aV49SceneNearMeaningVisible ?? null,
          sceneNearCueVisible:
            annotation?.dataset.m8aV49SceneNearCueVisible ?? null,
          sceneNearFallbackVisible:
            annotation?.dataset.m8aV49SceneNearFallbackVisible ?? null,
          sceneNearAttachmentClaim:
            annotation?.dataset.m8aV49SceneNearAttachmentClaim ?? null
        },
        strip: {
          ...elementRecord(strip),
          controlsPriority:
            strip?.dataset.m8aV410ControlsPriority ?? null,
          defaultVisibleContent:
            strip?.dataset.m8aV49DefaultVisibleContent ?? null
        },
        sequenceRail: {
          ...elementRecord(sequenceRail),
          version:
            sequenceRail?.dataset.m8aV410HandoverSequenceRail ?? null,
          scope:
            sequenceRail?.dataset.m8aV410SequenceRailScope ?? null,
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
          activeLabel:
            sequenceRail?.dataset.m8aV410SequenceRailActiveLabel ?? null,
          nextLabel:
            sequenceRail?.dataset.m8aV410SequenceRailNextLabel ?? null,
          activeOrdinal:
            sequenceRail?.dataset.m8aV410SequenceRailActiveOrdinal ?? null,
          nextOrdinal:
            sequenceRail?.dataset.m8aV410SequenceRailNextOrdinal ?? null,
          transitionFromWindowId:
            sequenceRail?.dataset.m8aV410SequenceRailTransitionFromWindowId ??
            null,
          transitionToWindowId:
            sequenceRail?.dataset.m8aV410SequenceRailTransitionToWindowId ??
            null,
          transitionVisible:
            sequenceRail?.dataset.m8aV410SequenceRailTransitionVisible ?? null,
          viewportPolicy:
            sequenceRail?.dataset.m8aV410SequenceRailViewportPolicy ?? null,
          activeSummary: normalize(sequenceActiveSummary?.textContent),
          nextSummary: normalize(sequenceNextSummary?.textContent),
          activeSummaryVisible: isVisible(sequenceActiveSummary),
          nextSummaryVisible: isVisible(sequenceNextSummary),
          marks: sequenceMarks.map((mark) => ({
            windowId: mark.dataset.m8aV410SequenceWindowId ?? null,
            index: mark.dataset.m8aV410SequenceIndex ?? null,
            orbit: mark.dataset.m8aV410SequenceOrbit ?? null,
            active: mark.dataset.active ?? null,
            next: mark.dataset.next ?? null,
            transitionFrom: mark.dataset.transitionFrom ?? null,
            transitionTo: mark.dataset.transitionTo ?? null,
            productLabel:
              mark.dataset.m8aV410SequenceProductLabel ?? null,
            railLabel: mark.dataset.m8aV410SequenceRailLabel ?? null,
            ordinal: mark.dataset.m8aV410SequenceOrdinal ?? null,
            ariaCurrent: mark.getAttribute("aria-current"),
            visible: isVisible(mark),
            rect: rectToPlain(mark.getBoundingClientRect()),
            text: normalize(mark.textContent)
          }))
        },
        sheet: {
          ...elementRecord(sheet),
          hidden: sheet instanceof HTMLElement ? sheet.hidden : null
        },
        details: {
          ...elementRecord(details),
          ariaExpanded:
            details instanceof HTMLElement
              ? details.getAttribute("aria-expanded")
              : null
        },
        nativeTimeline: elementRecord(nativeTimeline),
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
    "Slice 2 must preserve route, endpoint pair, precision, and V4.6D truth: " +
      JSON.stringify({ urlPath: result.urlPath, facts })
  );
  assertListEquals(
    facts.orbitActorCounts,
    EXPECTED_ACTOR_COUNTS,
    "Slice 2 actor set"
  );
  assert(
    facts.sourceLineage?.projectionRead === EXPECTED_SOURCE_PROJECTION &&
      facts.sourceLineage?.rawPackageSideReadOwnership === "forbidden" &&
      facts.sourceLineage?.rawSourcePathsIncluded === false,
    "Slice 2 must preserve repo-owned projection/module runtime source boundary: " +
      JSON.stringify(facts.sourceLineage)
  );
  assert(
    facts.requiredWindowNonClaimKeys?.includes("noR2RuntimeSelector") &&
      facts.timelineNonClaims?.every(
        (window) => window.nonClaims?.noR2RuntimeSelector === true
      ),
    "Slice 2 must keep R2 read-only evidence/catalog support: " +
      JSON.stringify({
        requiredWindowNonClaimKeys: facts.requiredWindowNonClaimKeys,
        timelineNonClaims: facts.timelineNonClaims
      })
  );
}

function assertFirstViewportComposition(result, viewport) {
  const expectedCopy = EXPECTED_COPY[result.stateFacts.activeWindowId];
  const expectedMicroCue =
    EXPECTED_SLICE1_MICRO_CUES[result.stateFacts.activeWindowId];
  const slice1MicroCueVisible =
    result.sceneNarrative.visible &&
    result.sceneNarrative.titleVisible &&
    result.sceneNarrative.title === expectedMicroCue &&
    result.sceneNarrative.text.includes(expectedMicroCue);

  assert(expectedCopy, `Unexpected active window for ${viewport.name}: ${result.stateFacts.activeWindowId}`);
  assert(
    result.viewportClass === viewport.expectedViewportClass,
    `${viewport.name} viewport class mismatch: ${JSON.stringify({
      actual: result.viewportClass,
      expected: viewport.expectedViewportClass
    })}`
  );
  assert(
    result.rootDataset.firstViewportComposition === EXPECTED_V410_VERSION &&
      result.rootDataset.sliceScope === EXPECTED_V410_SCOPE &&
      result.stateFacts.firstViewportComposition?.version ===
        EXPECTED_V410_VERSION &&
      result.stateFacts.firstViewportComposition?.scope === EXPECTED_V410_SCOPE,
    "Slice 1 runtime/version seam mismatch: " +
      JSON.stringify({ rootDataset: result.rootDataset, state: result.stateFacts })
  );
  assertListEquals(
    result.rootDataset.sceneNarrativeVisibleContent,
    EXPECTED_SCENE_VISIBLE_CONTENT,
    "Slice 1 scene narrative visible content"
  );
  assert(
    result.rootDataset.controlsPriority === "secondary" &&
      result.strip.controlsPriority === "secondary" &&
      result.rootDataset.sequenceRailScope ===
        EXPECTED_V410_SEQUENCE_RAIL_SCOPE &&
      result.rootDataset.inspectorDefaultOpen === "false",
    "Slice 1 composition regression must keep controls secondary and inspector closed while later sequence rail scope is present: " +
      JSON.stringify({ rootDataset: result.rootDataset, strip: result.strip })
  );
  const v410NarrativeVisible =
    result.sceneNarrative.visible &&
    result.sceneNarrative.titleVisible &&
    result.sceneNarrative.firstReadVisible &&
    result.sceneNarrative.nextVisible;
  assert(
    v410NarrativeVisible || slice1MicroCueVisible,
    `${viewport.name} must show the primary scene narrative without opening Details: ` +
      JSON.stringify(result.sceneNarrative)
  );
  const v410NarrativeCopy =
    result.sceneNarrative.title === expectedCopy.productLabel &&
    result.sceneNarrative.firstRead === expectedCopy.firstRead &&
    result.sceneNarrative.next === expectedCopy.next &&
    result.sceneNarrative.text.includes(`Orbit focus: ${expectedCopy.orbit}`);
  const slice1MicroCueCopy =
    slice1MicroCueVisible &&
    result.sceneNarrative.firstRead === expectedCopy.firstRead &&
    result.sceneNarrative.next === expectedCopy.next;
  assert(
    v410NarrativeCopy || slice1MicroCueCopy,
    `${viewport.name} active state title/first-read/next line must be readable in the first viewport: ` +
      JSON.stringify({ sceneNarrative: result.sceneNarrative, expectedCopy })
  );

  if (result.sceneNarrative.anchorStatus === "geometry-reliable") {
    assert(
      slice1MicroCueVisible ||
        (result.sceneNarrative.cueVisible &&
        result.sceneNarrative.cue === expectedCopy.watch &&
        result.sceneNarrative.fallbackVisible === false),
      `${viewport.name} must show the watch cue when the scene anchor is reliable: ` +
        JSON.stringify({ sceneNarrative: result.sceneNarrative, expectedCopy })
    );
  } else {
    assert(
      (slice1MicroCueVisible &&
        result.sceneNarrative.sceneNearAttachmentClaim ===
          "no-scene-attachment-claimed") ||
        (result.sceneNarrative.cueVisible === false &&
        result.sceneNarrative.fallbackVisible &&
        result.sceneNarrative.fallback.includes("no reliable scene attachment") &&
        result.sceneNarrative.sceneNearAttachmentClaim ===
          "no-scene-attachment-claimed"),
      `${viewport.name} must provide an explicit unreliable-anchor fallback when the watch cue is hidden: ` +
        JSON.stringify(result.sceneNarrative)
    );
  }

  assert(
    result.sheet.hidden === true &&
      result.sheet.visible === false &&
      result.details.ariaExpanded === "false" &&
      result.stateFacts.disclosureState === "closed",
    `${viewport.name} must keep Details/inspector closed by default: ` +
      JSON.stringify({
        sheet: result.sheet,
        details: result.details,
        disclosureState: result.stateFacts.disclosureState
      })
  );
  assert(
    result.strip.visible &&
      result.visibleButtons.some((button) => button.controlId === "play-pause") &&
      result.visibleButtons.some((button) => button.controlId === "restart") &&
      result.visibleButtons.some((button) => button.multiplier === "30") &&
      result.visibleButtons.some((button) => button.multiplier === "60") &&
      result.visibleButtons.some((button) => button.multiplier === "120") &&
      result.visibleButtons.some(
        (button) => button.controlId === "details-toggle"
      ),
    `${viewport.name} must preserve existing replay controls: ` +
      JSON.stringify(result.visibleButtons)
  );
  assert(
    result.visibleButtons.every(
      (button) =>
        button.receivesCenterPoint &&
        button.scrollWidth <= button.clientWidth + 1 &&
        button.scrollHeight <= button.clientHeight + 1
    ),
    `${viewport.name} controls must remain usable and copy-fit: ` +
      JSON.stringify(result.visibleButtons)
  );
  assertRectInsideViewport(result.sceneNarrative.rect, viewport, "scene narrative");
  assertRectInsideViewport(result.strip.rect, viewport, "persistent controls");
  assert(
    !rectsOverlap(result.sceneNarrative.rect, result.strip.rect),
    `${viewport.name} controls must not cover the first-read scene narrative: ` +
      JSON.stringify({
        sceneNarrative: result.sceneNarrative.rect,
        strip: result.strip.rect
      })
  );

  if (viewport.expectedViewportClass === "desktop") {
    assert(
      result.strip.rect.width < viewport.width * 0.5 &&
        (slice1MicroCueVisible ||
          result.sceneNarrative.rect.height > result.strip.rect.height * 1.25),
      `${viewport.name} controls must be visually secondary to the scene narrative: ` +
        JSON.stringify({
          sceneNarrative: result.sceneNarrative.rect,
          strip: result.strip.rect,
          viewport
        })
    );
  } else {
    assert(
      result.sceneNarrative.rect.width <= viewport.width - 20 &&
        result.strip.rect.width <= viewport.width - 20,
      `${viewport.name} must keep first-viewport surfaces usable within the narrow viewport: ` +
        JSON.stringify({
          sceneNarrative: result.sceneNarrative.rect,
          strip: result.strip.rect,
          viewport
        })
    );
  }

  assertForbiddenClaimScan(result, viewport.name);
}

function expectedNextWindowIdFor(activeWindowId) {
  const index = EXPECTED_SEQUENCE_WINDOW_IDS.indexOf(activeWindowId);
  assert(index >= 0, `Unknown sequence window id: ${activeWindowId}`);
  return EXPECTED_SEQUENCE_WINDOW_IDS[
    (index + 1) % EXPECTED_SEQUENCE_WINDOW_IDS.length
  ];
}

function assertNarrowRailAvoidsCesiumNativeSurfaces(result, viewport) {
  if (viewport.expectedViewportClass !== "narrow") {
    return;
  }

  const surfaces = Object.entries(result.nativeSurfaces ?? {})
    .map(([name, surface]) => ({ name, ...(surface ?? {}) }))
    .filter((surface) => surface.visible && surface.rect);
  const problemSurfaces = surfaces.filter((surface) => {
    return (
      rectsOverlap(result.sequenceRail.rect, surface.rect) ||
      (rectsHorizontallyOverlap(result.sequenceRail.rect, surface.rect) &&
        verticalGapBetween(result.sequenceRail.rect, surface.rect) < 8)
    );
  });

  assert(
    problemSurfaces.length === 0,
    `${viewport.name} sequence rail must not incoherently overlap Cesium native/default-token/attribution/timeline surfaces: ` +
      JSON.stringify({
        sequenceRail: result.sequenceRail.rect,
        problemSurfaces,
        nativeSurfaces: result.nativeSurfaces
      })
  );
}

function assertHandoverSequenceRail(result, viewport, options = {}) {
  const activeWindowId = result.stateFacts.activeWindowId;
  const expectedNextWindowId =
    options.expectedNextWindowId ?? expectedNextWindowIdFor(activeWindowId);
  const activeCopy = EXPECTED_COPY[activeWindowId];
  const nextCopy = EXPECTED_COPY[expectedNextWindowId];
  const activeMarks = result.sequenceRail.marks.filter(
    (mark) => mark.active === "true"
  );
  const nextMarks = result.sequenceRail.marks.filter(
    (mark) => mark.next === "true"
  );

  assert(activeCopy && nextCopy, `Missing expected copy for rail state: ${JSON.stringify({
    activeWindowId,
    expectedNextWindowId
  })}`);
  assert(
    result.sequenceRail.visible &&
      result.sequenceRail.version === EXPECTED_V410_SEQUENCE_RAIL_VERSION &&
      result.sequenceRail.scope === EXPECTED_V410_SEQUENCE_RAIL_SCOPE &&
      result.stateFacts.handoverSequenceRail?.version ===
        EXPECTED_V410_SEQUENCE_RAIL_VERSION &&
      result.stateFacts.handoverSequenceRail?.scope ===
        EXPECTED_V410_SEQUENCE_RAIL_SCOPE,
    `${viewport.name} must expose the Slice 2 sequence rail runtime seam: ` +
      JSON.stringify({
        sequenceRail: result.sequenceRail,
        stateFacts: result.stateFacts.handoverSequenceRail
      })
  );
  assertListEquals(
    result.sequenceRail.visibleContent,
    EXPECTED_SEQUENCE_VISIBLE_CONTENT,
    `${viewport.name} sequence rail visible content`
  );
  assertListEquals(
    result.sequenceRail.windowIds,
    EXPECTED_SEQUENCE_WINDOW_IDS,
    `${viewport.name} sequence rail window order`
  );
  assertListEquals(
    result.stateFacts.handoverSequenceRail?.windowIds ?? [],
    EXPECTED_SEQUENCE_WINDOW_IDS,
    `${viewport.name} sequence rail state window order`
  );
  assert(
    result.sequenceRail.activeWindowId === activeWindowId &&
      result.sequenceRail.nextWindowId === expectedNextWindowId &&
      result.stateFacts.handoverSequenceRail?.activeWindowId ===
        activeWindowId &&
      result.stateFacts.handoverSequenceRail?.nextWindowId ===
        expectedNextWindowId,
    `${viewport.name} sequence rail active/next state mismatch: ` +
      JSON.stringify({
        sequenceRail: result.sequenceRail,
        stateRail: result.stateFacts.handoverSequenceRail,
        activeWindowId,
        expectedNextWindowId
      })
  );
  assert(
    result.sequenceRail.activeSummaryVisible &&
      result.sequenceRail.nextSummaryVisible &&
      result.sequenceRail.activeSummary.includes(activeCopy.productLabel) &&
      result.sequenceRail.nextSummary.includes(nextCopy.productLabel),
    `${viewport.name} must show active and next state summaries in the default view: ` +
      JSON.stringify({
        activeSummary: result.sequenceRail.activeSummary,
        nextSummary: result.sequenceRail.nextSummary,
        activeCopy,
        nextCopy
      })
  );
  assert(
    result.sequenceRail.marks.length === EXPECTED_SEQUENCE_WINDOW_IDS.length &&
      result.sequenceRail.marks.every((mark, index) => {
        return (
          mark.visible &&
          mark.windowId === EXPECTED_SEQUENCE_WINDOW_IDS[index] &&
          mark.index === String(index + 1) &&
          mark.productLabel === EXPECTED_COPY[mark.windowId]?.productLabel
        );
      }),
    `${viewport.name} sequence rail must render five ordered V4.6D marks: ` +
      JSON.stringify(result.sequenceRail.marks)
  );
  assert(
    activeMarks.length === 1 &&
      activeMarks[0].windowId === activeWindowId &&
      activeMarks[0].ariaCurrent === "step" &&
      nextMarks.length === 1 &&
      nextMarks[0].windowId === expectedNextWindowId,
    `${viewport.name} sequence rail must mark exactly one active and one next state: ` +
      JSON.stringify({ activeMarks, nextMarks, activeWindowId, expectedNextWindowId })
  );
  assertRectInsideViewport(
    result.sequenceRail.rect,
    viewport,
    "handover sequence rail"
  );
  assert(
    !rectsOverlap(result.sequenceRail.rect, result.strip.rect),
    `${viewport.name} sequence rail must not block secondary controls: ` +
      JSON.stringify({
        sequenceRail: result.sequenceRail.rect,
        strip: result.strip.rect
      })
  );

  if (viewport.expectedViewportClass === "narrow") {
    assert(
      result.sequenceRail.rect.height <= viewport.height * 0.16 &&
        result.sequenceRail.marks.every((mark) => mark.rect.height <= 52),
      `${viewport.name} sequence rail must stay compact on narrow viewport: ` +
        JSON.stringify({
          railRect: result.sequenceRail.rect,
          marks: result.sequenceRail.marks.map((mark) => mark.rect),
          viewport
        })
    );
    assertNarrowRailAvoidsCesiumNativeSurfaces(result, viewport);
  }

  if (options.expectedTransitionFromWindowId) {
    const transitionFromMarks = result.sequenceRail.marks.filter(
      (mark) => mark.transitionFrom === "true"
    );
    const transitionToMarks = result.sequenceRail.marks.filter(
      (mark) => mark.transitionTo === "true"
    );

    assert(
      result.sequenceRail.transitionVisible === "true" &&
        result.sequenceRail.transitionFromWindowId ===
          options.expectedTransitionFromWindowId &&
        result.sequenceRail.transitionToWindowId ===
          options.expectedTransitionToWindowId &&
        transitionFromMarks.length === 1 &&
        transitionFromMarks[0].windowId ===
          options.expectedTransitionFromWindowId &&
        transitionToMarks.length === 1 &&
        transitionToMarks[0].windowId ===
          options.expectedTransitionToWindowId,
      `${viewport.name} transition event must update the sequence indicator: ` +
        JSON.stringify({
          sequenceRail: result.sequenceRail,
          transitionFromMarks,
          transitionToMarks,
          options
        })
    );
  }
}

function assertVisibleDifferenceFromV49Baseline(result) {
  assert(
    existsSync(BASELINE_METADATA_DESKTOP),
    `Missing accepted Slice 0 V4.9 baseline metadata: ${serializeRelative(
      BASELINE_METADATA_DESKTOP
    )}`
  );

  const baseline = JSON.parse(readFileSync(BASELINE_METADATA_DESKTOP, "utf8"));
  const baselineStrip = baseline.dom?.strip?.rect;
  const baselineAnnotation = baseline.dom?.annotation?.rect;
  const currentStrip = result.strip.rect;
  const currentAnnotation = result.sceneNarrative.rect;
  const legacyV410BaselineDelta =
    baselineStrip?.left > result.viewport.width * 0.45 &&
    currentStrip.left < result.viewport.width * 0.08 &&
    Math.abs((baselineAnnotation?.width ?? 0) - currentAnnotation.width) >= 8 &&
    (result.sceneNarrative.text.includes("LEO review focus") ||
      result.sceneNarrative.text.includes(V411_CORRECTION_A_SUCCESSOR_MICRO_CUE));
  const v411CorrectionASuccessorGeometry =
    baselineStrip?.left > result.viewport.width * 0.45 &&
    Math.abs(currentStrip.left - V411_CORRECTION_A_SUCCESSOR_STRIP_LEFT_PX) <=
      V411_CORRECTION_A_SUCCESSOR_STRIP_LEFT_TOLERANCE_PX &&
    result.sceneNarrative.text.includes(V411_CORRECTION_A_SUCCESSOR_MICRO_CUE);

  assert(
    legacyV410BaselineDelta || v411CorrectionASuccessorGeometry,
    "Default desktop screenshot must visibly differ from the accepted V4.9 baseline: " +
      JSON.stringify({
        baselineStrip,
        currentStrip,
        baselineAnnotation,
        currentAnnotation,
        currentText: result.sceneNarrative.text
      })
  );

  return {
    baseline: serializeRelative(BASELINE_METADATA_DESKTOP),
    baselineStrip,
    currentStrip,
    baselineAnnotation,
    currentAnnotation,
    acceptedGeometryContract: v411CorrectionASuccessorGeometry
      ? "v4.11-correction-a-successor"
      : "v4.10-legacy-baseline-delta",
    visibleDifferenceFacts: [
      v411CorrectionASuccessorGeometry
        ? "Correction A successor layout keeps the scope/control strip at left 340 with focus LEO micro-cue"
        : "controls moved from dominant top-right strip to secondary top-left strip",
      "scene narrative is wider and taller than the V4.9 annotation",
      "active state title, first-read line, watch cue, and next line are visible without Details"
    ]
  };
}

function writeMetadata(filename, payload) {
  mkdirSync(outputRoot, { recursive: true });
  const absolutePath = path.join(outputRoot, filename);
  writeFileSync(absolutePath, `${JSON.stringify(payload, null, 2)}\n`);
  return absolutePath;
}

function screenshotEvidence(absolutePath, viewport) {
  assert(existsSync(absolutePath), `Missing screenshot: ${absolutePath}`);
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

async function captureViewportEvidence(client, baseUrl, viewport) {
  await setViewport(client, viewport);
  await navigateAndWait(client, baseUrl);
  const result = await inspectFirstViewport(client, viewport.name);
  assertPreservedInvariants(result);
  assertFirstViewportComposition(result, viewport);
  assertHandoverSequenceRail(result, viewport);
  const screenshotPath = await captureScreenshot(client, viewport.screenshot);
  const screenshot = screenshotEvidence(screenshotPath, viewport);
  const metadataPath = writeMetadata(viewport.metadata, {
    capturedAt: new Date().toISOString(),
    route: REQUEST_PATH,
    viewport,
    screenshot,
    result
  });

  return {
    viewport: viewport.name,
    screenshot,
    metadata: serializeRelative(metadataPath),
    activeWindowId: result.stateFacts.activeWindowId,
    nextWindowId: result.sequenceRail.nextWindowId,
    anchorStatus: result.sceneNarrative.anchorStatus,
    sceneNarrativeRect: result.sceneNarrative.rect,
    sequenceRailRect: result.sequenceRail.rect,
    stripRect: result.strip.rect,
    nativeSurfaces: result.nativeSurfaces,
    detailsDefaultOpen: result.details.ariaExpanded === "true",
    result
  };
}

async function captureTransitionEvidence(client, baseUrl) {
  await setViewport(client, TRANSITION_CAPTURE);
  await navigateAndWait(client, baseUrl);
  await seekReplayRatio(client, TRANSITION_CAPTURE.seekRatio);
  const result = await inspectFirstViewport(client, TRANSITION_CAPTURE.name);
  assert(
    result.stateFacts.activeWindowId === TRANSITION_CAPTURE.expectedWindowId,
    "Transition capture must land on LEO pressure: " +
      JSON.stringify(result.stateFacts)
  );
  assertPreservedInvariants(result);
  assertFirstViewportComposition(result, TRANSITION_CAPTURE);
  assertHandoverSequenceRail(result, TRANSITION_CAPTURE, {
    expectedNextWindowId: TRANSITION_CAPTURE.expectedNextWindowId,
    expectedTransitionFromWindowId:
      TRANSITION_CAPTURE.expectedTransitionFromWindowId,
    expectedTransitionToWindowId:
      TRANSITION_CAPTURE.expectedTransitionToWindowId
  });
  const screenshotPath = await captureScreenshot(
    client,
    TRANSITION_CAPTURE.screenshot
  );
  const screenshot = screenshotEvidence(screenshotPath, TRANSITION_CAPTURE);
  const metadataPath = writeMetadata(TRANSITION_CAPTURE.metadata, {
    capturedAt: new Date().toISOString(),
    route: REQUEST_PATH,
    viewport: TRANSITION_CAPTURE,
    screenshot,
    result
  });

  return {
    viewport: TRANSITION_CAPTURE.name,
    screenshot,
    metadata: serializeRelative(metadataPath),
    activeWindowId: result.stateFacts.activeWindowId,
    nextWindowId: result.sequenceRail.nextWindowId,
    transitionFromWindowId: result.sequenceRail.transitionFromWindowId,
    transitionToWindowId: result.sequenceRail.transitionToWindowId,
    anchorStatus: result.sceneNarrative.anchorStatus,
    sceneNarrativeRect: result.sceneNarrative.rect,
    sequenceRailRect: result.sequenceRail.rect,
    stripRect: result.strip.rect,
    nativeSurfaces: result.nativeSurfaces,
    result
  };
}

async function verifySequenceAcrossAcceptedWindows(client, baseUrl) {
  const results = [];

  await setViewport(client, VIEWPORTS[0]);
  await navigateAndWait(client, baseUrl);

  for (const check of SEQUENCE_RATIO_CHECKS) {
    await seekReplayRatio(client, check.ratio);
    const result = await inspectFirstViewport(
      client,
      `sequence-ratio-${check.ratio}`
    );

    assertPreservedInvariants(result);
    assertFirstViewportComposition(result, VIEWPORTS[0]);
    assert(
      result.stateFacts.activeWindowId === check.expectedWindowId,
      "Sequence ratio check landed on unexpected V4.6D window: " +
        JSON.stringify({ check, activeWindowId: result.stateFacts.activeWindowId })
    );
    assertHandoverSequenceRail(result, VIEWPORTS[0], {
      expectedNextWindowId: check.expectedNextWindowId
    });
    results.push({
      ratio: check.ratio,
      activeWindowId: result.stateFacts.activeWindowId,
      nextWindowId: result.sequenceRail.nextWindowId,
      activeSummary: result.sequenceRail.activeSummary,
      nextSummary: result.sequenceRail.nextSummary
    });
  }

  return results;
}

async function main() {
  ensureDistBuildExists();
  mkdirSync(outputRoot, { recursive: true });

  const processFacts = [];
  const captures = [];
  let sequenceChecks = [];
  const browserCommand = findHeadlessBrowser();
  let serverHandle = null;
  let browserHandle = null;
  let client = null;
  let baselineDifference = null;

  const writeManifest = (status) => {
    writeMetadata("capture-manifest.json", {
      generatedAt: new Date().toISOString(),
      status,
      route: REQUEST_PATH,
      outputRoot: serializeRelative(outputRoot),
      baselineDifference,
      captures: captures.map((capture) => ({
        viewport: capture.viewport,
        screenshot: capture.screenshot,
        metadata: capture.metadata,
        activeWindowId: capture.activeWindowId,
        nextWindowId: capture.nextWindowId,
        transitionFromWindowId: capture.transitionFromWindowId ?? "",
        transitionToWindowId: capture.transitionToWindowId ?? "",
        anchorStatus: capture.anchorStatus,
        sceneNarrativeRect: capture.sceneNarrativeRect,
        sequenceRailRect: capture.sequenceRailRect,
        stripRect: capture.stripRect,
        nativeSurfaces: capture.nativeSurfaces ?? {},
        detailsDefaultOpen: capture.detailsDefaultOpen ?? false
      })),
      sequenceChecks,
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

    for (const viewport of VIEWPORTS) {
      const capture = await captureViewportEvidence(
        client,
        serverHandle.baseUrl,
        viewport
      );
      captures.push(capture);
    }

    baselineDifference = assertVisibleDifferenceFromV49Baseline(
      captures.find((capture) => capture.viewport === "default-1440x900").result
    );
    captures.push(await captureTransitionEvidence(client, serverHandle.baseUrl));
    sequenceChecks = await verifySequenceAcrossAcceptedWindows(
      client,
      serverHandle.baseUrl
    );
    writeManifest("passed-before-cleanup");

    console.log(
      `M8A-V4.10 Slice 2 handover sequence rail smoke passed: ${JSON.stringify(
        {
          baselineDifference,
          sequenceChecks,
          captures: captures.map((capture) => ({
            viewport: capture.viewport,
            screenshot: capture.screenshot.path,
            metadata: capture.metadata,
            activeWindowId: capture.activeWindowId,
            nextWindowId: capture.nextWindowId,
            transitionFromWindowId: capture.transitionFromWindowId ?? "",
            transitionToWindowId: capture.transitionToWindowId ?? "",
            anchorStatus: capture.anchorStatus,
            detailsDefaultOpen: capture.detailsDefaultOpen ?? false
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

    writeManifest(captures.length >= 3 ? "cleanup-complete" : "failed-cleanup-complete");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
