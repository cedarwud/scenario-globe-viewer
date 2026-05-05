import { mkdirSync, statSync, writeFileSync } from "node:fs";
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
const outputRoot = path.join(repoRoot, "output/m8a-v4.10-slice4");

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
const EXPECTED_INSPECTOR_STRUCTURE = [
  "current-replay-event-evidence",
  "sequence-selected-window-context",
  "source-and-boundary-notes",
  "not-being-claimed"
];
const EXPECTED_BOUNDARY_VISIBLE_CONTENT = [
  "compact-boundary-line",
  "focused-boundary-surface",
  "full-truth-disclosure",
  "details-independent-state"
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
    width: 1440,
    height: 900,
    expectedViewportClass: "desktop",
    screenshot: "v4.10-slice4-default-1440x900.png",
    metadata: "v4.10-slice4-default-1440x900.metadata.json",
    action: "default"
  },
  {
    name: "default-390x844",
    width: 390,
    height: 844,
    expectedViewportClass: "narrow",
    screenshot: "v4.10-slice4-default-390x844.png",
    metadata: "v4.10-slice4-default-390x844.metadata.json",
    action: "default"
  },
  {
    name: "details-open-1440x900",
    width: 1440,
    height: 900,
    expectedViewportClass: "desktop",
    screenshot: "v4.10-slice4-details-open-1440x900.png",
    metadata: "v4.10-slice4-details-open-1440x900.metadata.json",
    action: "details"
  },
  {
    name: "boundary-open-1440x900",
    width: 1440,
    height: 900,
    expectedViewportClass: "desktop",
    screenshot: "v4.10-slice4-boundary-open-1440x900.png",
    metadata: "v4.10-slice4-boundary-open-1440x900.metadata.json",
    action: "boundary"
  }
];
const SEQUENCE_RATIO_CHECKS = [
  { ratio: 0.1, active: "leo-acquisition-context", next: "leo-aging-pressure" },
  { ratio: 0.25, active: "leo-aging-pressure", next: "meo-continuity-hold" },
  { ratio: 0.45, active: "meo-continuity-hold", next: "leo-reentry-candidate" },
  { ratio: 0.7, active: "leo-reentry-candidate", next: "geo-continuity-guard" },
  { ratio: 0.9, active: "geo-continuity-guard", next: "leo-acquisition-context" }
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

// §Smoke Softening Disclosure: Correction A supersedes the legacy first-read
// layout, but Slice 4 does not carry the old strip-left baseline assertion.
// This smoke keeps its inspector/evidence successor coverage and retains route,
// endpoint, precision, actor, source-boundary, and forbidden-claim invariants.

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

function collectPositiveClaimHits(text) {
  const sourceText = String(text ?? "");
  const lowered = sourceText.toLowerCase();
  const hits = [];
  const isNegated = (index) => {
    const prefix = sourceText
      .slice(Math.max(0, index - 140), index)
      .toLowerCase();

    return /\b(no|not|without|forbidden|must not|does not claim|not claimed|non-claim)\b/.test(
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
            .slice(Math.max(0, index - 80), index + needle.length + 80)
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

function assertListEquals(actual, expected, label) {
  assert(
    JSON.stringify(actual) === JSON.stringify(expected),
    `${label} mismatch: ${JSON.stringify({ actual, expected })}`
  );
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
            root?.dataset.m8aV410FirstViewportComposition ?? null,
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
      lastState?.inspectorEvidence === EXPECTED_V410_INSPECTOR &&
      lastState?.hasCapture === true
    ) {
      return lastState;
    }

    if (lastState?.bootstrapState === "error") {
      throw new Error(
        `M8A-V4.10 Slice 4 route hit bootstrap error: ${JSON.stringify(
          lastState
        )}`
      );
    }

    await sleep(100);
  }

  throw new Error(
    `M8A-V4.10 Slice 4 did not reach a ready route: ${JSON.stringify(
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
    `M8A-V4.10 Slice 4 globe did not settle: ${JSON.stringify(lastState)}`
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
      const control = document.querySelector(
        \`[data-m8a-v47-control-id="\${controlId}"]\`
      );

      if (!(control instanceof HTMLButtonElement)) {
        throw new Error(\`Missing control \${controlId}.\`);
      }

      control.click();
    })(${JSON.stringify(controlId)})`
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
      const details = productRoot?.querySelector("[data-m8a-v47-control-id='details-toggle']");
      // Conv 3 Smoke Softening: truth-affordance button removed; footer chip with toggle-boundary replaces it
      const truth = productRoot?.querySelector("[data-m8a-v47-control-id='truth-affordance']");
      const footerBoundaryChip = productRoot?.querySelector("[data-m8a-v47-action='toggle-boundary']");
      const sheet = productRoot?.querySelector("[data-m8a-v47-ui-surface='inspection-sheet']");
      const boundarySurface = productRoot?.querySelector("[data-m8a-v410-boundary-surface='true']");
      const inspectorPrimary = productRoot?.querySelector("[data-m8a-v49-inspector-primary-body='true']");
      const inspectorTitle = sheet?.querySelector("[data-m8a-v410-inspector-title='true']");
      const inspectorLead = sheet?.querySelector("[data-m8a-v410-inspector-lead='true']");
      const debugEvidence = sheet?.querySelector("[data-m8a-v49-debug-evidence='true']");
      const fullTruth = sheet?.querySelector("[data-m8a-v49-truth-boundary-details='true']");
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
          inspectorNotClaimedContent: listDataset(
            productRoot?.dataset.m8aV410InspectorNotClaimedContent
          ),
          inspectorSurfaceSeparation:
            productRoot?.dataset.m8aV410InspectorSurfaceSeparation ?? null,
          sequenceRail:
            productRoot?.dataset.m8aV410HandoverSequenceRail ?? null,
          boundaryAffordance:
            productRoot?.dataset.m8aV410BoundaryAffordance ?? null,
          boundaryVisibleContent: listDataset(
            productRoot?.dataset.m8aV410BoundaryVisibleContent
          ),
          detailsSheetState:
            productRoot?.dataset.m8aV410DetailsSheetState ?? null,
          boundarySurfaceState:
            productRoot?.dataset.m8aV410BoundarySurfaceState ?? null
        },
        sceneNarrative: elementRecord(sceneNarrative),
        strip: elementRecord(strip),
        sequenceRail: {
          ...elementRecord(sequenceRail),
          version:
            sequenceRail?.dataset.m8aV410HandoverSequenceRail ?? null,
          windowIds: listDataset(
            sequenceRail?.dataset.m8aV410SequenceRailWindowIds
          ),
          activeWindowId:
            sequenceRail?.dataset.m8aV410SequenceRailActiveWindowId ?? null,
          nextWindowId:
            sequenceRail?.dataset.m8aV410SequenceRailNextWindowId ?? null,
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
        // Conv 3: footer chip replaces Truth button as toggle-boundary owner
        footerBoundaryChip: {
          ...elementRecord(footerBoundaryChip),
          ariaExpanded:
            footerBoundaryChip instanceof HTMLElement
              ? footerBoundaryChip.getAttribute("aria-expanded")
              : null,
          compactCopy:
            footerBoundaryChip instanceof HTMLElement
              ? footerBoundaryChip.dataset.m8aV410BoundaryCompactCopy ?? null
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
            notClaimedContent: listDataset(
              inspectorPrimary?.dataset.m8aV410InspectorNotClaimedContent
            ),
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
          primaryLabels: primarySections.map((section) =>
            normalize(section.querySelector("span")?.textContent)
          ),
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
          fullTruth: {
            visible: isVisible(fullTruth),
            open:
              fullTruth instanceof HTMLDetailsElement ? fullTruth.open : null,
            text: normalize(fullTruth?.textContent),
            visibleText:
              fullTruth instanceof HTMLElement
                ? visibleTextNodes(fullTruth).join(" ")
                : ""
          }
        },
        boundarySurface: elementRecord(boundarySurface),
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
    "Slice 4 must preserve route, endpoint pair, precision, and V4.6D truth: " +
      JSON.stringify({ urlPath: result.urlPath, facts })
  );
  assertListEquals(
    facts.orbitActorCounts,
    EXPECTED_ACTOR_COUNTS,
    "Slice 4 actor set"
  );
  assertListEquals(
    facts.timelineWindowIds,
    EXPECTED_SEQUENCE_WINDOW_IDS,
    "Slice 4 V4.6D window order"
  );
  assert(
    facts.sourceLineage?.projectionRead === EXPECTED_SOURCE_PROJECTION &&
      facts.sourceLineage?.rawPackageSideReadOwnership === "forbidden" &&
      facts.sourceLineage?.rawSourcePathsIncluded === false &&
      result.resourceHits.length === 0,
    "Slice 4 must keep repo-owned projection/module source boundary: " +
      JSON.stringify({ sourceLineage: facts.sourceLineage, resourceHits: result.resourceHits })
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
}

function assertSceneNarrativeAndRail(result, viewport) {
  const activeWindowId = result.stateFacts.activeWindowId;
  const copy = EXPECTED_COPY[activeWindowId];
  const expectedMicroCue = EXPECTED_SLICE1_MICRO_CUES[activeWindowId];
  const activeMarks = result.sequenceRail.marks.filter(
    (mark) => mark.active === "true"
  );
  const nextMarks = result.sequenceRail.marks.filter(
    (mark) => mark.next === "true"
  );

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
      result.stateFacts.firstViewportComposition?.version ===
        EXPECTED_V410_FIRST_VIEWPORT,
    "Slice 1 first viewport composition seam regressed: " +
      JSON.stringify(result.rootDataset)
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
    `${viewport.name} must keep the Slice 1 scene narrative visible: ` +
      JSON.stringify(result.sceneNarrative)
  );
  assert(
    result.sequenceRail.visible &&
      result.sequenceRail.version === EXPECTED_V410_SEQUENCE_RAIL &&
      result.stateFacts.handoverSequenceRail?.version ===
        EXPECTED_V410_SEQUENCE_RAIL,
    `${viewport.name} must keep the Slice 2 sequence rail visible: ` +
      JSON.stringify(result.sequenceRail)
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
      activeMarks[0].windowId === activeWindowId &&
      nextMarks.length === 1,
    `${viewport.name} sequence rail must keep five ordered active/next marks: ` +
      JSON.stringify(result.sequenceRail.marks)
  );
  assertRectInsideViewport(
    result.sceneNarrative.rect,
    viewport,
    "scene narrative"
  );
  assertRectInsideViewport(result.sequenceRail.rect, viewport, "sequence rail");
  assertRectInsideViewport(result.strip.rect, viewport, "secondary controls");
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
      // Conv 3 Smoke Softening: footer chip replaces Truth button; check footer chip
      result.footerBoundaryChip.ariaExpanded === "false",
    `${viewport.name} must keep Details and focused boundary surfaces closed by default: ` +
      JSON.stringify({
        stateFacts: result.stateFacts,
        details: result.details,
        footerBoundaryChip: result.footerBoundaryChip,
        sheet: result.sheet,
        boundarySurface: result.boundarySurface
      })
  );
}

function assertBoundaryAffordanceIndependent(result) {
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
  // Conv 3 Smoke Softening: Truth button removed; footer chip with toggle-boundary replaces it
  assert(
    result.footerBoundaryChip.visible &&
      result.footerBoundaryChip.exists,
    "Default view must show footer chip with toggle-boundary action (Conv 3 Truth removal): " +
      JSON.stringify(result.footerBoundaryChip)
  );
  assert(
    !result.truth.exists,
    "Truth button must not exist after Conv 3 removal: " +
      JSON.stringify(result.truth)
  );
}

function assertDetailsOpenEvidenceInspector(result, viewport) {
  const groupIds = result.inspector.groups.map((group) => group.group);
  const visibleInspectorText = [
    result.sheet.title,
    result.sheet.lead,
    result.inspector.visibleText
  ].join(" ");
  const v411StateEvidenceInspector =
    result.inspector.primarySections["current-state"]?.includes(
      "State Evidence"
    ) &&
    result.inspector.primarySections["current-state"]?.includes(
      "LEO review focus"
    ) &&
    result.inspector.primarySections["current-state"]?.includes(
      "The simulation review is currently anchored on the OneWeb LEO context marked as the focus role."
    );

  // Conv 3 Smoke Softening: footer chip ariaExpanded instead of Truth button
  assert(
    result.stateFacts.detailsSheetState === "open" &&
      result.stateFacts.boundarySurfaceState === "closed" &&
      result.rootDataset.detailsSheetState === "open" &&
      result.rootDataset.boundarySurfaceState === "closed" &&
      result.details.ariaExpanded === "true" &&
      result.footerBoundaryChip.ariaExpanded === "false" &&
      result.sheet.visible &&
      result.boundarySurface.visible === false,
    "Details must open only the evidence inspector and keep boundary closed: " +
      JSON.stringify({
        stateFacts: result.stateFacts,
        rootDataset: result.rootDataset,
        details: result.details,
        footerBoundaryChip: result.footerBoundaryChip,
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
  assertListEquals(
    result.sheet.dataset.inspectorStructure,
    EXPECTED_INSPECTOR_STRUCTURE,
    "Slice 4 sheet inspector evidence structure"
  );
  if (!v411StateEvidenceInspector) {
    assertListEquals(
      groupIds,
      EXPECTED_INSPECTOR_STRUCTURE,
      "Slice 4 visible inspector groups"
    );
  }
  assert(
    (result.sheet.title === "Evidence inspector" ||
      result.sheet.title === "Inspector") &&
      result.rootDataset.inspectorFirstReadRole ===
        "secondary-evidence-inspector" &&
      !/handover review|operator log|claim panel|mission narrative|primary product narrative/i.test(
        result.sheet.title
      ),
    "Inspector first eye must read as secondary evidence, not narrative/operator-log UI: " +
      JSON.stringify({ title: result.sheet.title, lead: result.sheet.lead })
  );
  if (v411StateEvidenceInspector) {
    assert(
      result.inspector.primarySections["current-state"]?.includes(
        "Endpoint precision remains operator-family only and no active gateway is being claimed."
      ) &&
        result.inspector.fullTruth.visible === false,
      "V4.11 State Evidence role must preserve Slice 4 evidence orientation without opening Truth Boundary: " +
        JSON.stringify({
          primarySections: result.inspector.primarySections,
          fullTruth: result.inspector.fullTruth
        })
    );
  } else {
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
      "Inspector must distinguish event evidence, sequence context, source/boundary, and non-claims: " +
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
      /Implementation evidence/i.test(result.inspector.debugEvidence.visibleText) &&
      /Raw ids/.test(result.inspector.debugEvidence.text),
    "Implementation evidence must remain collapsed but inspectable: " +
      JSON.stringify(result.inspector.debugEvidence)
  );
  if (!v411StateEvidenceInspector) {
    assert(
      result.inspector.fullTruth.visible &&
        result.inspector.fullTruth.open === false &&
        /Full truth boundary/i.test(result.inspector.fullTruth.visibleText),
      "Full truth boundary must remain secondary inside Details: " +
        JSON.stringify(result.inspector.fullTruth)
    );
  }
  assertForbiddenClaimsClean(visibleInspectorText, "Slice 4 visible inspector");
  assertRectInsideViewport(result.sheet.rect, viewport, "details inspector");
  assert(
    !rectsOverlap(result.sheet.rect, result.strip.rect),
    "Details inspector must not cover secondary controls: " +
      JSON.stringify({ sheet: result.sheet.rect, strip: result.strip.rect })
  );
}

function assertBoundaryOpenOnly(result, viewport) {
  // Conv 3 Smoke Softening: footer chip ariaExpanded replaces Truth button ariaExpanded
  const v411SharedTruthBoundary =
    result.stateFacts.detailsSheetState === "closed" &&
    result.stateFacts.boundarySurfaceState === "open" &&
    result.rootDataset.detailsSheetState === "closed" &&
    result.rootDataset.boundarySurfaceState === "open" &&
    result.details.ariaExpanded === "false" &&
    result.footerBoundaryChip.ariaExpanded === "true" &&
    result.sheet.visible === true &&
    result.inspector.fullTruth.visible === true &&
    result.inspector.fullTruth.open === null;

  if (v411SharedTruthBoundary) {
    assert(
      result.boundarySurface.visible !== true &&
        /Truth Boundary/.test(result.inspector.fullTruth.text) &&
        /Truth boundary/.test(result.inspector.fullTruth.text) &&
        /not an operator handover log/.test(result.inspector.fullTruth.text) &&
        /No active gateway assignment is claimed/.test(
          result.inspector.fullTruth.text
        ) &&
        /No native RF handover is claimed/.test(
          result.inspector.fullTruth.text
        ) &&
        /Simulation review - not operator log/.test(result.boundarySurface.text) &&
        /No active satellite, gateway, path, or measured metric claim/.test(
          result.boundarySurface.text
        ),
      "V4.11 shared Truth Boundary role must preserve Slice 3 truth evidence without showing the old focused surface: " +
        JSON.stringify({
          fullTruth: result.inspector.fullTruth,
          boundarySurface: result.boundarySurface
        })
    );
    assertForbiddenClaimsClean(
      result.inspector.fullTruth.visibleText,
      "Slice 4 V4.11 shared truth boundary"
    );
    assertRectInsideViewport(result.sheet.rect, viewport, "shared truth inspector");
    return;
  }

  // Conv 3 Smoke Softening: footer chip ariaExpanded replaces Truth button
  assert(
    result.stateFacts.detailsSheetState === "closed" &&
      result.stateFacts.boundarySurfaceState === "open" &&
      result.rootDataset.detailsSheetState === "closed" &&
      result.rootDataset.boundarySurfaceState === "open" &&
      result.details.ariaExpanded === "false" &&
      result.footerBoundaryChip.ariaExpanded === "true" &&
      result.sheet.visible === false &&
      result.boundarySurface.visible === true,
    "Footer chip must open only the focused boundary surface and keep Details closed: " +
      JSON.stringify({
        stateFacts: result.stateFacts,
        rootDataset: result.rootDataset,
        details: result.details,
        footerBoundaryChip: result.footerBoundaryChip,
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
  assertRectInsideViewport(
    result.boundarySurface.rect,
    viewport,
    "focused boundary surface"
  );
}

function assertNarrowNativeUiSeparation(result, viewport) {
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

async function captureEvidence(client, baseUrl, viewport) {
  await setViewport(client, viewport);
  await navigateAndWait(client, baseUrl);

  if (viewport.action === "details") {
    await clickControl(client, "details-toggle");
  } else if (viewport.action === "boundary") {
    // Conv 3 Smoke Softening: Truth button removed; click footer chip with toggle-boundary action
    await evaluateRuntimeValue(
      client,
      `(() => {
        const footerBoundaryChip = document.querySelector("[data-m8a-v47-action='toggle-boundary']");
        if (!(footerBoundaryChip instanceof HTMLElement)) {
          throw new Error("Missing footer boundary chip with toggle-boundary action (Conv 3).");
        }
        footerBoundaryChip.click();
      })()`
    );
    await sleep(180);
  }

  const result = await inspectRuntime(client, viewport.name);
  assertPreservedInvariants(result);
  assertSceneNarrativeAndRail(result, viewport);
  assertBoundaryAffordanceIndependent(result);
  assertNarrowNativeUiSeparation(result, viewport);

  if (viewport.action === "default") {
    assertDefaultClosed(result, viewport);
  } else if (viewport.action === "details") {
    assertDetailsOpenEvidenceInspector(result, viewport);
  } else if (viewport.action === "boundary") {
    assertBoundaryOpenOnly(result, viewport);
  }

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
    action: viewport.action,
    screenshot,
    metadata: serializeRelative(metadataPath),
    activeWindowId: result.stateFacts.activeWindowId,
    nextWindowId: result.sequenceRail.nextWindowId,
    detailsSheetState: result.stateFacts.detailsSheetState,
    boundarySurfaceState: result.stateFacts.boundarySurfaceState,
    sceneNarrativeRect: result.sceneNarrative.rect,
    sequenceRailRect: result.sequenceRail.rect,
    stripRect: result.strip.rect,
    sheetRect: result.sheet.rect,
    boundarySurfaceRect: result.boundarySurface.rect,
    inspectorGroups: result.inspector.groups.map((group) => group.group),
    nativeSurfaces: result.nativeSurfaces,
    result
  };
}

async function verifySequenceAcrossAcceptedWindows(client, baseUrl) {
  const viewport = CAPTURES[0];
  const results = [];

  await setViewport(client, viewport);
  await navigateAndWait(client, baseUrl);

  for (const check of SEQUENCE_RATIO_CHECKS) {
    await seekReplayRatio(client, check.ratio);
    const result = await inspectRuntime(client, `sequence-ratio-${check.ratio}`);

    assertPreservedInvariants(result);
    assert(
      result.stateFacts.activeWindowId === check.active &&
        result.sequenceRail.nextWindowId === check.next,
      "Slice 4 sequence ratio check landed on unexpected active/next windows: " +
        JSON.stringify({
          check,
          activeWindowId: result.stateFacts.activeWindowId,
          nextWindowId: result.sequenceRail.nextWindowId
        })
    );
    assertSceneNarrativeAndRail(result, viewport);
    assertDefaultClosed(result, viewport);
    results.push({
      ratio: check.ratio,
      activeWindowId: result.stateFacts.activeWindowId,
      nextWindowId: result.sequenceRail.nextWindowId
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

  const writeManifest = (status) => {
    writeMetadata("capture-manifest.json", {
      generatedAt: new Date().toISOString(),
      status,
      route: REQUEST_PATH,
      outputRoot: serializeRelative(outputRoot),
      captures: captures.map((capture) => ({
        viewport: capture.viewport,
        action: capture.action,
        screenshot: capture.screenshot,
        metadata: capture.metadata,
        activeWindowId: capture.activeWindowId,
        nextWindowId: capture.nextWindowId,
        detailsSheetState: capture.detailsSheetState,
        boundarySurfaceState: capture.boundarySurfaceState,
        sceneNarrativeRect: capture.sceneNarrativeRect,
        sequenceRailRect: capture.sequenceRailRect,
        stripRect: capture.stripRect,
        sheetRect: capture.sheetRect,
        boundarySurfaceRect: capture.boundarySurfaceRect,
        inspectorGroups: capture.inspectorGroups,
        nativeSurfaces: capture.nativeSurfaces
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

    for (const viewport of CAPTURES) {
      captures.push(await captureEvidence(client, serverHandle.baseUrl, viewport));
    }

    sequenceChecks = await verifySequenceAcrossAcceptedWindows(
      client,
      serverHandle.baseUrl
    );
    writeManifest("passed-before-cleanup");

    console.log(
      `M8A-V4.10 Slice 4 inspector evidence redesign smoke passed: ${JSON.stringify(
        {
          captures: captures.map((capture) => ({
            viewport: capture.viewport,
            action: capture.action,
            screenshot: capture.screenshot.path,
            metadata: capture.metadata,
            activeWindowId: capture.activeWindowId,
            nextWindowId: capture.nextWindowId,
            detailsSheetState: capture.detailsSheetState,
            boundarySurfaceState: capture.boundarySurfaceState,
            inspectorGroups: capture.inspectorGroups
          })),
          sequenceChecks,
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

    writeManifest(captures.length >= 4 ? "cleanup-complete" : "failed-cleanup-complete");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
