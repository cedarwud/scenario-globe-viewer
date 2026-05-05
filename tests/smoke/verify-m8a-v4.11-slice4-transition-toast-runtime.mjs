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
const outputRoot = path.join(repoRoot, "output/m8a-v4.11-slice4");

const REQUEST_PATH = "/?scenePreset=regional&m8aV4GroundStationScene=1";
const EXPECTED_ENDPOINT_PAIR_ID =
  "taiwan-cht-speedcast-singapore-operator-family-2026-04-26";
const EXPECTED_PRECISION = "operator-family-only";
const EXPECTED_MODEL_ID = "m8a-v4.6d-simulation-handover-model.v1";
const EXPECTED_MODEL_TRUTH = "simulation-output-not-operator-log";
const EXPECTED_SOURCE_PROJECTION = "M8A_V4_GROUND_STATION_RUNTIME_PROJECTION";
const EXPECTED_GLANCE_VERSION =
  "m8a-v4.11-glance-rank-surface-slice1-runtime.v1";
const EXPECTED_HOVER_VERSION =
  "m8a-v4.11-hover-popover-slice2-runtime.v1";
const EXPECTED_CONCURRENCY_VERSION =
  "m8a-v4.11-inspector-concurrency-slice3-runtime.v1";
const EXPECTED_TRANSIENT_VERSION =
  "m8a-v4.11-transition-toast-slice4-runtime.v1";
const EXPECTED_ACTOR_COUNTS = { leo: 6, meo: 5, geo: 2 };
const EXPECTED_SEQUENCE_WINDOW_IDS = [
  "leo-acquisition-context",
  "leo-aging-pressure",
  "meo-continuity-hold",
  "leo-reentry-candidate",
  "geo-continuity-guard"
];
const VIEWPORT = {
  name: "desktop-1440x900",
  width: 1440,
  height: 900
};
const TOAST_WINDOWS = [
  {
    windowId: "leo-aging-pressure",
    ratio: 0.25,
    nextWindowId: "meo-continuity-hold",
    title: "LEO pressure",
    line: "Continuity will shift to the MEO hold next.",
    sceneCue: "pressure · LEO",
    screenshot: "v4.11-w2-toast-1440x900.png",
    metadata: "v4.11-w2-toast-1440x900.metadata.json"
  },
  {
    windowId: "meo-continuity-hold",
    ratio: 0.5,
    nextWindowId: "leo-reentry-candidate",
    title: "MEO continuity hold",
    line: "MEO holds continuity in this simulation window.",
    sceneCue: "hold · MEO",
    screenshot: "v4.11-w3-toast-1440x900.png",
    metadata: "v4.11-w3-toast-1440x900.metadata.json"
  },
  {
    windowId: "leo-reentry-candidate",
    ratio: 0.7,
    nextWindowId: "geo-continuity-guard",
    title: "LEO re-entry",
    line: "GEO will close the sequence as guard context.",
    sceneCue: "re-entry · LEO",
    screenshot: "v4.11-w4-toast-1440x900.png",
    metadata: "v4.11-w4-toast-1440x900.metadata.json"
  },
  {
    windowId: "geo-continuity-guard",
    ratio: 0.9,
    nextWindowId: "leo-acquisition-context",
    title: "GEO guard context",
    line: "Restart to review the sequence again.",
    sceneCue: "guard · GEO",
    screenshot: "v4.11-w5-toast-1440x900.png",
    metadata: "v4.11-w5-toast-1440x900.metadata.json"
  }
];
const FORBIDDEN_RAW_WINDOW_IDS = EXPECTED_SEQUENCE_WINDOW_IDS;
const FORBIDDEN_UNIT_PATTERNS = [
  /\b\d+(?:\.\d+)?\s*ms\b/i,
  /\b\d+(?:\.\d+)?\s*Mbps\b/i,
  /\b\d+(?:\.\d+)?\s*Gbps\b/i,
  /\bmeasured\s+\d+(?:\.\d+)?\s*%/i
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertListEquals(actual, expected, label) {
  assert(
    JSON.stringify(actual) === JSON.stringify(expected),
    `${label} mismatch: ${JSON.stringify({ actual, expected })}`
  );
}

function rectsIntersect(left, right) {
  if (!left || !right) {
    return false;
  }

  return (
    left.left < right.right &&
    left.right > right.left &&
    left.top < right.bottom &&
    left.bottom > right.top
  );
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
          glance: productRoot?.dataset.m8aV411GlanceRankSurface ?? null,
          hover: productRoot?.dataset.m8aV411HoverPopover ?? null,
          concurrency:
            productRoot?.dataset.m8aV411InspectorConcurrency ?? null,
          transient:
            productRoot?.dataset.m8aV411TransientSurface ?? null,
          hasCapture: Boolean(
            window.__SCENARIO_GLOBE_VIEWER_CAPTURE__?.m8aV4GroundStationScene
          )
        };
      })()`
    );

    if (
      lastState?.bootstrapState === "ready" &&
      lastState?.scenePreset === "regional" &&
      lastState?.glance === EXPECTED_GLANCE_VERSION &&
      lastState?.hover === EXPECTED_HOVER_VERSION &&
      lastState?.concurrency === EXPECTED_CONCURRENCY_VERSION &&
      lastState?.transient === EXPECTED_TRANSIENT_VERSION &&
      lastState?.hasCapture === true
    ) {
      return lastState;
    }

    if (lastState?.bootstrapState === "error") {
      throw new Error(
        `M8A-V4.11 Slice 4 route hit bootstrap error: ${JSON.stringify(
          lastState
        )}`
      );
    }

    await sleep(100);
  }

  throw new Error(
    `M8A-V4.11 Slice 4 did not reach a ready route: ${JSON.stringify(
      lastState
    )}`
  );
}

async function navigateAndWait(client, baseUrl) {
  await client.send("Page.navigate", { url: `${baseUrl}${REQUEST_PATH}` });
  await waitForBootstrapReady(client);
  await waitForGlobeReady(client, "M8A-V4.11 Slice 4");
}

async function inspectRuntime(client, label = "inspection") {
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
      const elementRecord = (element) => ({
        exists: element instanceof HTMLElement,
        visible: isVisible(element),
        hidden: element instanceof HTMLElement ? element.hidden : null,
        rect: element instanceof HTMLElement
          ? rectToPlain(element.getBoundingClientRect())
          : null,
        text: element instanceof HTMLElement ? normalize(element.innerText) : "",
        style: element instanceof HTMLElement
          ? {
              animationName: getComputedStyle(element).animationName,
              transform: getComputedStyle(element).transform,
              opacity: getComputedStyle(element).opacity
            }
          : null
      });
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
      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      const state = capture?.m8aV4GroundStationScene?.getState?.();
      const productRoot = document.querySelector("[data-m8a-v47-product-ux='true']");
      const toastStack = productRoot?.querySelector("[data-m8a-v411-transition-toast-stack='true']");
      const toasts = Array.from(
        productRoot?.querySelectorAll("[data-m8a-v411-transition-toast='true']") ?? []
      ).map((toast) => ({
        ...elementRecord(toast),
        windowId: toast.dataset.m8aV411TransitionToastWindowId ?? null,
        fromWindowId:
          toast.dataset.m8aV411TransitionToastFromWindowId ?? null,
        title: toast.dataset.m8aV411TransitionToastTitle ?? null,
        line: toast.dataset.m8aV411TransitionToastLine ?? null,
        durationMs:
          toast.dataset.m8aV411TransitionToastDurationMs ?? null,
        elapsedMs:
          toast.dataset.m8aV411TransitionToastElapsedMs ?? null,
        maxWidthPx:
          toast.dataset.m8aV411TransitionToastMaxWidthPx ?? null,
        maxCanvasWidthRatio:
          toast.dataset.m8aV411TransitionToastMaxCanvasWidthRatio ?? null,
        stackIndex:
          toast.dataset.m8aV411TransitionToastStackIndex ?? null,
        stackSize:
          toast.dataset.m8aV411TransitionToastStackSize ?? null
      }));
      const sceneCues = Array.from(
        productRoot?.querySelectorAll("[data-m8a-v411-scene-cue='true']") ?? []
      ).map((cue) => ({
        ...elementRecord(cue),
        windowId: cue.dataset.m8aV411SceneCueWindowId ?? null,
        cueText: cue.dataset.m8aV411SceneCueText ?? null,
        maxWidthPx: cue.dataset.m8aV411SceneCueMaxWidthPx ?? null,
        maxHeightPx: cue.dataset.m8aV411SceneCueMaxHeightPx ?? null,
        fadeInMs: cue.dataset.m8aV411SceneCueFadeInMs ?? null,
        persistMs: cue.dataset.m8aV411SceneCuePersistMs ?? null,
        actorId: cue.dataset.m8aV411SceneCueActorId ?? null,
        projected: cue.dataset.m8aV411SceneCueProjected ?? null,
        anchorStatus: cue.dataset.m8aV411SceneCueAnchorStatus ?? null
      }));
      const sequenceRail = productRoot?.querySelector("[data-m8a-v410-sequence-rail='true']");
      const sequenceMarks = Array.from(
        sequenceRail?.querySelectorAll("[data-m8a-v410-sequence-mark='true']") ?? []
      ).map((mark) => ({
        windowId: mark.dataset.m8aV410SequenceWindowId ?? null,
        active: mark.dataset.active ?? null,
        next: mark.dataset.next ?? null,
        text: normalize(mark.textContent)
      }));
      const controlRects = Array.from(
        productRoot?.querySelectorAll(
          "[data-m8a-v47-control-strip='true'], [data-m8a-v410-sequence-rail='true'], [data-m8a-v47-control-id]"
        ) ?? []
      )
        .filter(isVisible)
        .map((control) => ({
          selector:
            control.dataset.m8aV47ControlId ??
            control.dataset.m8aV47UiSurface ??
            control.dataset.m8aV410SequenceRail ??
            control.className,
          rect: rectToPlain(control.getBoundingClientRect()),
          text: normalize(control.innerText)
        }));
      const glyphRects = Array.from(
        productRoot?.querySelectorAll(
          "[data-m8a-v411-orbit-class-chip='true'], [data-m8a-v411-ground-station-chip='true']"
        ) ?? []
      )
        .filter(isVisible)
        .map((glyph) => ({
          selector:
            glyph.dataset.m8aV411OrbitChipActorId ??
            glyph.dataset.m8aV411GroundStationEndpointId ??
            glyph.className,
          rect: rectToPlain(glyph.getBoundingClientRect()),
          text: normalize(glyph.innerText)
        }));
      const status = productRoot?.querySelector("[data-m8a-v411-transition-toast-status='true']");
      const transitionEvent = productRoot?.querySelector("[data-m8a-v49-transition-event='true']");
      const productVisibleText = visibleTextNodes(productRoot).join(" ");
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
        stateFacts: {
          route: state?.simulationHandoverModel?.route ?? null,
          endpointPairId:
            state?.simulationHandoverModel?.endpointPairId ?? null,
          acceptedPairPrecision:
            state?.simulationHandoverModel?.acceptedPairPrecision ?? null,
          modelId: state?.simulationHandoverModel?.modelId ?? null,
          modelTruth: state?.simulationHandoverModel?.modelTruth ?? null,
          orbitActorCounts: state?.orbitActorCounts ?? null,
          actorCount: state?.actorCount ?? null,
          sourceLineage: state?.sourceLineage ?? null,
          activeWindowId: state?.productUx?.activeWindowId ?? null,
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
          disclosure: state?.productUx?.disclosure ?? null
        },
        rootDataset: {
          glance: productRoot?.dataset.m8aV411GlanceRankSurface ?? null,
          hover: productRoot?.dataset.m8aV411HoverPopover ?? null,
          concurrency:
            productRoot?.dataset.m8aV411InspectorConcurrency ?? null,
          transient:
            productRoot?.dataset.m8aV411TransientSurface ?? null,
          scope:
            productRoot?.dataset.m8aV411TransientSurfaceScope ?? null,
          toastDurationMs:
            productRoot?.dataset.m8aV411TransitionToastDurationMs ?? null,
          toastMaxCount:
            productRoot?.dataset.m8aV411TransitionToastMaxCount ?? null,
          toastMaxWidthPx:
            productRoot?.dataset.m8aV411TransitionToastMaxWidthPx ?? null,
          toastMaxCanvasWidthRatio:
            productRoot?.dataset
              .m8aV411TransitionToastMaxCanvasWidthRatio ?? null,
          sceneCueMaxWidthPx:
            productRoot?.dataset.m8aV411SceneCueMaxWidthPx ?? null,
          sceneCueMaxHeightPx:
            productRoot?.dataset.m8aV411SceneCueMaxHeightPx ?? null,
          sceneCueFadeInMs:
            productRoot?.dataset.m8aV411SceneCueFadeInMs ?? null,
          sceneCuePersistMs:
            productRoot?.dataset.m8aV411SceneCuePersistMs ?? null
        },
        toastStack: {
          ...elementRecord(toastStack),
          count:
            toastStack instanceof HTMLElement
              ? Number(toastStack.dataset.m8aV411TransitionToastStackCount ?? "0")
              : 0,
          maxCount:
            toastStack instanceof HTMLElement
              ? Number(toastStack.dataset.m8aV411TransitionToastMaxCount ?? "0")
              : 0
        },
        toasts,
        visibleToasts: toasts.filter((toast) => toast.visible),
        sceneCues,
        visibleSceneCues: sceneCues.filter((cue) => cue.visible),
        status: {
          ...elementRecord(status),
          role: status instanceof HTMLElement ? status.getAttribute("role") : null,
          ariaLive:
            status instanceof HTMLElement ? status.getAttribute("aria-live") : null,
          ariaAtomic:
            status instanceof HTMLElement ? status.getAttribute("aria-atomic") : null,
          ariaWindowId:
            status instanceof HTMLElement
              ? status.dataset.m8aV411TransitionToastAriaWindowId ?? null
              : null,
          ariaText:
            status instanceof HTMLElement
              ? status.dataset.m8aV411TransitionToastAriaText ?? null
              : null,
          ariaTriggered:
            status instanceof HTMLElement
              ? status.dataset.m8aV411TransitionToastAriaTriggered ?? null
              : null
        },
        transitionEvent: elementRecord(transitionEvent),
        sequenceRail: {
          ...elementRecord(sequenceRail),
          activeWindowId:
            sequenceRail instanceof HTMLElement
              ? sequenceRail.dataset.m8aV410SequenceRailActiveWindowId ?? null
              : null,
          nextWindowId:
            sequenceRail instanceof HTMLElement
              ? sequenceRail.dataset.m8aV410SequenceRailNextWindowId ?? null
              : null,
          marks: sequenceMarks
        },
        controlRects,
        glyphRects,
        visibleProductText: productVisibleText,
        forbiddenScopeLeak: {
          sourcesRole: Boolean(
            productRoot?.querySelector("[data-m8a-v411-sources-role]")
          ),
          r2Listing: /candidate endpoints|r2 listing|read-only catalog/i.test(
            productVisibleText
          )
        },
        resourceHits
      };
    })(${JSON.stringify(label)})`
  );
}

async function seekReplayRatio(client, ratio) {
  await evaluateRuntimeValue(
    client,
    `((ratio) => {
      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      const replayClock = capture?.replayClock;
      const replayState = replayClock?.getState?.();

      capture?.m8aV4GroundStationScene?.pause?.();
      if (replayClock && replayState?.startTime && replayState?.stopTime) {
        const start = Date.parse(replayState.startTime);
        const stop = Date.parse(replayState.stopTime);
        replayClock.seek(new Date(start + (stop - start) * ratio).toISOString());
        capture?.viewer?.clock?.tick?.();
        capture?.m8aV4GroundStationScene?.pause?.();
      }
    })(${JSON.stringify(ratio)})`
  );
}

async function waitForNoToast(client, label) {
  let last = null;

  for (let attempt = 0; attempt < 80; attempt += 1) {
    last = await inspectRuntime(client, label);

    if (
      last.visibleToasts.length === 0 &&
      last.visibleSceneCues.length === 0
    ) {
      return last;
    }

    await sleep(50);
  }

  throw new Error(
    `${label} did not clear transient surfaces: ` +
      JSON.stringify({
        visibleToasts: last?.visibleToasts,
        visibleSceneCues: last?.visibleSceneCues
      })
  );
}

async function resetToW1(client) {
  await seekReplayRatio(client, 0.1);
  await sleep(120);
  await waitForNoToast(client, "reset-to-w1");
}

async function triggerTransition(client, config) {
  const startedAt = await evaluateRuntimeValue(client, "performance.now()");
  await seekReplayRatio(client, config.ratio);

  let last = null;

  for (let attempt = 0; attempt < 40; attempt += 1) {
    last = await inspectRuntime(client, `transition-${config.windowId}`);

    if (
      last.stateFacts.activeWindowId === config.windowId &&
      last.visibleToasts.length === 1 &&
      last.visibleSceneCues.length === 1
    ) {
      const visibleAt = await evaluateRuntimeValue(client, "performance.now()");
      const runtimeElapsedMs = Number(last.visibleToasts[0].elapsedMs);

      return {
        result: last,
        elapsedMs: Number.isFinite(runtimeElapsedMs)
          ? runtimeElapsedMs
          : visibleAt - startedAt
      };
    }

    await sleep(8);
  }

  throw new Error(
    `Transition to ${config.windowId} did not show exactly one toast and one scene cue: ` +
      JSON.stringify({
        elapsedLimitMs: 250,
        lastState: last?.stateFacts,
        visibleToasts: last?.visibleToasts,
        visibleSceneCues: last?.visibleSceneCues
      })
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
    "Slice 4 must preserve route, endpoint pair, precision, and V4.6D truth: " +
      JSON.stringify({ urlPath: result.urlPath, facts })
  );
  assertListEquals(
    facts.orbitActorCounts,
    EXPECTED_ACTOR_COUNTS,
    "Slice 4 actor set"
  );
  assert(
    facts.actorCount === 13,
    `Slice 4 actor count must remain 13: ${JSON.stringify(facts)}`
  );
  assert(
    facts.sourceLineage?.projectionRead === EXPECTED_SOURCE_PROJECTION &&
      facts.sourceLineage?.rawPackageSideReadOwnership === "forbidden" &&
      facts.sourceLineage?.rawSourcePathsIncluded === false &&
      result.resourceHits.length === 0,
    "Slice 4 must preserve repo-owned projection/module runtime source boundary: " +
      JSON.stringify({
        sourceLineage: facts.sourceLineage,
        resourceHits: result.resourceHits
      })
  );
  assertListEquals(
    facts.timelineWindowIds,
    EXPECTED_SEQUENCE_WINDOW_IDS,
    "Slice 4 V4.6D window order"
  );
  assert(
    facts.requiredWindowNonClaimKeys?.includes("noR2RuntimeSelector") &&
      facts.timelineNonClaims?.every(
        (window) => window.nonClaims?.noR2RuntimeSelector === true
      ),
    "Slice 4 must keep R2 read-only evidence/catalog support: " +
      JSON.stringify({
        requiredWindowNonClaimKeys: facts.requiredWindowNonClaimKeys,
        timelineNonClaims: facts.timelineNonClaims
      })
  );
  assert(
    result.forbiddenScopeLeak.r2Listing === false,
    "Slice 4 must not leak visible R2 listing into the toast surface: " +
      JSON.stringify(result.forbiddenScopeLeak)
  );
}

function assertTransientSeam(result) {
  assert(
    result.rootDataset.glance === EXPECTED_GLANCE_VERSION &&
      result.rootDataset.hover === EXPECTED_HOVER_VERSION &&
      result.rootDataset.concurrency === EXPECTED_CONCURRENCY_VERSION &&
      result.rootDataset.transient === EXPECTED_TRANSIENT_VERSION &&
      result.rootDataset.scope === "slice4-transition-toast" &&
      Number(result.rootDataset.toastDurationMs) === 2500 &&
      Number(result.rootDataset.toastMaxCount) === 2 &&
      Number(result.rootDataset.toastMaxWidthPx) === 320 &&
      Number(result.rootDataset.toastMaxCanvasWidthRatio) === 0.22 &&
      Number(result.rootDataset.sceneCueMaxWidthPx) === 180 &&
      Number(result.rootDataset.sceneCueMaxHeightPx) === 24 &&
      Number(result.rootDataset.sceneCueFadeInMs) === 200 &&
      Number(result.rootDataset.sceneCuePersistMs) === 2000,
    "Slice 4 transient surface seam and budgets are missing: " +
      JSON.stringify(result.rootDataset)
  );
}

function assertToastCopyAndGeometry(result, config, elapsedMs) {
  const toast = result.visibleToasts[0];
  const sceneCue = result.visibleSceneCues[0];
  const visibleToastText = `${toast.title} ${toast.line} ${toast.text}`;
  const rawWindowHits = FORBIDDEN_RAW_WINDOW_IDS.filter((windowId) =>
    visibleToastText.includes(windowId)
  );
  const unitHits = FORBIDDEN_UNIT_PATTERNS.filter((pattern) =>
    pattern.test(`${toast.text} ${sceneCue.text}`)
  ).map((pattern) => pattern.toString());
  const blockedControlRects = result.controlRects.filter((control) =>
    rectsIntersect(toast.rect, control.rect)
  );
  const blockedGlyphRects = result.glyphRects.filter((glyph) =>
    rectsIntersect(toast.rect, glyph.rect)
  );
  const activeMarks = result.sequenceRail.marks.filter(
    (mark) => mark.active === "true"
  );
  const nextMarks = result.sequenceRail.marks.filter(
    (mark) => mark.next === "true"
  );

  assert(
    elapsedMs <= 250,
    `${config.windowId} toast and scene cue must appear within 250ms: ` +
      JSON.stringify({ elapsedMs })
  );
  assert(
    result.visibleToasts.length === 1 &&
      result.visibleSceneCues.length === 1 &&
      result.toastStack.count === 1,
    `${config.windowId} must render exactly one toast and one scene cue: ` +
      JSON.stringify({
        visibleToasts: result.visibleToasts,
        visibleSceneCues: result.visibleSceneCues,
        toastStack: result.toastStack
      })
  );
  assert(
    toast.title === config.title &&
      toast.line === config.line &&
      toast.text === `${config.title} ${config.line}` &&
      toast.windowId === config.windowId &&
      Number(toast.durationMs) === 2500,
    `${config.windowId} toast copy must match Slice 0 storyboard exactly: ` +
      JSON.stringify(toast)
  );
  assert(
    rawWindowHits.length === 0 && unitHits.length === 0,
    `${config.windowId} toast/cue leaked raw window ids or measured metric text: ` +
      JSON.stringify({ rawWindowHits, unitHits, toast, sceneCue })
  );
  assert(
    toast.rect.width <= 320.5 &&
      toast.rect.width <= result.viewport.width * 0.22 + 1 &&
      toast.rect.height <= 72.5,
    `${config.windowId} toast exceeds 320x72 or 22% canvas-width budget: ` +
      JSON.stringify({ toast: toast.rect, viewport: result.viewport })
  );
  assert(
    sceneCue.text === config.sceneCue &&
      sceneCue.cueText === config.sceneCue &&
      sceneCue.windowId === config.windowId &&
      sceneCue.rect.width <= 180.5 &&
      sceneCue.rect.height <= 24.5,
    `${config.windowId} scene cue must use the Slice 0 micro-cue budget and copy: ` +
      JSON.stringify(sceneCue)
  );
  assert(
    blockedControlRects.length === 0 && blockedGlyphRects.length === 0,
    `${config.windowId} toast must not overlap controls, sequence rail, or glyph chips: ` +
      JSON.stringify({
        toast: toast.rect,
        blockedControlRects,
        blockedGlyphRects
      })
  );
  assert(
    result.sequenceRail.activeWindowId === config.windowId &&
      result.sequenceRail.nextWindowId === config.nextWindowId &&
      activeMarks.length === 1 &&
      activeMarks[0].windowId === config.windowId &&
      nextMarks.length === 1 &&
      nextMarks[0].windowId === config.nextWindowId,
    `${config.windowId} must keep sequence rail active/next synchronized: ` +
      JSON.stringify({
        sequenceRail: result.sequenceRail,
        activeMarks,
        nextMarks
      })
  );
  assert(
    result.status.role === "status" &&
      result.status.ariaLive === "polite" &&
      result.status.ariaAtomic === "true" &&
      result.status.ariaWindowId === config.windowId &&
      result.status.ariaText === `${config.title}. ${config.line}` &&
      result.status.ariaTriggered === "true",
    `${config.windowId} must mirror toast copy through the ARIA status region: ` +
      JSON.stringify(result.status)
  );
}

function assertScreenshotEvidence(absolutePath) {
  const stats = statSync(absolutePath);

  assert(
    stats.size > 20_000,
    `Screenshot is unexpectedly small: ${JSON.stringify({
      path: path.relative(repoRoot, absolutePath),
      size: stats.size
    })}`
  );
}

async function captureToastWindow(client, config) {
  await waitForNoToast(client, `before-${config.windowId}`);
  const transition = await triggerTransition(client, config);
  let result = transition.result;
  const elapsedMs = transition.elapsedMs;

  assertPreservedInvariants(result);
  assertTransientSeam(result);
  assertToastCopyAndGeometry(result, config, elapsedMs);
  await sleep(120);

  const screenshotPath = await captureScreenshot(
    client,
    outputRoot,
    config.screenshot
  );
  assertScreenshotEvidence(screenshotPath);
  const metadataPath = writeJsonArtifact(outputRoot, config.metadata, {
    viewport: VIEWPORT,
    route: REQUEST_PATH,
    windowId: config.windowId,
    screenshot: path.relative(repoRoot, screenshotPath),
    elapsedMs,
    result
  });

  return {
    windowId: config.windowId,
    screenshot: path.relative(repoRoot, screenshotPath),
    metadata: path.relative(repoRoot, metadataPath),
    elapsedMs,
    toastRect: result.visibleToasts[0].rect,
    sceneCueRect: result.visibleSceneCues[0].rect
  };
}

async function verifyReducedMotion(client) {
  await client.send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }]
  });
  await resetToW1(client);

  const { result, elapsedMs } = await triggerTransition(client, TOAST_WINDOWS[0]);
  const toast = result.visibleToasts[0];
  const sceneCue = result.visibleSceneCues[0];

  assertToastCopyAndGeometry(result, TOAST_WINDOWS[0], elapsedMs);
  assert(
    toast.style.animationName === "none" &&
      toast.style.transform === "none" &&
      sceneCue.style.animationName === "none" &&
      sceneCue.style.transform === "none",
    "Reduced-motion mode must render static toast/cue with no slide animation: " +
      JSON.stringify({
        toastStyle: toast.style,
        sceneCueStyle: sceneCue.style
      })
  );

  await client.send("Emulation.setEmulatedMedia", { features: [] });
  await waitForNoToast(client, "after-reduced-motion");

  return {
    elapsedMs,
    toastStyle: toast.style,
    sceneCueStyle: sceneCue.style
  };
}

async function verifyToastStackCap(client) {
  await resetToW1(client);

  for (const config of TOAST_WINDOWS.slice(0, 3)) {
    await seekReplayRatio(client, config.ratio);
    await sleep(40);
  }

  const result = await inspectRuntime(client, "stack-cap");

  assert(
    result.visibleToasts.length <= 2 &&
      result.toastStack.count <= 2 &&
      result.toastStack.maxCount === 2,
    "Slice 4 toast stack must never exceed two visible toasts: " +
      JSON.stringify({
        toastStack: result.toastStack,
        visibleToasts: result.visibleToasts
      })
  );

  return {
    visibleToastCount: result.visibleToasts.length,
    stack: result.visibleToasts.map((toast) => ({
      windowId: toast.windowId,
      text: toast.text
    }))
  };
}

async function captureW3ConcurrencyBackfill(client) {
  await waitForNoToast(client, "before-w3-concurrency-backfill");
  await seekReplayRatio(client, 0.5);
  await sleep(200);
  // Conv 3 Smoke Softening: Truth button removed; click footer chip with toggle-boundary action
  await evaluateRuntimeValue(
    client,
    `(() => {
      document
        .querySelector("[data-m8a-v47-control-id='details-toggle']")
        ?.click();
      document
        .querySelector("[data-m8a-v47-action='toggle-boundary']")
        ?.click();
    })()`
  );
  await sleep(180);

  const result = await inspectRuntime(client, "w3-concurrency-backfill");

  assert(
    result.stateFacts.activeWindowId === "meo-continuity-hold" &&
      result.stateFacts.disclosure.detailsSheetState === "open" &&
      result.stateFacts.disclosure.boundarySurfaceState === "open",
    "W3 concurrency backfill must capture the approved Slice 3 concurrent inspector at W3: " +
      JSON.stringify({
        activeWindowId: result.stateFacts.activeWindowId,
        disclosure: result.stateFacts.disclosure
      })
  );

  const screenshotPath = await captureScreenshot(
    client,
    outputRoot,
    "v4.11-w3-hold-concurrency-1440x900.png"
  );
  assertScreenshotEvidence(screenshotPath);
  const metadataPath = writeJsonArtifact(
    outputRoot,
    "v4.11-w3-hold-concurrency-1440x900.metadata.json",
    {
      viewport: VIEWPORT,
      route: REQUEST_PATH,
      screenshot: path.relative(repoRoot, screenshotPath),
      result
    }
  );

  return {
    screenshot: path.relative(repoRoot, screenshotPath),
    metadata: path.relative(repoRoot, metadataPath)
  };
}

async function run() {
  ensureOutputRoot(outputRoot);
  const captures = [];
  let reducedMotion = null;
  let stackCap = null;
  let concurrencyBackfill = null;

  await withStaticSmokeBrowser(async ({ client, baseUrl }) => {
    await setViewport(client, VIEWPORT);
    await navigateAndWait(client, baseUrl);
    await resetToW1(client);

    const initial = await inspectRuntime(client, "initial");
    assertPreservedInvariants(initial);
    assertTransientSeam(initial);
    assert(
      initial.visibleToasts.length === 0 &&
        initial.visibleSceneCues.length === 0,
      "Slice 4 transient surfaces must not persist on default W1 load: " +
        JSON.stringify({
          visibleToasts: initial.visibleToasts,
          visibleSceneCues: initial.visibleSceneCues
        })
    );

    for (const config of TOAST_WINDOWS) {
      captures.push(await captureToastWindow(client, config));
      await sleep(2700);
    }

    reducedMotion = await verifyReducedMotion(client);
    stackCap = await verifyToastStackCap(client);
    concurrencyBackfill = await captureW3ConcurrencyBackfill(client);
  });

  const manifestPath = writeJsonArtifact(outputRoot, "capture-manifest.json", {
    route: REQUEST_PATH,
    transientVersion: EXPECTED_TRANSIENT_VERSION,
    captures,
    reducedMotion,
    stackCap,
    concurrencyBackfill
  });

  console.log(
    JSON.stringify(
      {
        status: "passed",
        outputRoot: path.relative(repoRoot, outputRoot),
        manifest: path.relative(repoRoot, manifestPath),
        captures,
        reducedMotion,
        stackCap,
        concurrencyBackfill
      },
      null,
      2
    )
  );
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
