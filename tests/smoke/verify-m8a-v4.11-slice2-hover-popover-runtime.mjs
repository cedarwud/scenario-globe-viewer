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
const outputRoot = path.join(repoRoot, "output/m8a-v4.11-slice2");

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
const EXPECTED_MICRO_CUE = "focus · LEO";
const EXPECTED_HOVER_DELAY_MS = 150;
const EXPECTED_PROVENANCE =
  "TLE: CelesTrak NORAD GP · fetched 2026-04-26 · 13 actors";
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
const HOVER_SCREENSHOTS = [
  {
    windowId: "leo-acquisition-context",
    ratio: 0.1,
    roleToken: "focus",
    screenshot: "v4.11-w1-hover-leo-1440x900.png",
    metadata: "v4.11-w1-hover-leo-1440x900.metadata.json",
    expectedLines: [
      "OneWeb LEO · in focus now",
      "Link quality: strong",
      "Service time: ~22 min"
    ]
  },
  {
    windowId: "meo-continuity-hold",
    ratio: 0.5,
    roleToken: "continuity-hold",
    screenshot: "v4.11-w3-hover-meo-1440x900.png",
    metadata: "v4.11-w3-hover-meo-1440x900.metadata.json",
    expectedLines: [
      "SES O3b mPOWER MEO · continuity hold",
      "Continuity hold ~22 min",
      "New LEO returning soon"
    ]
  },
  {
    windowId: "leo-reentry-candidate",
    ratio: 0.7,
    roleToken: "re-entry",
    screenshot: "v4.11-w4-hover-leo-1440x900.png",
    metadata: "v4.11-w4-hover-leo-1440x900.metadata.json",
    expectedLines: [
      "OneWeb LEO · candidate",
      "Candidate quality: strong",
      "If switching back: ~22 min"
    ]
  },
  {
    windowId: "geo-continuity-guard",
    ratio: 0.9,
    roleToken: "guard",
    screenshot: "v4.11-w5-hover-geo-1440x900.png",
    metadata: "v4.11-w5-hover-geo-1440x900.metadata.json",
    expectedLines: [
      "Singtel/SES GEO · guard coverage",
      "Always reachable",
      "Sequence ending soon"
    ]
  }
];
const TARGET_KIND_CASES = [
  {
    label: "satellite",
    selector:
      "[data-m8a-v411-hover-target-kind='satellite'][data-m8a-v411-hover-role-token='focus']",
    expectedKind: "satellite",
    expectedLines: HOVER_SCREENSHOTS[0].expectedLines
  },
  {
    label: "ground-station",
    selector:
      "[data-m8a-v411-hover-target-kind='ground-station'][data-m8a-v411-hover-target-id='tw-cht-multi-orbit-ground-infrastructure']",
    expectedKind: "ground-station",
    expectedLines: [
      "Chunghwa Telecom ground station",
      "operator-family precision",
      "LEO MEO GEO three-orbit coverage"
    ]
  },
  {
    label: "sequence-rail",
    selector:
      "[data-m8a-v411-hover-target-kind='sequence-rail'][data-m8a-v411-hover-target-id='leo-acquisition-context']",
    expectedKind: "sequence-rail",
    expectedLines: [
      "Just connected LEO",
      "Service window: ~22 min",
      "Next: signal degrading"
    ]
  }
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
          v411GlanceRankSurface:
            productRoot?.dataset.m8aV411GlanceRankSurface ?? null,
          v411HoverPopover:
            productRoot?.dataset.m8aV411HoverPopover ?? null,
          hasCapture: Boolean(
            window.__SCENARIO_GLOBE_VIEWER_CAPTURE__?.m8aV4GroundStationScene
          )
        };
      })()`
    );

    if (
      lastState?.bootstrapState === "ready" &&
      lastState?.scenePreset === "regional" &&
      lastState?.v411GlanceRankSurface === EXPECTED_GLANCE_VERSION &&
      lastState?.v411HoverPopover === EXPECTED_HOVER_VERSION &&
      lastState?.hasCapture === true
    ) {
      return lastState;
    }

    if (lastState?.bootstrapState === "error") {
      throw new Error(
        `M8A-V4.11 Slice 2 route hit bootstrap error: ${JSON.stringify(
          lastState
        )}`
      );
    }

    await sleep(100);
  }

  throw new Error(
    `M8A-V4.11 Slice 2 did not reach a ready route: ${JSON.stringify(
      lastState
    )}`
  );
}

async function navigateAndWait(client, baseUrl) {
  await client.send("Page.navigate", { url: `${baseUrl}${REQUEST_PATH}` });
  await waitForBootstrapReady(client);
  await waitForGlobeReady(client, "M8A-V4.11 Slice 2");
}

async function seekToWindow(client, ratio, expectedWindowId) {
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
        capture?.m8aV4GroundStationScene?.pause?.();
      }
    })(${JSON.stringify(ratio)})`
  );

  let last = null;

  for (let attempt = 0; attempt < 70; attempt += 1) {
    last = await inspectRuntime(client);

    if (
      last.stateFacts.activeWindowId === expectedWindowId &&
      last.transitionEvent.visible === false
    ) {
      return last;
    }

    await sleep(100);
  }

  throw new Error(
    `Could not settle on ${expectedWindowId} without transition event: ` +
      JSON.stringify({
        activeWindowId: last?.stateFacts?.activeWindowId,
        transitionEvent: last?.transitionEvent
      })
  );
}

async function resetDefaultWindow(client) {
  return await seekToWindow(client, 0.1, "leo-acquisition-context");
}

async function inspectRuntime(client) {
  return await evaluateRuntimeValue(
    client,
    `(() => {
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
        text: element instanceof HTMLElement ? normalize(element.innerText) : ""
      });
      const hoverTargetRecord = (target) => ({
        ...elementRecord(target),
        kind: target.dataset.m8aV411HoverTargetKind ?? null,
        targetId: target.dataset.m8aV411HoverTargetId ?? null,
        windowId: target.dataset.m8aV411HoverWindowId ?? null,
        roleToken: target.dataset.m8aV411HoverRoleToken ?? null,
        lineCount: Number(target.dataset.m8aV411HoverLineCount ?? "0"),
        lines: Array.from({ length: Number(target.dataset.m8aV411HoverLineCount ?? "0") })
          .map((_, index) => target.dataset[\`m8aV411HoverLine\${index + 1}\`] ?? ""),
        tabIndex: target.tabIndex,
        role: target.getAttribute("role"),
        ariaLabel: target.getAttribute("aria-label")
      });
      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      const state = capture?.m8aV4GroundStationScene?.getState?.();
      const productRoot = document.querySelector("[data-m8a-v47-product-ux='true']");
      const annotation = productRoot?.querySelector("[data-m8a-v47-scene-annotation='true']");
      const provenance = productRoot?.querySelector("[data-m8a-v411-provenance-badge='true']");
      const sequenceRail = productRoot?.querySelector("[data-m8a-v410-sequence-rail='true']");
      const sheet = productRoot?.querySelector("[data-m8a-v47-ui-surface='inspection-sheet']");
      const boundarySurface = productRoot?.querySelector("[data-m8a-v410-boundary-surface='true']");
      const transitionEvent = productRoot?.querySelector("[data-m8a-v49-transition-event='true']");
      const details = productRoot?.querySelector("[data-m8a-v47-control-id='details-toggle']");
      const truth = productRoot?.querySelector("[data-m8a-v47-control-id='truth-affordance']");
      const footerBoundaryChip = productRoot?.querySelector("[data-m8a-v47-action='toggle-boundary']");
      const popover = productRoot?.querySelector("[data-m8a-v411-hover-popover='true']");
      const productVisibleText = visibleTextNodes(productRoot).join(" ");
      const hoverTargets = Array.from(
        productRoot?.querySelectorAll("[data-m8a-v411-hover-target='true']") ?? []
      ).map(hoverTargetRecord);
      const popoverLines = Array.from(
        popover?.querySelectorAll("[data-m8a-v411-hover-popover-line]") ?? []
      ).map((line) => normalize(line.textContent));
      const resourceHits = performance
        .getEntriesByType("resource")
        .map((entry) => entry.name)
        .filter((name) => /celestrak|itri\\/multi-orbit/i.test(name));

      return {
        urlPath: window.location.pathname + window.location.search,
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
          v411GlanceRankSurface:
            productRoot?.dataset.m8aV411GlanceRankSurface ?? null,
          sliceScope: productRoot?.dataset.m8aV411SliceScope ?? null,
          hoverPopover: productRoot?.dataset.m8aV411HoverPopover ?? null,
          hoverSliceScope:
            productRoot?.dataset.m8aV411HoverSliceScope ?? null,
          hoverDelayMs: productRoot?.dataset.m8aV411HoverDelayMs ?? null,
          hoverMaxWidthPx:
            productRoot?.dataset.m8aV411HoverPopoverMaxWidthPx ?? null,
          hoverMaxHeightPx:
            productRoot?.dataset.m8aV411HoverPopoverMaxHeightPx ?? null,
          hoverVisible:
            productRoot?.dataset.m8aV411HoverPopoverVisible ?? null,
          pinnedHoverRole:
            productRoot?.dataset.m8aV411PinnedHoverRole ?? null,
          pinnedHoverTargetKind:
            productRoot?.dataset.m8aV411PinnedHoverTargetKind ?? null,
          pinnedHoverTargetId:
            productRoot?.dataset.m8aV411PinnedHoverTargetId ?? null
        },
        visibleProductText: productVisibleText,
        annotation: {
          ...elementRecord(annotation),
          microCueCopy:
            annotation?.dataset.m8aV411SceneMicroCueCopy ?? null
        },
        provenance: elementRecord(provenance),
        sequenceRail: elementRecord(sequenceRail),
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
            truth instanceof HTMLElement ? truth.getAttribute("aria-expanded") : null
        },
        footerBoundaryChip: {
          ...elementRecord(footerBoundaryChip),
          ariaExpanded:
            footerBoundaryChip instanceof HTMLElement
              ? footerBoundaryChip.getAttribute("aria-expanded")
              : null
        },
        sheet: elementRecord(sheet),
        boundarySurface: elementRecord(boundarySurface),
        transitionEvent: elementRecord(transitionEvent),
        popover: {
          ...elementRecord(popover),
          state:
            popover instanceof HTMLElement
              ? popover.dataset.m8aV411HoverState ?? null
              : null,
          kind:
            popover instanceof HTMLElement
              ? popover.dataset.m8aV411HoverTargetKind ?? null
              : null,
          targetId:
            popover instanceof HTMLElement
              ? popover.dataset.m8aV411HoverTargetId ?? null
              : null,
          windowId:
            popover instanceof HTMLElement
              ? popover.dataset.m8aV411HoverWindowId ?? null
              : null,
          roleToken:
            popover instanceof HTMLElement
              ? popover.dataset.m8aV411HoverRoleToken ?? null
              : null,
          lines: popoverLines
        },
        hoverTargets,
        hoverTargetCounts: {
          satellite: hoverTargets.filter((target) => target.kind === "satellite").length,
          groundStation: hoverTargets.filter((target) => target.kind === "ground-station").length,
          sequenceRail: hoverTargets.filter((target) => target.kind === "sequence-rail").length
        },
        forbiddenScopeLeak: {
          transitionToast:
            Boolean(productRoot?.querySelector("[data-m8a-v411-transition-toast]")) ||
            isVisible(transitionEvent),
          sceneCue: /\\bscene cue\\b/i.test(productVisibleText),
          sourcesRole: Boolean(
            productRoot?.querySelector("[data-m8a-v411-sources-role]")
          ),
          r2Listing: /candidate endpoints|r2 listing|read-only catalog/i.test(
            productVisibleText
          ),
          detailsAndTruthConcurrent:
            isVisible(sheet) && isVisible(boundarySurface)
        },
        resourceHits
      };
    })()`
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
    facts.actorCount === 13,
    `Slice 2 actor count must remain 13: ${JSON.stringify(facts)}`
  );
  assert(
    facts.sourceLineage?.projectionRead === EXPECTED_SOURCE_PROJECTION &&
      facts.sourceLineage?.rawPackageSideReadOwnership === "forbidden" &&
      facts.sourceLineage?.rawSourcePathsIncluded === false,
    "Slice 2 must preserve repo-owned projection/module runtime source boundary: " +
      JSON.stringify(facts.sourceLineage)
  );
  assertListEquals(
    facts.timelineWindowIds,
    EXPECTED_SEQUENCE_WINDOW_IDS,
    "Slice 2 V4.6D window order"
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

function assertSlice1SurfacePreserved(result) {
  assert(
    result.rootDataset.v411GlanceRankSurface === EXPECTED_GLANCE_VERSION &&
      result.rootDataset.sliceScope === "slice1-glance-rank-surface",
    "Slice 2 must preserve Slice 1 root seam: " +
      JSON.stringify(result.rootDataset)
  );
  assert(
    result.annotation.visible &&
      result.annotation.microCueCopy === EXPECTED_MICRO_CUE &&
      result.annotation.text === EXPECTED_MICRO_CUE &&
      result.annotation.rect.width <= 180.5 &&
      result.annotation.rect.height <= 24.5,
    "Slice 2 must not move or resize the Slice 1 micro-cue: " +
      JSON.stringify(result.annotation)
  );
  // Conv 3 Smoke Softening: corner badge is a ≤24×24 invisible placeholder; footer chip has TLE content
  assert(
    result.provenance.exists && result.provenance.visible === false,
    "Slice 2 corner badge must be a ≤24×24 invisible placeholder (Conv 3 Softening): " +
      JSON.stringify(result.provenance)
  );
  assert(
    result.sequenceRail.visible,
    "Slice 2 must preserve the existing sequence rail: " +
      JSON.stringify(result.sequenceRail)
  );
}

function assertHoverSurfaceMounted(result) {
  assert(
    result.rootDataset.hoverPopover === EXPECTED_HOVER_VERSION &&
      result.rootDataset.hoverSliceScope === "slice2-hover-popover" &&
      Number(result.rootDataset.hoverDelayMs) === EXPECTED_HOVER_DELAY_MS &&
      Number(result.rootDataset.hoverMaxWidthPx) === 240 &&
      Number(result.rootDataset.hoverMaxHeightPx) === 140,
    "Slice 2 hover seam and budgets are missing: " +
      JSON.stringify(result.rootDataset)
  );
  assert(
    result.popover.exists &&
      result.popover.hidden === true &&
      result.popover.visible === false,
    "Slice 2 popover must mount hidden by default: " +
      JSON.stringify(result.popover)
  );
  assert(
    result.hoverTargetCounts.satellite === 13 &&
      result.hoverTargetCounts.groundStation === 2 &&
      result.hoverTargetCounts.sequenceRail === 5,
    "Slice 2 must expose satellite, ground-station, and sequence-rail hover targets: " +
      JSON.stringify(result.hoverTargetCounts)
  );
  assert(
    result.hoverTargets.every(
      (target) =>
        target.tabIndex === 0 &&
        target.role === "button" &&
        target.lineCount === 3 &&
        target.ariaLabel
    ),
    "Slice 2 (Conv 2 phase-specific 3-line) hover targets must be keyboard focusable with exactly 3 lines: " +
      JSON.stringify(result.hoverTargets)
  );
}

function assertForbiddenClaimScan(result, label) {
  const searchableText = [
    result.visibleProductText,
    result.annotation.text,
    result.provenance.text,
    result.popover.text,
    ...result.hoverTargets.flatMap((target) => target.lines)
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
    `${label} must not fetch raw customer packages or live external source resources: ` +
      JSON.stringify(result.resourceHits)
  );
}

function assertNoSlice3ScopeLeak(result, label) {
  assert(
    result.forbiddenScopeLeak.r2Listing === false,
    `${label} leaked visible R2 listing into the Slice 2 surface: ` +
      JSON.stringify(result.forbiddenScopeLeak)
  );
}

async function getTargetCenter(client, selector) {
  const result = await evaluateRuntimeValue(
    client,
    `((selector) => {
      const target = document.querySelector(selector);

      if (!(target instanceof HTMLElement)) {
        return { exists: false };
      }

      const style = getComputedStyle(target);
      const rect = target.getBoundingClientRect();
      const visible =
        target.hidden !== true &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity) > 0 &&
        rect.width > 0 &&
        rect.height > 0;

      return {
        exists: true,
        visible,
        center: {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        },
        rect: {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height
        },
        kind: target.dataset.m8aV411HoverTargetKind ?? null,
        targetId: target.dataset.m8aV411HoverTargetId ?? null,
        roleToken: target.dataset.m8aV411HoverRoleToken ?? null
      };
    })(${JSON.stringify(selector)})`
  );

  assert(
    result.exists && result.visible,
    `Hover target is missing or not visible for ${selector}: ` +
      JSON.stringify(result)
  );

  return result;
}

async function waitForPopoverVisible(client, startedAt, label) {
  let last = null;

  while (true) {
    last = await inspectRuntime(client);

    if (last.popover.visible && last.popover.state === "visible") {
      const visibleAt = await evaluateRuntimeValue(client, "performance.now()");
      return {
        inspection: last,
        visibleAt,
        elapsedMs: visibleAt - startedAt
      };
    }

    const now = await evaluateRuntimeValue(client, "performance.now()");

    if (now - startedAt > 200) {
      break;
    }

    await sleep(8);
  }

  throw new Error(
    `${label} popover did not become visible within 200ms: ` +
      JSON.stringify({
        popover: last?.popover,
        rootDataset: last?.rootDataset
      })
  );
}

async function hoverTarget(client, selector, label) {
  const target = await getTargetCenter(client, selector);
  const startedAt = await evaluateRuntimeValue(client, "performance.now()");

  await client.send("Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x: target.center.x,
    y: target.center.y
  });
  await sleep(120);

  const early = await inspectRuntime(client);

  assert(
    early.popover.visible === false,
    `${label} popover must not show before the 150ms hover delay: ` +
      JSON.stringify(early.popover)
  );

  const visible = await waitForPopoverVisible(client, startedAt, label);

  assert(
    visible.elapsedMs >= 140,
    `${label} popover appeared before the 150ms hover contract: ` +
      JSON.stringify({ elapsedMs: visible.elapsedMs })
  );

  return visible.inspection;
}

async function leaveHoverTarget(client, label) {
  await client.send("Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x: 2,
    y: 2
  });
  await sleep(40);

  const leaving = await inspectRuntime(client);

  assert(
    leaving.popover.hidden === true || leaving.popover.state === "leaving",
    `${label} popover must begin fading when cursor leaves: ` +
      JSON.stringify(leaving.popover)
  );
  await sleep(260);

  const afterFade = await inspectRuntime(client);

  assert(
    afterFade.popover.hidden === true &&
      afterFade.popover.visible === false &&
      afterFade.rootDataset.hoverVisible === "false",
    `${label} popover must not remain after leave fade: ` +
      JSON.stringify(afterFade.popover)
  );

  return afterFade;
}

function assertPopover(result, expected) {
  assert(
    result.popover.visible &&
      result.popover.kind === expected.expectedKind &&
      result.popover.rect.width <= 240.5 &&
      result.popover.rect.height <= 140.5,
    `${expected.label} popover must be visible within the Slice 2 geometry budget: ` +
      JSON.stringify(result.popover)
  );
  assertListEquals(
    result.popover.lines,
    expected.expectedLines,
    `${expected.label} hover popover copy`
  );
}

async function verifyHoverTargetKind(client, hoverCase) {
  const result = await hoverTarget(client, hoverCase.selector, hoverCase.label);
  assertPopover(result, hoverCase);
  await leaveHoverTarget(client, hoverCase.label);
  return result;
}

async function verifyKeyboardFocusAndEscape(client) {
  let focused = null;

  for (let attempt = 0; attempt < 60; attempt += 1) {
    const startedAt = await evaluateRuntimeValue(client, "performance.now()");

    await client.send("Input.dispatchKeyEvent", {
      type: "keyDown",
      key: "Tab",
      code: "Tab",
      windowsVirtualKeyCode: 9,
      nativeVirtualKeyCode: 9
    });
    await client.send("Input.dispatchKeyEvent", {
      type: "keyUp",
      key: "Tab",
      code: "Tab",
      windowsVirtualKeyCode: 9,
      nativeVirtualKeyCode: 9
    });
    await sleep(20);

    const active = await evaluateRuntimeValue(
      client,
      `(() => {
        const activeElement = document.activeElement;
        const target = activeElement instanceof Element
          ? activeElement.closest("[data-m8a-v411-hover-target='true']")
          : null;

        if (!(target instanceof HTMLElement)) {
          return {
            isHoverTarget: false,
            activeTag: activeElement?.tagName ?? null,
            activeText:
              activeElement instanceof HTMLElement
                ? activeElement.innerText?.replace(/\\s+/g, " ").trim() ?? ""
                : ""
          };
        }

        const count = Number(target.dataset.m8aV411HoverLineCount ?? "0");

        return {
          isHoverTarget: true,
          kind: target.dataset.m8aV411HoverTargetKind ?? null,
          targetId: target.dataset.m8aV411HoverTargetId ?? null,
          lines: Array.from({ length: count }).map(
            (_, index) => target.dataset[\`m8aV411HoverLine\${index + 1}\`] ?? ""
          ),
          focusVisible: target.matches(":focus-visible")
        };
      })()`
    );

    if (!active.isHoverTarget) {
      continue;
    }

    focused = await waitForPopoverVisible(
      client,
      startedAt,
      `keyboard focus ${active.kind}:${active.targetId}`
    );

    assert(
      active.focusVisible === true,
      "Keyboard Tab focus must apply focus-visible on the hover target: " +
        JSON.stringify(active)
    );
    assertPopover(focused.inspection, {
      label: "keyboard focus",
      expectedKind: active.kind,
      expectedLines: active.lines
    });
    break;
  }

  assert(focused, "Tab did not reach any Slice 2 hover target.");

  await client.send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key: "Escape",
    code: "Escape",
    windowsVirtualKeyCode: 27,
    nativeVirtualKeyCode: 27
  });
  await client.send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key: "Escape",
    code: "Escape",
    windowsVirtualKeyCode: 27,
    nativeVirtualKeyCode: 27
  });
  await sleep(60);

  const dismissed = await inspectRuntime(client);

  assert(
    dismissed.popover.hidden === true && dismissed.popover.visible === false,
    "Escape must dismiss a keyboard-triggered Slice 2 popover: " +
      JSON.stringify(dismissed.popover)
  );

  return dismissed;
}

async function verifyClickPinsStateEvidence(client) {
  const selector = TARGET_KIND_CASES[0].selector;

  await evaluateRuntimeValue(
    client,
    `((selector) => {
      const target = document.querySelector(selector);

      if (!(target instanceof HTMLElement)) {
        throw new Error("Missing click-to-pin hover target.");
      }

      target.click();
    })(${JSON.stringify(selector)})`
  );
  await sleep(160);

  const result = await inspectRuntime(client);

  assert(
    result.sheet.visible === true &&
      result.boundarySurface.visible === false &&
      result.details.ariaExpanded === "true" &&
      result.truth.exists === false &&
      result.footerBoundaryChip.ariaExpanded === "false" &&
      result.stateFacts.disclosure.detailsSheetState === "open" &&
      result.stateFacts.disclosure.boundarySurfaceState === "closed" &&
      result.rootDataset.pinnedHoverRole === "state-evidence" &&
      result.rootDataset.pinnedHoverTargetKind === "satellite",
    "Click-to-pin must open only the existing State Evidence Details inspector: " +
      JSON.stringify({
        sheet: result.sheet,
        boundarySurface: result.boundarySurface,
        details: result.details,
        truth: result.truth,
        footerBoundaryChip: result.footerBoundaryChip,
        disclosure: result.stateFacts.disclosure,
        rootDataset: result.rootDataset
      })
  );

  await evaluateRuntimeValue(
    client,
    `(() => {
      document
        .querySelector("[data-m8a-v47-control-id='details-close']")
        ?.click();
    })()`
  );
  await sleep(120);

  return result;
}

async function captureHoverScreenshot(client, config) {
  await seekToWindow(client, config.ratio, config.windowId);
  const selector =
    `[data-m8a-v411-hover-target-kind='satellite']` +
    `[data-m8a-v411-hover-window-id='${config.windowId}']` +
    `[data-m8a-v411-hover-role-token='${config.roleToken}']`;
  const result = await hoverTarget(client, selector, config.screenshot);

  assertListEquals(
    result.popover.lines,
    config.expectedLines,
    `${config.screenshot} hover lines`
  );

  const screenshotPath = await captureScreenshot(
    client,
    outputRoot,
    config.screenshot
  );
  const metadataPath = writeJsonArtifact(outputRoot, config.metadata, {
    viewport: VIEWPORT,
    route: REQUEST_PATH,
    windowId: config.windowId,
    screenshot: path.relative(repoRoot, screenshotPath),
    result
  });

  await leaveHoverTarget(client, config.screenshot);

  return {
    windowId: config.windowId,
    screenshot: path.relative(repoRoot, screenshotPath),
    metadata: path.relative(repoRoot, metadataPath),
    popoverRect: result.popover.rect,
    popoverLines: result.popover.lines
  };
}

async function run() {
  ensureOutputRoot(outputRoot);
  const captures = [];
  const hoverChecks = [];

  await withStaticSmokeBrowser(async ({ client, baseUrl }) => {
    await setViewport(client, VIEWPORT);
    await navigateAndWait(client, baseUrl);
    const initial = await resetDefaultWindow(client);

    assertPreservedInvariants(initial);
    assertSlice1SurfacePreserved(initial);
    assertHoverSurfaceMounted(initial);
    assertNoSlice3ScopeLeak(initial, "initial");
    assertForbiddenClaimScan(initial, "initial");

    for (const hoverCase of TARGET_KIND_CASES) {
      const result = await verifyHoverTargetKind(client, hoverCase);
      hoverChecks.push({
        label: hoverCase.label,
        kind: result.popover.kind,
        rect: result.popover.rect,
        lines: result.popover.lines
      });
    }

    hoverChecks.push({
      label: "keyboard-focus-escape",
      result: await verifyKeyboardFocusAndEscape(client)
    });
    hoverChecks.push({
      label: "click-to-pin-state-evidence",
      result: await verifyClickPinsStateEvidence(client)
    });

    for (const config of HOVER_SCREENSHOTS) {
      captures.push(await captureHoverScreenshot(client, config));
    }

    const finalInspection = await inspectRuntime(client);

    assertPreservedInvariants(finalInspection);
    assertNoSlice3ScopeLeak(finalInspection, "final");
    assertForbiddenClaimScan(finalInspection, "final");

    const manifestPath = writeJsonArtifact(outputRoot, "capture-manifest.json", {
      route: REQUEST_PATH,
      glanceVersion: EXPECTED_GLANCE_VERSION,
      hoverVersion: EXPECTED_HOVER_VERSION,
      hoverChecks,
      captures
    });

    console.log(
      JSON.stringify(
        {
          status: "passed",
          outputRoot: path.relative(repoRoot, outputRoot),
          manifest: path.relative(repoRoot, manifestPath),
          captures,
          hoverChecks: hoverChecks.map((check) => ({
            label: check.label,
            kind: check.kind ?? null,
            rect: check.rect ?? null,
            lines: check.lines ?? null
          }))
        },
        null,
        2
      )
    );
  });
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
