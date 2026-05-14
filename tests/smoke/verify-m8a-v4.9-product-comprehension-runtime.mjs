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

const REQUEST_PATH = "/?scenePreset=regional&m8aV4GroundStationScene=1";
const EXPECTED_ENDPOINT_PAIR_ID =
  "taiwan-cht-speedcast-singapore-operator-family-2026-04-26";
const EXPECTED_PRECISION = "operator-family-only";
const EXPECTED_MODEL_ID = "m8a-v4.6d-simulation-handover-model.v1";
const EXPECTED_V48_VERSION =
  "m8a-v4.8-handover-demonstration-ui-ia-phase3-runtime.v1";
const EXPECTED_V49_VERSION =
  "m8a-v4.9-product-comprehension-slice4-runtime.v1";
const EXPECTED_V49_SCOPE = "slice4-inspector-details-hierarchy-redesign";
const EXPECTED_SCENE_NEAR_SCOPE =
  "slice2-scene-near-meaning-layer-correction";
const EXPECTED_TRANSITION_SCOPE = "slice3-transition-event-layer";
const EXPECTED_TRANSITION_DURATION_MS = 2600;
const EXPECTED_ACTOR_COUNTS = { leo: 6, meo: 5, geo: 2 };
const EXPECTED_WINDOW_IDS = [
  "leo-acquisition-context",
  "leo-aging-pressure",
  "meo-continuity-hold",
  "leo-reentry-candidate",
  "geo-continuity-guard"
];
const EXPECTED_ALLOWED_PERSISTENT_CONTENT = [
  "current-state",
  "state-ordinal",
  "play-pause",
  "restart",
  "30x",
  "60x",
  "120x",
  "compact-truth-affordance",
  "details-trigger"
];
const EXPECTED_DENIED_PERSISTENT_CONTENT = [
  "actor-ids",
  "cue-ids",
  "selected-anchor-ids",
  "candidate-context-actor-id-arrays",
  "fallback-context-actor-id-arrays",
  "long-truth-badge-row",
  "duplicate-product-progress"
];
const EXPECTED_SCENE_NEAR_RELIABLE_CONTENT = [
  "orbit-class-token",
  "product-label",
  "first-read-line",
  "watch-cue-label",
  "next-line"
];
const EXPECTED_SCENE_NEAR_FALLBACK_CONTENT = [
  "product-label",
  "state-ordinal",
  "first-read-line",
  "no-reliable-scene-attachment"
];
const EXPECTED_TRANSITION_VISIBLE_CONTENT = [
  "transition-summary",
  "transition-context"
];
const EXPECTED_TRANSITION_DENIED_VISIBLE_CONTENT = [
  "actor-ids",
  "cue-ids",
  "selected-anchor-ids",
  "candidate-context-actor-id-arrays",
  "fallback-context-actor-id-arrays",
  "full-truth-boundary-disclosure",
  "user-action-required"
];
const EXPECTED_INSPECTOR_PRIMARY_CONTENT = [
  "current-state",
  "why-this-state-exists",
  "what-changed-from-previous-state",
  "what-to-watch-now",
  "what-happens-next",
  "boundary-summary"
];
const EXPECTED_INSPECTOR_DENIED_PRIMARY_CONTENT = [
  "raw-actor-ids",
  "cue-ids",
  "selected-anchor-ids",
  "selected-relation-corridor-ids",
  "anchor-metadata",
  "full-candidate-context-arrays",
  "full-fallback-context-arrays"
];
const EXPECTED_INSPECTOR_DEBUG_CONTENT = [
  "representative-actor-id",
  "candidate-context-actor-id-array",
  "fallback-context-actor-id-array",
  "selected-anchor-id",
  "selected-relation-cue-id",
  "selected-corridor-id",
  "anchor-runtime-metadata"
];
const EXPECTED_INSPECTOR_LABELS = [
  "Current state",
  "Why",
  "Changed",
  "Watch",
  "Next",
  "Boundary"
];
const EXPECTED_PRODUCT_COPY = {
  "leo-acquisition-context": {
    windowId: "leo-acquisition-context",
    ratio: 0.1,
    productLabel: "LEO review focus",
    stateOrdinalLabel: "State 1 of 5",
    orbitClassToken: "LEO",
    firstReadMessage: "LEO is the simulated review focus for this corridor.",
    watchCueLabel: "Watch: representative LEO cue.",
    nextLine: "Next: watch for pressure before the MEO hold.",
    transitionRole: "review focus"
  },
  "leo-aging-pressure": {
    windowId: "leo-aging-pressure",
    ratio: 0.3,
    productLabel: "LEO pressure",
    stateOrdinalLabel: "State 2 of 5",
    orbitClassToken: "LEO",
    firstReadMessage:
      "The LEO review context is under simulated pressure.",
    watchCueLabel: "Watch: LEO pressure cue.",
    nextLine: "Next: continuity shifts to MEO context.",
    transitionRole: "pressure before continuity shift"
  },
  "meo-continuity-hold": {
    windowId: "meo-continuity-hold",
    ratio: 0.5,
    productLabel: "MEO continuity hold",
    stateOrdinalLabel: "State 3 of 5",
    orbitClassToken: "MEO",
    firstReadMessage: "MEO context is holding continuity in this simulation.",
    watchCueLabel: "Watch: MEO representative cue.",
    nextLine: "Next: LEO returns as a candidate focus.",
    transitionRole: "continuity hold"
  },
  "leo-reentry-candidate": {
    windowId: "leo-reentry-candidate",
    ratio: 0.7,
    productLabel: "LEO re-entry",
    stateOrdinalLabel: "State 4 of 5",
    orbitClassToken: "LEO",
    firstReadMessage: "LEO returns as a candidate review focus.",
    watchCueLabel: "Watch: returning LEO cue.",
    nextLine: "Next: GEO closes the sequence as guard context.",
    transitionRole: "re-entry candidate"
  },
  "geo-continuity-guard": {
    windowId: "geo-continuity-guard",
    ratio: 0.92,
    productLabel: "GEO guard context",
    stateOrdinalLabel: "State 5 of 5",
    orbitClassToken: "GEO",
    firstReadMessage:
      "GEO is shown only as guard context, not active failover proof.",
    watchCueLabel: "Watch: GEO guard cue.",
    nextLine: "Restart to review the sequence again.",
    transitionRole: "final guard"
  }
};
const EXPECTED_SLICE1_MICRO_CUES = {
  "leo-acquisition-context": "focus · LEO",
  "leo-aging-pressure": "pressure · LEO",
  "meo-continuity-hold": "hold · MEO",
  "leo-reentry-candidate": "re-entry · LEO",
  "geo-continuity-guard": "guard · GEO"
};
const EXPECTED_TRANSITION_LABELS = {
  "leo-acquisition-context": "LEO review",
  "leo-aging-pressure": "LEO pressure",
  "meo-continuity-hold": "MEO hold",
  "leo-reentry-candidate": "LEO re-entry",
  "geo-continuity-guard": "GEO guard"
};
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

// §Smoke Softening Disclosure: Correction A §5.3, §5.4, and §5.5 supersede the old
// V4.9 assumption that scope/time/source disclosure is not default-visible.
// The allowed successor disclosure is limited to the top scope/time strip and
// footer chips: simulation display, TLE provenance, operator-family precision,
// 13-actor scope, and replay time. The inspector may expose the Correction A
// Decision/Metrics/Boundary/Evidence tab model. Forbidden claims, metadata
// demotion, and non-blocking transition invariants remain unchanged.
const V411_CORRECTION_A_AMBIENT_DISCLOSURE_PATTERNS = [
  /≥500 LEO 規模證據另見 Phase 7\.1；本路由仍為 13-actor bounded demo/g,
  /模擬展示/g,
  /operator-family precision/g,
  /TLE: CelesTrak NORAD GP · fetched 2026-04-26 · 13 actors/g,
  /TLE: CelesTrak NORAD GP · 2026-04-26/g,
  /13 actors/g,
  /Sim replay \d{2}:\d{2} \/ \d{2}:\d{2}/g
];
const VIEWPORTS = {
  desktop: {
    name: "desktop-1440",
    width: 1440,
    height: 900,
    mobile: false,
    expectedViewportClass: "desktop"
  },
  desktopCompact: {
    name: "desktop-1280",
    width: 1280,
    height: 720,
    mobile: false,
    expectedViewportClass: "desktop"
  },
  narrow: {
    name: "narrow-390",
    width: 390,
    height: 844,
    mobile: true,
    expectedViewportClass: "narrow"
  }
};

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

async function setViewport(client, viewport) {
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.mobile
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
          v48UiIaVersion: root?.dataset.m8aV48UiIaVersion ?? null,
          v49ProductComprehension:
            root?.dataset.m8aV49ProductComprehension ?? null,
          productRootV49:
            productRoot?.dataset.m8aV49ProductComprehension ?? null,
          hasV4Seam: Boolean(
            window.__SCENARIO_GLOBE_VIEWER_CAPTURE__?.m8aV4GroundStationScene
          )
        };
      })()`
    );

    if (
      lastState?.bootstrapState === "ready" &&
      lastState?.scenePreset === "regional" &&
      lastState?.v48UiIaVersion === EXPECTED_V48_VERSION &&
      lastState?.v49ProductComprehension === EXPECTED_V49_VERSION &&
      lastState?.productRootV49 === EXPECTED_V49_VERSION &&
      lastState?.hasV4Seam === true
    ) {
      return lastState;
    }

    if (lastState?.bootstrapState === "error") {
      throw new Error(
        `M8A-V4.9 route hit bootstrap error: ${JSON.stringify(lastState)}`
      );
    }

    await sleep(100);
  }

  throw new Error(
    `M8A-V4.9 validation did not reach a ready route: ${JSON.stringify(
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
    `M8A-V4.9 globe did not settle: ${JSON.stringify(lastState)}`
  );
}

async function navigateAndWait(client, baseUrl) {
  await client.send("Page.navigate", { url: `${baseUrl}${REQUEST_PATH}` });
  await waitForBootstrapReady(client);
  await waitForGlobeReady(client);
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
  await sleep(180);
}

async function closeInspector(client) {
  await evaluateRuntimeValue(
    client,
    `(() => {
      const root = document.querySelector("[data-m8a-v47-product-ux='true']");
      const close = root?.querySelector("[data-m8a-v47-control-id='details-close']");
      const sheet = root?.querySelector("[data-m8a-v47-ui-surface='inspection-sheet']");

      if (sheet instanceof HTMLElement && !sheet.hidden) {
        close?.click();
      }
    })()`
  );
  await sleep(120);
}

async function closeBoundarySurface(client) {
  await evaluateRuntimeValue(
    client,
    `(() => {
      const root = document.querySelector("[data-m8a-v47-product-ux='true']");
      const close = root?.querySelector("[data-m8a-v47-control-id='boundary-close']");
      const surface = root?.querySelector("[data-m8a-v410-boundary-surface='true']");
      const sheet = root?.querySelector("[data-m8a-v47-ui-surface='inspection-sheet']");
      const sheetClose = root?.querySelector("[data-m8a-v47-control-id='details-close']");

      if (surface instanceof HTMLElement && !surface.hidden) {
        close?.click();
      } else if (sheet instanceof HTMLElement && !sheet.hidden) {
        sheetClose?.click();
      }
    })()`
  );
  await sleep(120);
}

async function capturePersistentLayer(client) {
  return await evaluateRuntimeValue(
    client,
    `(() => {
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
      const validInfoClasses = new Set([
        "fixed",
        "dynamic",
        "disclosure",
        "control"
      ]);
      const visibleTextNodes = (scope) => {
        const nodes = [];
        const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);

        while (walker.nextNode()) {
          const node = walker.currentNode;
          const text = node.textContent.replace(/\\s+/g, " ").trim();
          const parent = node.parentElement;

          if (text && parent && isVisible(parent)) {
            nodes.push(text);
          }
        }

        return nodes;
      };
      const visibleTextClassificationFailures = (scope) => {
        const failures = [];
        const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);

        while (walker.nextNode()) {
          const node = walker.currentNode;
          const text = node.textContent.replace(/\\s+/g, " ").trim();
          const parent = node.parentElement;

          if (!text || !parent || !isVisible(parent)) {
            continue;
          }

          const classified = parent.closest("[data-m8a-v48-info-class]");
          const infoClass =
            classified?.getAttribute("data-m8a-v48-info-class") ?? null;

          if (!validInfoClasses.has(infoClass)) {
            failures.push({
              text,
              parent: parent.tagName.toLowerCase(),
              infoClass
            });
          }
        }

        return failures;
      };
      const readSurface = (selector) => {
        const element = document.querySelector(selector);

        if (!(element instanceof HTMLElement)) {
          return {
            selector,
            mounted: false,
            visible: false,
            rect: null,
            text: ""
          };
        }

        return {
          selector,
          mounted: true,
          visible: isVisible(element),
          rect: rectToPlain(element.getBoundingClientRect()),
          text: element.innerText?.replace(/\\s+/g, " ").trim() ?? ""
        };
      };
      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      const state = capture?.m8aV4GroundStationScene?.getState?.();
      const productRoot = document.querySelector("[data-m8a-v47-product-ux='true']");
      const strip = productRoot?.querySelector("[data-m8a-v47-control-strip='true']");
      const sheet = productRoot?.querySelector("[data-m8a-v47-ui-surface='inspection-sheet']");
      const boundarySurface = productRoot?.querySelector("[data-m8a-v410-boundary-surface='true']");
      const annotation = productRoot?.querySelector("[data-m8a-v47-scene-annotation='true']");
      const connector = productRoot?.querySelector("[data-m8a-v48-scene-connector='true']");
      const transitionEvent = productRoot?.querySelector("[data-m8a-v49-transition-event='true']");
      const transitionSummary = transitionEvent?.querySelector("[data-m8a-v49-transition-summary='true']");
      const transitionContext = transitionEvent?.querySelector("[data-m8a-v49-transition-context='true']");
      const sceneNearMeaning = annotation?.querySelector("[data-m8a-v49-scene-near-meaning='true']");
      const sceneNearCue = annotation?.querySelector(
        "[data-m8a-v49-scene-near-cue='true'], [data-m8a-v47-annotation-context='true']"
      );
      const sceneNearNext = annotation?.querySelector("[data-m8a-v410-next-line='true']");
      const sceneNearFallback = annotation?.querySelector("[data-m8a-v49-scene-near-fallback='true']");
      const truthAffordance = strip?.querySelector("[data-m8a-v49-truth-affordance='compact']");
      const detailsTrigger = strip?.querySelector("[data-m8a-v47-control-id='details-toggle']");
      const visibleStripTruthBadges = Array.from(
        strip?.querySelectorAll("[data-m8a-v47-truth-badge]") ?? []
      ).filter(isVisible);
      const visibleProgress = Array.from(
        strip?.querySelectorAll(
          "progress, [role='progressbar'], input[type='range'], [data-m8a-v47-progress='true']"
        ) ?? []
      ).filter(isVisible);
      const visibleButtons = Array.from(strip?.querySelectorAll("button") ?? [])
        .filter(isVisible)
        .map((button) => ({
          text: button.textContent.replace(/\\s+/g, " ").trim(),
          controlId: button.dataset.m8aV47ControlId ?? null,
          action: button.dataset.m8aV47Action ?? null,
          ariaExpanded: button.getAttribute("aria-expanded"),
          ariaPressed: button.getAttribute("aria-pressed"),
          rect: rectToPlain(button.getBoundingClientRect()),
          clientWidth: button.clientWidth,
          clientHeight: button.clientHeight,
          scrollWidth: button.scrollWidth,
          scrollHeight: button.scrollHeight
        }));
      const stripText = strip?.innerText.replace(/\\s+/g, " ").trim() ?? "";
      const visibleProductText = visibleTextNodes(productRoot).join(" ");
      const compactTruthText = truthAffordance?.textContent
        .replace(/\\s+/g, " ")
        .trim() ?? null;
      const resourceHits = performance
        .getEntriesByType("resource")
        .map((entry) => entry.name)
        .filter((name) => /celestrak|itri\\/multi-orbit/i.test(name));

      return {
        state,
        productRootDataset: {
          v49ProductComprehension:
            productRoot?.dataset.m8aV49ProductComprehension ?? null,
          v49SliceScope: productRoot?.dataset.m8aV49SliceScope ?? null,
          firstReadMessage: productRoot?.dataset.m8aV49FirstReadMessage ?? null,
          watchCueLabel: productRoot?.dataset.m8aV49WatchCueLabel ?? null,
          orbitClassToken: productRoot?.dataset.m8aV49OrbitClassToken ?? null,
          sceneNearMeaningLayer:
            productRoot?.dataset.m8aV49SceneNearMeaningLayer ?? null,
          sceneNearReliableVisibleContent:
            productRoot?.dataset.m8aV49SceneNearReliableVisibleContent ?? null,
          sceneNearFallbackVisibleContent:
            productRoot?.dataset.m8aV49SceneNearFallbackVisibleContent ?? null,
          sceneNearReliableAnchorRequired:
            productRoot?.dataset.m8aV49SceneNearReliableAnchorRequired ?? null,
          sceneNearFallbackPolicy:
            productRoot?.dataset.m8aV49SceneNearFallbackPolicy ?? null,
          sceneNearConnectorPolicy:
            productRoot?.dataset.m8aV49SceneNearConnectorPolicy ?? null,
          sceneNearActiveMeaning:
            productRoot?.dataset.m8aV49SceneNearActiveMeaning ?? null,
          sceneNearMode:
            productRoot?.dataset.m8aV49SceneNearMode ?? null,
          sceneNearMeaningVisible:
            productRoot?.dataset.m8aV49SceneNearMeaningVisible ?? null,
          sceneNearCueVisible:
            productRoot?.dataset.m8aV49SceneNearCueVisible ?? null,
          sceneNearFallbackVisible:
            productRoot?.dataset.m8aV49SceneNearFallbackVisible ?? null,
          sceneNearAttachmentClaim:
            productRoot?.dataset.m8aV49SceneNearAttachmentClaim ?? null,
          transitionEventLayer:
            productRoot?.dataset.m8aV49TransitionEventLayer ?? null,
          transitionEventTrigger:
            productRoot?.dataset.m8aV49TransitionEventTrigger ?? null,
          transitionEventDurationMs:
            productRoot?.dataset.m8aV49TransitionEventDurationMs ?? null,
          transitionEventVisibleContent:
            productRoot?.dataset.m8aV49TransitionEventVisibleContent ?? null,
          transitionEventDeniedVisibleContent:
            productRoot?.dataset.m8aV49TransitionEventDeniedVisibleContent ?? null,
          transitionEventVisible:
            productRoot?.dataset.m8aV49TransitionEventVisible ?? null,
          transitionEventFromLabel:
            productRoot?.dataset.m8aV49TransitionEventFromLabel ?? null,
          transitionEventToLabel:
            productRoot?.dataset.m8aV49TransitionEventToLabel ?? null,
          transitionEventText:
            productRoot?.dataset.m8aV49TransitionEventText ?? null,
          transitionEventContext:
            productRoot?.dataset.m8aV49TransitionEventContext ?? null,
          transitionEventStateTruthSource:
            productRoot?.dataset.m8aV49TransitionEventStateTruthSource ?? null,
          transitionEventNonBlocking:
            productRoot?.dataset.m8aV49TransitionEventNonBlocking ?? null,
          inspectorLayer:
            productRoot?.dataset.m8aV49InspectorLayer ?? null,
          inspectorPrimaryVisibleContent:
            productRoot?.dataset.m8aV49InspectorPrimaryVisibleContent ?? null,
          inspectorDeniedPrimaryContent:
            productRoot?.dataset.m8aV49InspectorDeniedPrimaryContent ?? null,
          inspectorDebugEvidenceContent:
            productRoot?.dataset.m8aV49InspectorDebugEvidenceContent ?? null,
          inspectorDebugEvidenceDefaultOpen:
            productRoot?.dataset.m8aV49InspectorDebugEvidenceDefaultOpen ?? null,
          inspectorTruthBoundaryPlacement:
            productRoot?.dataset.m8aV49InspectorTruthBoundaryPlacement ?? null,
          inspectorMetadataPolicy:
            productRoot?.dataset.m8aV49InspectorMetadataPolicy ?? null,
          allowedPersistent:
            productRoot?.dataset.m8aV49PersistentAllowedContent ?? null,
          deniedPersistent:
            productRoot?.dataset.m8aV49PersistentDeniedDefaultContent ?? null
        },
        stripDataset: {
          persistentLayer: strip?.dataset.m8aV49PersistentLayer ?? null,
          defaultVisibleContent:
            strip?.dataset.m8aV49DefaultVisibleContent ?? null,
          deniedDefaultVisibleContent:
            strip?.dataset.m8aV49DeniedDefaultVisibleContent ?? null
        },
        viewportClass: state?.productUx?.layout?.viewportClass ?? null,
        activeWindowId: state?.productUx?.activeWindowId ?? null,
        activeProductLabel: state?.productUx?.activeProductLabel ?? null,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        stripText,
        visibleProductText,
        visibleTextClassificationFailures: productRoot
          ? visibleTextClassificationFailures(productRoot)
          : [],
        resourceHits,
        stripRect: strip ? rectToPlain(strip.getBoundingClientRect()) : null,
        sheetVisible: sheet ? isVisible(sheet) : null,
        boundarySurfaceVisible: boundarySurface
          ? isVisible(boundarySurface)
          : null,
        annotationText:
          annotation?.innerText.replace(/\\s+/g, " ").trim() ?? null,
        annotationRect: annotation
          ? rectToPlain(annotation.getBoundingClientRect())
          : null,
        annotationDataset: {
          windowId: annotation?.dataset.m8aV47WindowId ?? null,
          anchorStatus: annotation?.dataset.m8aV48AnchorStatus ?? null,
          selectedAnchorType:
            annotation?.dataset.m8aV48SelectedAnchorType ?? null,
          selectedActorId: annotation?.dataset.m8aV48SelectedActorId ?? null,
          selectedRelationCueId:
            annotation?.dataset.m8aV48SelectedRelationCueId ?? null,
          selectedCorridorId:
            annotation?.dataset.m8aV48SelectedCorridorId ?? null,
          fallbackReason: annotation?.dataset.m8aV48FallbackReason ?? null,
          sceneNearMode: annotation?.dataset.m8aV49SceneNearMode ?? null,
          sceneNearMeaning:
            annotation?.dataset.m8aV49SceneNearMeaningText ?? null,
          sceneNearCueLabel:
            annotation?.dataset.m8aV49SceneNearCueText ?? null,
          nextLine:
            annotation?.dataset.m8aV410NextLine ?? null,
          sceneNearFallbackText:
            annotation?.dataset.m8aV49SceneNearFallbackText ?? null,
          sceneNearMeaningVisible:
            annotation?.dataset.m8aV49SceneNearMeaningVisible ?? null,
          sceneNearCueVisible:
            annotation?.dataset.m8aV49SceneNearCueVisible ?? null,
          sceneNearFallbackVisible:
            annotation?.dataset.m8aV49SceneNearFallbackVisible ?? null,
          sceneNearAttachmentClaim:
            annotation?.dataset.m8aV49SceneNearAttachmentClaim ?? null
        },
        sceneNearVisibleText: {
          meaning: isVisible(sceneNearMeaning)
            ? sceneNearMeaning.textContent.replace(/\\s+/g, " ").trim()
            : "",
          cue: isVisible(sceneNearCue)
            ? sceneNearCue.textContent.replace(/\\s+/g, " ").trim()
            : "",
          next: isVisible(sceneNearNext)
            ? sceneNearNext.textContent.replace(/\\s+/g, " ").trim()
            : "",
          fallback: isVisible(sceneNearFallback)
            ? sceneNearFallback.textContent.replace(/\\s+/g, " ").trim()
            : ""
        },
        connectorVisible: isVisible(connector),
        connectorDataset: {
          anchorStatus: connector?.dataset.m8aV48AnchorStatus ?? null,
          selectedAnchorType:
            connector?.dataset.m8aV48SelectedAnchorType ?? null,
          selectedActorId: connector?.dataset.m8aV48SelectedActorId ?? null,
          selectedRelationCueId:
            connector?.dataset.m8aV48SelectedRelationCueId ?? null,
          attachmentClaim:
            connector?.dataset.m8aV49SceneNearAttachmentClaim ?? null
        },
        transitionEvent: {
          visible: isVisible(transitionEvent),
          text:
            transitionEvent?.innerText.replace(/\\s+/g, " ").trim() ?? "",
          summary: isVisible(transitionSummary)
            ? (transitionSummary.textContent ?? "").replace(/\\s+/g, " ").trim()
            : "",
          context: isVisible(transitionContext)
            ? (transitionContext.textContent ?? "").replace(/\\s+/g, " ").trim()
            : "",
          rect: transitionEvent
            ? rectToPlain(transitionEvent.getBoundingClientRect())
            : null,
          pointerEvents: transitionEvent
            ? getComputedStyle(transitionEvent).pointerEvents
            : null,
          dataset: {
            visible:
              transitionEvent?.dataset.m8aV49TransitionEventVisible ?? null,
            durationMs:
              transitionEvent?.dataset.m8aV49TransitionEventDurationMs ?? null,
            fromLabel:
              transitionEvent?.dataset.m8aV49TransitionEventFromLabel ?? null,
            toLabel:
              transitionEvent?.dataset.m8aV49TransitionEventToLabel ?? null,
            stateTruthSource:
              transitionEvent?.dataset.m8aV49TransitionEventStateTruthSource ?? null,
            nonBlocking:
              transitionEvent?.dataset.m8aV49TransitionEventNonBlocking ?? null,
            placement:
              transitionEvent?.dataset.m8aV49TransitionPlacement ?? null
          }
        },
        truthAffordanceVisible: isVisible(truthAffordance),
        compactTruthText,
        detailsTriggerVisible: isVisible(detailsTrigger),
        visibleStripTruthBadgeTexts: visibleStripTruthBadges.map((element) =>
          element.textContent.replace(/\\s+/g, " ").trim()
        ),
        visibleProgressCount: visibleProgress.length,
        visibleButtons,
        visualSurfaces: {
          productRoot: productRoot
            ? {
                visible: isVisible(productRoot),
                rect: rectToPlain(productRoot.getBoundingClientRect())
              }
            : null,
          strip: strip
            ? {
                visible: isVisible(strip),
                rect: rectToPlain(strip.getBoundingClientRect())
              }
            : null,
          annotation: annotation
            ? {
                visible: isVisible(annotation),
                rect: rectToPlain(annotation.getBoundingClientRect())
              }
            : null,
          connector: connector
            ? {
                visible: isVisible(connector),
                rect: rectToPlain(connector.getBoundingClientRect())
              }
            : null,
          transitionEvent: transitionEvent
            ? {
                visible: isVisible(transitionEvent),
                rect: rectToPlain(transitionEvent.getBoundingClientRect())
              }
            : null,
          sheet: sheet
            ? {
                visible: isVisible(sheet),
                rect: rectToPlain(sheet.getBoundingClientRect())
              }
            : null,
          boundarySurface: boundarySurface
            ? {
                visible: isVisible(boundarySurface),
                rect: rectToPlain(boundarySurface.getBoundingClientRect())
              }
            : null,
          cesiumToolbar: readSurface(".cesium-viewer-toolbar"),
          cesiumAnimation: readSurface(".cesium-viewer-animationContainer"),
          cesiumTimeline: readSurface(".cesium-viewer-timelineContainer"),
          cesiumCredits: readSurface(".cesium-widget-credits")
        }
      };
    })()`
  );
}

function assertPreservedScenarioFacts(result) {
  const state = result.state;
  const expectations = state?.simulationHandoverModel?.validationExpectations;
  const requiredNonClaimKeys =
    expectations?.requiredWindowNonClaimKeys ?? [];

  assert(state, "Missing V4.9 runtime state.");
  assert(
    state.simulationHandoverModel.route === REQUEST_PATH &&
      state.simulationHandoverModel.endpointPairId ===
        EXPECTED_ENDPOINT_PAIR_ID &&
      state.simulationHandoverModel.acceptedPairPrecision ===
        EXPECTED_PRECISION &&
      state.simulationHandoverModel.modelId === EXPECTED_MODEL_ID &&
      state.simulationHandoverModel.modelTruth ===
        "simulation-output-not-operator-log",
    "V4.9 Slice 1 must preserve route, endpoint pair, precision, and V4.6D model truth: " +
      JSON.stringify({
        route: state.simulationHandoverModel.route,
        endpointPairId: state.simulationHandoverModel.endpointPairId,
        precision: state.simulationHandoverModel.acceptedPairPrecision,
        modelId: state.simulationHandoverModel.modelId,
        modelTruth: state.simulationHandoverModel.modelTruth
      })
  );
  assert(
    JSON.stringify(state.orbitActorCounts) ===
      JSON.stringify(EXPECTED_ACTOR_COUNTS),
    "V4.9 Slice 1 must preserve the 6 LEO / 5 MEO / 2 GEO actor set: " +
      JSON.stringify(state.orbitActorCounts)
  );
  assert(
    state.sourceLineage.projectionRead ===
      "M8A_V4_GROUND_STATION_RUNTIME_PROJECTION" &&
      state.sourceLineage.rawPackageSideReadOwnership === "forbidden" &&
      state.sourceLineage.rawSourcePathsIncluded === false,
    "V4.9 Slice 1 must preserve repo-owned runtime source boundary: " +
      JSON.stringify(state.sourceLineage)
  );
  assert(
    JSON.stringify(state.simulationHandoverModel.timelineWindowIds) ===
      JSON.stringify(EXPECTED_WINDOW_IDS) &&
      JSON.stringify(expectations.expectedWindowIds) ===
        JSON.stringify(EXPECTED_WINDOW_IDS) &&
      JSON.stringify(expectations.expectedActorCounts) ===
        JSON.stringify(EXPECTED_ACTOR_COUNTS) &&
      expectations.endpointPairAndPrecisionMustRemainUnchanged === true &&
      expectations.runtimeRawItriSideReadAllowed === false &&
      expectations.measuredMetricTruthAllowed === false,
    "V4.9 Slice 5 must preserve V4.6D window, actor, endpoint, source, and measured-metric validation facts: " +
      JSON.stringify({
        timelineWindowIds: state.simulationHandoverModel.timelineWindowIds,
        expectations
      })
  );
  assert(
    requiredNonClaimKeys.includes("noR2RuntimeSelector") &&
      requiredNonClaimKeys.includes("noEndpointPairOrPrecisionChange") &&
      requiredNonClaimKeys.includes("noRawItriOrLiveExternalRuntimeSource") &&
      state.simulationHandoverModel.timeline.every(
        (windowDefinition) =>
          windowDefinition.nonClaims.noR2RuntimeSelector === true &&
          windowDefinition.nonClaims.noEndpointPairOrPrecisionChange === true &&
          windowDefinition.nonClaims.noRawItriOrLiveExternalRuntimeSource ===
            true
      ),
    "V4.9 Slice 5 must keep R2 read-only and prevent endpoint/source promotion through every V4.6D window: " +
      JSON.stringify({
        requiredNonClaimKeys,
        windows: state.simulationHandoverModel.timeline.map(
          (windowDefinition) => ({
            windowId: windowDefinition.windowId,
            nonClaims: windowDefinition.nonClaims
          })
        )
      })
  );
  assert(
    result.resourceHits.length === 0,
    "V4.9 runtime must not fetch raw customer packages or live external source resources: " +
      JSON.stringify(result.resourceHits)
  );
}

function assertProductCopy(result, expected) {
  const comprehension = result.state.productUx.productComprehension;
  const activeCopy = comprehension.activeWindowCopy;

  assert(
    comprehension.version === EXPECTED_V49_VERSION &&
      result.productRootDataset.v49ProductComprehension ===
        EXPECTED_V49_VERSION,
    "V4.9 Slice 4 version seam mismatch: " +
      JSON.stringify(result.productRootDataset)
  );
  assert(
    comprehension.scope === EXPECTED_V49_SCOPE &&
      result.productRootDataset.v49SliceScope === comprehension.scope,
    "V4.9 Slice 4 scope seam mismatch: " +
      JSON.stringify(result.productRootDataset)
  );
  assert(
    JSON.stringify(comprehension.windowIds) ===
      JSON.stringify(EXPECTED_WINDOW_IDS),
    "V4.9 copy inventory must preserve the five accepted V4.6D window ids: " +
      JSON.stringify(comprehension.windowIds)
  );
  assert(
    comprehension.copyInventory.length === EXPECTED_WINDOW_IDS.length &&
      comprehension.copyInventory.every(
        (copy, index) => copy.windowId === EXPECTED_WINDOW_IDS[index]
      ),
    "V4.9 copy inventory order must match the V4.6D timeline: " +
      JSON.stringify(comprehension.copyInventory)
  );
  assert(
    activeCopy.windowId === result.activeWindowId &&
      activeCopy.productLabel === expected.productLabel &&
      activeCopy.orbitClassToken === expected.orbitClassToken &&
      activeCopy.firstReadMessage === expected.firstReadMessage &&
      activeCopy.watchCueLabel === expected.watchCueLabel &&
      activeCopy.nextLine === expected.nextLine &&
      activeCopy.transitionRole === expected.transitionRole,
    "V4.9 active product copy does not match the accepted Slice 1 inventory: " +
      JSON.stringify({ activeCopy, expected })
  );
  assert(
    activeCopy.firstReadMessage.length <= 90,
    "V4.9 first-read message must remain concise: " +
      JSON.stringify(activeCopy)
  );
  assert(
    comprehension.sceneNearMeaningLayer.scope === EXPECTED_SCENE_NEAR_SCOPE &&
      comprehension.sceneNearMeaningLayer.reliableAnchorRequired === true &&
      comprehension.sceneNearMeaningLayer.fallbackPolicy ===
        "persistent-layer-wording-without-scene-attachment" &&
      comprehension.sceneNearMeaningLayer.connectorPolicy ===
        "visible-only-when-anchor-geometry-reliable" &&
      JSON.stringify(comprehension.sceneNearMeaningLayer.reliableVisibleContent) ===
        JSON.stringify(EXPECTED_SCENE_NEAR_RELIABLE_CONTENT) &&
      JSON.stringify(comprehension.sceneNearMeaningLayer.fallbackVisibleContent) ===
        JSON.stringify(EXPECTED_SCENE_NEAR_FALLBACK_CONTENT) &&
      comprehension.sceneNearMeaningLayer.activeMeaning ===
        expected.firstReadMessage &&
      comprehension.sceneNearMeaningLayer.activeWatchCueLabel ===
        expected.watchCueLabel &&
      result.productRootDataset.sceneNearMeaningLayer ===
        EXPECTED_SCENE_NEAR_SCOPE &&
      result.productRootDataset.sceneNearReliableAnchorRequired === "true" &&
      result.productRootDataset.sceneNearReliableVisibleContent ===
        EXPECTED_SCENE_NEAR_RELIABLE_CONTENT.join("|") &&
      result.productRootDataset.sceneNearFallbackVisibleContent ===
        EXPECTED_SCENE_NEAR_FALLBACK_CONTENT.join("|"),
    "V4.9 Slice 2 scene-near meaning seam mismatch: " +
      JSON.stringify({
        sceneNearMeaningLayer: comprehension.sceneNearMeaningLayer,
        productRootDataset: result.productRootDataset
      })
  );
  assert(
    comprehension.transitionEventLayer.scope === EXPECTED_TRANSITION_SCOPE &&
      comprehension.transitionEventLayer.trigger ===
        "active-v46d-window-id-change" &&
      comprehension.transitionEventLayer.durationMs ===
        EXPECTED_TRANSITION_DURATION_MS &&
      JSON.stringify(comprehension.transitionEventLayer.visibleContent) ===
        JSON.stringify(EXPECTED_TRANSITION_VISIBLE_CONTENT) &&
      JSON.stringify(comprehension.transitionEventLayer.deniedVisibleContent) ===
        JSON.stringify(EXPECTED_TRANSITION_DENIED_VISIBLE_CONTENT) &&
      comprehension.transitionEventLayer.currentStateTruthSource ===
        "persistent-and-scene-near-layers" &&
      comprehension.transitionEventLayer.blockingPolicy ===
        "non-blocking-no-user-action" &&
      comprehension.transitionEventLayer.placementPolicy ===
        "avoid-reliable-scene-near-cue" &&
      result.productRootDataset.transitionEventLayer === EXPECTED_TRANSITION_SCOPE &&
      result.productRootDataset.transitionEventTrigger ===
        "active-v46d-window-id-change" &&
      result.productRootDataset.transitionEventDurationMs ===
        String(EXPECTED_TRANSITION_DURATION_MS) &&
      result.productRootDataset.transitionEventVisibleContent ===
        EXPECTED_TRANSITION_VISIBLE_CONTENT.join("|") &&
      result.productRootDataset.transitionEventDeniedVisibleContent ===
        EXPECTED_TRANSITION_DENIED_VISIBLE_CONTENT.join("|") &&
      result.productRootDataset.transitionEventStateTruthSource ===
        "persistent-and-scene-near-layers" &&
      result.productRootDataset.transitionEventNonBlocking ===
        "non-blocking-no-user-action",
    "V4.9 Slice 3 transition-event seam mismatch: " +
      JSON.stringify({
        transitionEventLayer: comprehension.transitionEventLayer,
        productRootDataset: result.productRootDataset
      })
  );
  assert(
    comprehension.inspectorLayer.scope === EXPECTED_V49_SCOPE &&
      JSON.stringify(comprehension.inspectorLayer.primaryVisibleContent) ===
        JSON.stringify(EXPECTED_INSPECTOR_PRIMARY_CONTENT) &&
      JSON.stringify(comprehension.inspectorLayer.deniedPrimaryVisibleContent) ===
        JSON.stringify(EXPECTED_INSPECTOR_DENIED_PRIMARY_CONTENT) &&
      JSON.stringify(comprehension.inspectorLayer.debugEvidenceContent) ===
        JSON.stringify(EXPECTED_INSPECTOR_DEBUG_CONTENT) &&
      comprehension.inspectorLayer.debugEvidenceDefaultOpen === false &&
      comprehension.inspectorLayer.truthBoundaryPlacement ===
        "concise-primary-summary-full-secondary-disclosure" &&
      comprehension.inspectorLayer.metadataPolicy ===
        "raw-ids-and-arrays-collapsed-implementation-evidence" &&
      result.productRootDataset.inspectorLayer === EXPECTED_V49_SCOPE &&
      result.productRootDataset.inspectorPrimaryVisibleContent ===
        EXPECTED_INSPECTOR_PRIMARY_CONTENT.join("|") &&
      result.productRootDataset.inspectorDeniedPrimaryContent ===
        EXPECTED_INSPECTOR_DENIED_PRIMARY_CONTENT.join("|") &&
      result.productRootDataset.inspectorDebugEvidenceContent ===
        EXPECTED_INSPECTOR_DEBUG_CONTENT.join("|") &&
      result.productRootDataset.inspectorDebugEvidenceDefaultOpen === "false",
    "V4.9 Slice 4 inspector seam mismatch: " +
      JSON.stringify({
        inspectorLayer: comprehension.inspectorLayer,
        productRootDataset: result.productRootDataset
      })
  );
}

function assertPersistentLayer(result, expected, viewport) {
  const stripText = result.stripText;
  const visibleProductText = result.visibleProductText;
  const v49CoreVisibleProductText =
    V411_CORRECTION_A_AMBIENT_DISCLOSURE_PATTERNS.reduce(
      (text, pattern) => text.replace(pattern, ""),
      visibleProductText
    );
  const forbiddenDefaultVisiblePatterns = [
    /oneweb-\d{4}-leo-display-context/i,
    /o3b-mpower-f\d-meo-display-context/i,
    /st-2-geo-continuity-anchor/i,
    /ses-9-geo-display-context/i,
    /m8a-v46e-simulation-/i,
    /m8a-v4-operator-family-endpoint-context-ribbon/i,
    /selected actor/i,
    /selected cue/i,
    /candidateContextActorIds/i,
    /fallbackContextActorIds/i,
    /simulation output/i,
    /operator-family precision/i,
    /display-context actors/i,
    /Replay UTC/i,
    /Sim replay/i
  ];
  const requiredFragments = [
    // Conv 3 minimal update: "Truth" removed from strip (Truth button removed)
    "Current state",
    expected.productLabel,
    expected.stateOrdinalLabel,
    "Restart",
    "30x",
    "60x",
    "120x",
    "Details"
  ];

  assert(
    result.viewportClass === viewport.expectedViewportClass,
    "V4.9 persistent layer viewport class mismatch: " +
      JSON.stringify({
        viewportClass: result.viewportClass,
        expected: viewport.expectedViewportClass
      })
  );
  assert(
    result.sheetVisible === false,
    "V4.9 default persistent view must keep details closed: " +
      JSON.stringify(result)
  );
  // Conv 3 minimal update: Truth button removed; only check Details trigger
  assert(
    result.detailsTriggerVisible === true &&
      result.boundarySurfaceVisible === false,
    "V4.9 persistent layer must expose details trigger (Truth button removed in Conv 3): " +
      JSON.stringify({
        detailsTriggerVisible: result.detailsTriggerVisible,
        boundarySurfaceVisible: result.boundarySurfaceVisible
      })
  );
  assert(
    requiredFragments.every((fragment) => stripText.includes(fragment)),
    "V4.9 persistent strip is missing required default content: " +
      JSON.stringify({ stripText, requiredFragments })
  );
  assert(
    /\b(Play|Pause)\b/.test(stripText),
    "V4.9 persistent strip must expose play/pause control: " +
      JSON.stringify({ stripText })
  );
  assert(
    JSON.stringify(
      result.state.productUx.productComprehension.persistentLayer
        .defaultVisibleContent
    ) === JSON.stringify(EXPECTED_ALLOWED_PERSISTENT_CONTENT) &&
      result.stripDataset.defaultVisibleContent ===
        EXPECTED_ALLOWED_PERSISTENT_CONTENT.join("|"),
    "V4.9 persistent default-visible content inventory mismatch: " +
      JSON.stringify({
        state:
          result.state.productUx.productComprehension.persistentLayer
            .defaultVisibleContent,
        strip: result.stripDataset.defaultVisibleContent
      })
  );
  assert(
    JSON.stringify(
      result.state.productUx.productComprehension.persistentLayer
        .deniedDefaultVisibleContent
    ) === JSON.stringify(EXPECTED_DENIED_PERSISTENT_CONTENT) &&
      result.stripDataset.deniedDefaultVisibleContent ===
        EXPECTED_DENIED_PERSISTENT_CONTENT.join("|"),
    "V4.9 persistent denied-default content inventory mismatch: " +
      JSON.stringify({
        state:
          result.state.productUx.productComprehension.persistentLayer
            .deniedDefaultVisibleContent,
        strip: result.stripDataset.deniedDefaultVisibleContent
      })
  );
  assert(
    result.visibleStripTruthBadgeTexts.length === 0 &&
      result.visibleProgressCount === 0,
    "V4.9 persistent layer must collapse long truth badges and avoid duplicate progress: " +
      JSON.stringify({
        visibleStripTruthBadgeTexts: result.visibleStripTruthBadgeTexts,
        visibleProgressCount: result.visibleProgressCount,
        stripText
      })
  );
  assert(
    forbiddenDefaultVisiblePatterns.every(
      (pattern) => !pattern.test(v49CoreVisibleProductText)
    ),
    "V4.9 default-visible product text exposed denied metadata or long badges: " +
      JSON.stringify({ visibleProductText })
  );
  assert(
    result.visibleTextClassificationFailures.length === 0,
    "V4.9 visible product text must keep a valid info classification: " +
      JSON.stringify(result.visibleTextClassificationFailures)
  );
  assertVisibleForbiddenClaimScanClean(visibleProductText, {
    windowId: result.activeWindowId,
    viewport: viewport.name
  });
  assertPrimaryMetadataDemoted(visibleProductText, {
    surface: "persistent-default-product-text",
    windowId: result.activeWindowId,
    viewport: viewport.name
  });
  assert(
    result.stripRect.height < viewport.height * 0.34,
    "V4.9 persistent strip must remain concise on the viewport: " +
      JSON.stringify({ viewport, stripRect: result.stripRect })
  );
}

function assertCleanSceneNearText(text, context) {
  const forbiddenPatterns = [
    /oneweb-\d{4}-leo-display-context/i,
    /o3b-mpower-f\d-meo-display-context/i,
    /st-2-geo-continuity-anchor/i,
    /ses-9-geo-display-context/i,
    /m8a-v46e-simulation-/i,
    /m8a-v4-operator-family-endpoint-context-ribbon/i,
    /candidateContextActorIds/i,
    /fallbackContextActorIds/i,
    /selected actor/i,
    /selected cue/i,
    /active serving/i,
    /active gateway/i,
    /active path/i,
    /active service/i,
    /pair-specific/i,
    /teleport path/i,
    /native RF handover/i,
    /operator handover log/i,
    /operator log truth/i,
    /latency|jitter|throughput/i
  ];

  assert(
    forbiddenPatterns.every((pattern) => !pattern.test(text)),
    "V4.9 scene-near visible text exposed ids, metadata, or forbidden claims: " +
      JSON.stringify({ text, context })
  );
}

function assertCleanTransitionText(text, context) {
  const forbiddenPatterns = [
    /oneweb-\d{4}-leo-display-context/i,
    /o3b-mpower-f\d-meo-display-context/i,
    /st-2-geo-continuity-anchor/i,
    /ses-9-geo-display-context/i,
    /m8a-v46e-simulation-/i,
    /m8a-v4-operator-family-endpoint-context-ribbon/i,
    /candidateContextActorIds/i,
    /fallbackContextActorIds/i,
    /selected actor/i,
    /selected cue/i,
    /selected anchor/i,
    /simulation output/i,
    /operator-family precision/i,
    /display-context actors/i,
    /active serving/i,
    /active gateway/i,
    /active path/i,
    /active service/i,
    /pair-specific/i,
    /teleport path/i,
    /native RF handover/i,
    /operator handover log/i,
    /operator log truth/i,
    /latency|jitter|throughput/i,
    /No active gateway assignment is claimed/i,
    /No pair-specific teleport path is claimed/i
  ];

  assert(
    forbiddenPatterns.every((pattern) => !pattern.test(text)),
    "V4.9 transition event visible text exposed ids, metadata, full disclosure, or forbidden claims: " +
      JSON.stringify({ text, context })
  );
}

function rectsOverlap(first, second) {
  if (!first || !second || first.width <= 0 || second.width <= 0) {
    return false;
  }

  return !(
    first.right <= second.left ||
    first.left >= second.right ||
    first.bottom <= second.top ||
    first.top >= second.bottom
  );
}

function collectPositiveClaimHits(text) {
  const sourceText = String(text ?? "");
  const lowered = sourceText.toLowerCase();
  const hits = [];
  const isNegated = (index) => {
    const prefix = sourceText
      .slice(Math.max(0, index - 120), index)
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
            .slice(Math.max(0, index - 70), index + needle.length + 70)
            .replace(/\s+/g, " ")
            .trim()
        });
      }

      index = lowered.indexOf(needle, index + needle.length);
    }
  }

  return hits;
}

function assertVisibleForbiddenClaimScanClean(text, context) {
  const positiveClaimHits = collectPositiveClaimHits(text);
  const forbiddenUnitHits = FORBIDDEN_UNIT_PATTERNS.filter((pattern) =>
    pattern.test(text)
  ).map((pattern) => pattern.toString());

  assert(
    positiveClaimHits.length === 0 && forbiddenUnitHits.length === 0,
    "V4.9 visible forbidden-claim scan found promoted claim text: " +
      JSON.stringify({ context, positiveClaimHits, forbiddenUnitHits, text })
  );
}

function assertPrimaryMetadataDemoted(text, context) {
  const forbiddenPrimaryPatterns = [
    /oneweb-\d{4}-leo-display-context/i,
    /o3b-mpower-f\d-meo-display-context/i,
    /st-2-geo-continuity-anchor/i,
    /ses-9-geo-display-context/i,
    /m8a-v46e-simulation-/i,
    /m8a-v4-operator-family-endpoint-context-ribbon/i,
    /\braw ids?\b/i,
    /\bcue ids?\b/i,
    /\banchor metadata\b/i,
    /\bselected anchor\b/i,
    /\bselected cue\b/i,
    /\bcandidate actor ids?\b/i,
    /\bfallback actor ids?\b/i,
    /\bcandidateContextActorIds\b/i,
    /\bfallbackContextActorIds\b/i,
    /\brepresentative actor id\b/i
  ];

  assert(
    forbiddenPrimaryPatterns.every((pattern) => !pattern.test(text)),
    "V4.9 primary product copy exposed raw metadata that must stay demoted: " +
      JSON.stringify({ context, text })
  );
}

function assertRectInsideViewport(rect, viewport, context) {
  assert(
    rect &&
      rect.width > 0 &&
      rect.height > 0 &&
      rect.left >= -1 &&
      rect.top >= -1 &&
      rect.right <= viewport.width + 1 &&
      rect.bottom <= viewport.height + 1,
    "V4.9 visual surface escaped the viewport matrix bounds: " +
      JSON.stringify({ context, viewport, rect })
  );
}

function assertNoSurfaceOverlap(firstName, first, secondName, second, context) {
  if (!first?.visible || !second?.visible) {
    return;
  }

  assert(
    !rectsOverlap(first.rect, second.rect),
    "V4.9 visual evidence matrix found incoherent surface overlap: " +
      JSON.stringify({
        context,
        firstName,
        firstRect: first.rect,
        secondName,
        secondRect: second.rect
      })
  );
}

function assertDefaultVisualEvidence(result, expected, viewport) {
  const surfaces = result.visualSurfaces;
  const nativeSurfaces = [
    ["cesiumToolbar", surfaces.cesiumToolbar],
    ["cesiumAnimation", surfaces.cesiumAnimation],
    ["cesiumTimeline", surfaces.cesiumTimeline],
    ["cesiumCredits", surfaces.cesiumCredits]
  ];
  const minimumButtonHeight =
    viewport.expectedViewportClass === "narrow" ? 40 : 36;

  assert(
    result.viewport.width === viewport.width &&
      result.viewport.height === viewport.height,
    "V4.9 visual evidence viewport dimensions mismatch: " +
      JSON.stringify({ actual: result.viewport, expected: viewport })
  );
  assertRectInsideViewport(result.stripRect, viewport, {
    surface: "persistent-strip",
    windowId: result.activeWindowId,
    viewport: viewport.name
  });

  if (surfaces.annotation?.visible) {
    assertRectInsideViewport(surfaces.annotation.rect, viewport, {
      surface: "scene-near-annotation",
      windowId: result.activeWindowId,
      viewport: viewport.name
    });
    if (viewport.expectedViewportClass !== "narrow") {
      assertNoSurfaceOverlap("strip", surfaces.strip, "annotation", surfaces.annotation, {
        windowId: result.activeWindowId,
        viewport: viewport.name
      });
    }
    // Phase 5 smoke softening disclosure: Phase 4 spec v2 §8.2
    // supersedes the old V4.9 narrow strip/annotation non-overlap rule.
    // Narrow Details is now a full-screen modal flow; the default compact
    // control strip may share vertical space with the scene annotation while
    // both remain inside viewport bounds and primary controls stay reachable.
  }

  if (surfaces.transitionEvent?.visible) {
    assertRectInsideViewport(surfaces.transitionEvent.rect, viewport, {
      surface: "transition-event",
      windowId: result.activeWindowId,
      viewport: viewport.name
    });
    assertNoSurfaceOverlap(
      "strip",
      surfaces.strip,
      "transitionEvent",
      surfaces.transitionEvent,
      {
        windowId: result.activeWindowId,
        viewport: viewport.name
      }
    );
  }

  for (const [nativeName, nativeSurface] of nativeSurfaces) {
    assertNoSurfaceOverlap("strip", surfaces.strip, nativeName, nativeSurface, {
      windowId: result.activeWindowId,
      viewport: viewport.name
    });

    if (surfaces.annotation?.visible) {
      assertNoSurfaceOverlap(
        "annotation",
        surfaces.annotation,
        nativeName,
        nativeSurface,
        {
          windowId: result.activeWindowId,
          viewport: viewport.name
        }
      );
    }
  }

  for (const button of result.visibleButtons) {
    assert(
      button.rect.height >= minimumButtonHeight &&
        button.scrollWidth <= button.clientWidth + 2 &&
        button.scrollHeight <= button.clientHeight + 3,
      "V4.9 persistent control text must fit its hit target in the viewport matrix: " +
        JSON.stringify({
          button,
          expected,
          viewport: viewport.name
        })
    );
  }
}

function assertSceneNearMeaning(result, expected, viewport) {
  const annotationText = result.annotationText ?? "";
  const annotation = result.annotationDataset;
  const rootDataset = result.productRootDataset;
  const expectedMicroCue = EXPECTED_SLICE1_MICRO_CUES[result.activeWindowId];
  const slice1MicroCueVisible = annotationText.includes(expectedMicroCue);

  assertCleanSceneNearText(annotationText, {
    windowId: result.activeWindowId,
    viewportClass: result.viewportClass
  });
  assert(
    annotation.windowId === result.activeWindowId,
    "V4.9 scene-near annotation must map to the active V4.6D window: " +
      JSON.stringify({ annotation, activeWindowId: result.activeWindowId })
  );

  if (viewport.expectedViewportClass !== "desktop") {
    if (annotation.anchorStatus === "geometry-reliable") {
      assert(
        annotation.sceneNearMode === "scene-near-meaning" &&
          rootDataset.sceneNearMode === "scene-near-meaning",
        "V4.9 reliable narrow scene-near state must use the meaning layer: " +
          JSON.stringify({ annotation, rootDataset })
      );
    } else {
      assert(
        annotation.sceneNearMode === "persistent-layer-fallback" &&
          result.connectorVisible === false,
        "V4.9 narrow fallback must not render a connector or scene attachment: " +
          JSON.stringify(result)
      );
      return;
    }
  }

  assert(
    annotation.anchorStatus === "geometry-reliable" &&
      annotation.selectedAnchorType !== "non-scene-fallback" &&
      annotation.sceneNearMode === "scene-near-meaning" &&
      annotation.sceneNearMeaningVisible === "true" &&
      annotation.sceneNearCueVisible === "true" &&
      annotation.sceneNearFallbackVisible === "false" &&
      annotation.sceneNearAttachmentClaim ===
        "display-context-cue-attachment-only-when-geometry-reliable" &&
      rootDataset.sceneNearMode === "scene-near-meaning" &&
      rootDataset.sceneNearMeaningVisible === "true" &&
      rootDataset.sceneNearCueVisible === "true" &&
      rootDataset.sceneNearFallbackVisible === "false" &&
      rootDataset.sceneNearAttachmentClaim ===
        "display-context-cue-attachment-only-when-geometry-reliable" &&
      result.connectorVisible === true &&
      result.connectorDataset.attachmentClaim ===
        "display-context-cue-attachment-only-when-geometry-reliable",
    "V4.9 scene-near meaning must attach only through reliable geometry: " +
      JSON.stringify({ annotation, rootDataset, connector: result.connectorDataset })
  );
  const v49MeaningVisible =
    annotationText.includes(`Orbit focus: ${expected.orbitClassToken}`) &&
    annotationText.includes(expected.productLabel) &&
    annotationText.includes(expected.firstReadMessage) &&
    annotationText.includes(expected.watchCueLabel) &&
    annotationText.includes(expected.nextLine) &&
    result.sceneNearVisibleText.meaning === expected.firstReadMessage &&
    result.sceneNearVisibleText.cue === expected.watchCueLabel &&
    result.sceneNearVisibleText.next === expected.nextLine &&
    result.sceneNearVisibleText.fallback === "";
  const slice1MicroCueCompatible =
    slice1MicroCueVisible &&
    annotation.sceneNearMeaning === expected.firstReadMessage &&
    annotation.sceneNearCueLabel === expected.watchCueLabel &&
    annotation.nextLine === expected.nextLine;

  assert(
    v49MeaningVisible || slice1MicroCueCompatible,
    "V4.9 scene-near label must contain concise state-specific product meaning: " +
      JSON.stringify({
        annotationText,
        expectedMicroCue,
        sceneNearVisibleText: result.sceneNearVisibleText,
        annotation,
        expected
      })
  );
  assert(
    expected.firstReadMessage.length <= 90 &&
      annotationText.length <= 230,
    "V4.9 scene-near label text must remain short: " +
      JSON.stringify({ annotationText, expected })
  );
}

async function verifyForcedUnreliableAnchorFallback(client) {
  await setViewport(client, VIEWPORTS.desktop);
  await closeInspector(client);
  const expected = EXPECTED_PRODUCT_COPY["leo-acquisition-context"];
  await seekReplayRatio(client, expected.ratio);
  await evaluateRuntimeValue(
    client,
    `(() => {
      document.documentElement.dataset.m8aV48ForceSceneAnchorFallback = "true";
      window.__SCENARIO_GLOBE_VIEWER_CAPTURE__?.m8aV4GroundStationScene?.pause?.();
    })()`
  );
  await sleep(220);

  try {
    const result = await capturePersistentLayer(client);
    const annotation = result.annotationDataset;
    const expectedMicroCue = EXPECTED_SLICE1_MICRO_CUES[result.activeWindowId];
    const v49FallbackMeaningVisible =
      result.annotationText.includes(expected.firstReadMessage) &&
      !result.annotationText.includes(expected.watchCueLabel) &&
      result.annotationText.includes(expected.productLabel) &&
      result.annotationText.includes(expected.stateOrdinalLabel) &&
      result.annotationText.includes("no reliable scene attachment") &&
      result.sceneNearVisibleText.meaning === expected.firstReadMessage &&
      result.sceneNearVisibleText.cue === "" &&
      result.sceneNearVisibleText.fallback.includes(
        "no reliable scene attachment"
      );
    const slice1FallbackMicroCueCompatible =
      result.annotationText.includes(expectedMicroCue) &&
      annotation.sceneNearMeaning === expected.firstReadMessage &&
      annotation.sceneNearCueLabel === "" &&
      annotation.sceneNearFallbackText.includes(
        "no reliable scene attachment"
      );

    assert(
      result.activeWindowId === "leo-acquisition-context" &&
        annotation.anchorStatus === "fallback" &&
        annotation.selectedAnchorType === "non-scene-fallback" &&
        annotation.sceneNearMode === "persistent-layer-fallback" &&
        annotation.sceneNearMeaningVisible === "true" &&
        annotation.sceneNearCueVisible === "false" &&
        annotation.sceneNearFallbackVisible === "true" &&
        annotation.sceneNearAttachmentClaim === "no-scene-attachment-claimed" &&
        result.productRootDataset.sceneNearMode === "persistent-layer-fallback" &&
        result.productRootDataset.sceneNearAttachmentClaim ===
          "no-scene-attachment-claimed" &&
        result.connectorVisible === false &&
        result.connectorDataset.attachmentClaim === "no-scene-attachment-claimed",
      "V4.9 forced unreliable anchor must fall back without connector attachment: " +
        JSON.stringify(result)
    );
    assert(
      v49FallbackMeaningVisible || slice1FallbackMicroCueCompatible,
      "V4.9 unreliable fallback must keep state meaning visible and replace cue wording with explicit fallback: " +
        JSON.stringify(result)
    );
    assertCleanSceneNearText(result.annotationText, {
      windowId: result.activeWindowId,
      forcedFallback: true
    });
    assert(
      !/\b(attached to|serving satellite|active path|active service|teleport path|scene cue)\b/i.test(
        result.annotationText
      ),
      "V4.9 unreliable fallback must not pretend attachment to a satellite, path, or cue: " +
        JSON.stringify(result)
    );

    return {
      anchorStatus: annotation.anchorStatus,
      fallbackReason: annotation.fallbackReason,
      connectorVisible: result.connectorVisible,
      annotationText: result.annotationText
    };
  } finally {
    await evaluateRuntimeValue(
      client,
      `(() => {
        delete document.documentElement.dataset.m8aV48ForceSceneAnchorFallback;
      })()`
    );
    await sleep(160);
  }
}

async function verifyTruthAffordanceOpensBoundarySurface(client) {
  const result = await evaluateRuntimeValue(
    client,
    `(() => {
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
          rect.width > 0 &&
          rect.height > 0
        );
      };
      const root = document.querySelector("[data-m8a-v47-product-ux='true']");
      const truth = root?.querySelector("[data-m8a-v47-action='toggle-boundary']");
      const sheet = root?.querySelector("[data-m8a-v47-ui-surface='inspection-sheet']");
      const sheetClose = root?.querySelector("[data-m8a-v47-control-id='details-close']");
      const boundarySurface = root?.querySelector("[data-m8a-v410-boundary-surface='true']");
      const boundarySummary = boundarySurface?.querySelector("[data-m8a-v410-boundary-summary='true']");
      const boundarySecondary = boundarySurface?.querySelector("[data-m8a-v410-boundary-secondary='true']");
      const fullTruthDisclosure = boundarySurface?.querySelector("[data-m8a-v410-boundary-full-truth-disclosure='true']");

      if (!(truth instanceof HTMLElement)) {
        throw new Error("Missing Conv 3 footer boundary chip.");
      }

      if (sheet instanceof HTMLElement && !sheet.hidden) {
        sheetClose?.click();
      }

      if (!(boundarySurface instanceof HTMLElement) || boundarySurface.hidden) {
        truth.click();
      }

      const state =
        window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.m8aV4GroundStationScene.getState()
          .productUx.disclosure;

      return {
        disclosureState: state.state,
        detailsSheetState: state.detailsSheetState,
        boundarySurfaceState: state.boundarySurfaceState,
        truthAriaExpanded: truth.getAttribute("aria-expanded"),
        sheetVisible: isVisible(sheet),
        sheetText:
          sheet?.textContent?.replace(/\\s+/g, " ").trim() ?? "",
        boundarySurfaceVisible: isVisible(boundarySurface),
        boundarySurfaceText:
          boundarySurface?.textContent?.replace(/\\s+/g, " ").trim() ?? "",
        boundarySummaryText:
          boundarySummary?.textContent?.replace(/\\s+/g, " ").trim() ?? "",
        boundarySecondaryText:
          boundarySecondary?.textContent?.replace(/\\s+/g, " ").trim() ?? "",
        fullTruthDisclosureMounted:
          fullTruthDisclosure instanceof HTMLDetailsElement,
        fullTruthDisclosureOpen:
          fullTruthDisclosure instanceof HTMLDetailsElement
            ? fullTruthDisclosure.open
            : null
      };
    })()`
  );
  const sharedInspectorTruthOpen =
    result.disclosureState === "open" &&
    result.detailsSheetState === "closed" &&
    result.boundarySurfaceState === "open" &&
    result.truthAriaExpanded === "true" &&
    result.sheetVisible === true &&
    result.boundarySurfaceVisible === false &&
    /Truth Boundary/.test(result.sheetText) &&
    /Truth boundary/.test(result.sheetText) &&
    /not an operator handover log/i.test(result.sheetText) &&
    /No active gateway assignment is claimed/.test(result.sheetText) &&
    /No native RF handover is claimed/.test(result.sheetText) &&
    /Simulation review - not operator log/.test(result.boundarySurfaceText) &&
    /No active satellite, gateway, path, or measured metric claim/.test(
      result.boundarySurfaceText
    ) &&
    result.fullTruthDisclosureMounted === true;

  if (sharedInspectorTruthOpen) {
    await closeBoundarySurface(client);
    return result;
  }

  assert(
    result.disclosureState === "closed" &&
      result.detailsSheetState === "closed" &&
      result.boundarySurfaceState === "open" &&
      result.truthAriaExpanded === "true" &&
      result.sheetVisible === false &&
      result.boundarySurfaceVisible === true &&
      result.boundarySummaryText === "Simulation review - not operator log." &&
      result.boundarySecondaryText ===
        "No active satellite, gateway, path, or measured metric claim." &&
      result.fullTruthDisclosureMounted === true,
    "V4.9 compact truth affordance must open the focused boundary surface, not Details: " +
      JSON.stringify(result)
  );

  await closeBoundarySurface(client);

  return result;
}

async function captureInspectorLayer(client) {
  return await evaluateRuntimeValue(
    client,
    `(() => {
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
          rect.width > 0 &&
          rect.height > 0
        );
      };
      const normalize = (value) => (value ?? "").replace(/\\s+/g, " ").trim();
      const rectToPlain = (rect) => ({
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height
      });
      const validInfoClasses = new Set([
        "fixed",
        "dynamic",
        "disclosure",
        "control"
      ]);
      const visibleTextNodes = (scope) => {
        const nodes = [];
        const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);

        while (walker.nextNode()) {
          const node = walker.currentNode;
          const text = normalize(node.textContent);
          const parent = node.parentElement;

          if (text && parent && isVisible(parent)) {
            nodes.push(text);
          }
        }

        return nodes;
      };
      const visibleTextClassificationFailures = (scope) => {
        const failures = [];
        const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);

        while (walker.nextNode()) {
          const node = walker.currentNode;
          const text = normalize(node.textContent);
          const parent = node.parentElement;

          if (!text || !parent || !isVisible(parent)) {
            continue;
          }

          const classified = parent.closest("[data-m8a-v48-info-class]");
          const infoClass =
            classified?.getAttribute("data-m8a-v48-info-class") ?? null;

          if (!validInfoClasses.has(infoClass)) {
            failures.push({
              text,
              parent: parent.tagName.toLowerCase(),
              infoClass
            });
          }
        }

        return failures;
      };
      const root = document.querySelector("[data-m8a-v47-product-ux='true']");
      const details = root?.querySelector("[data-m8a-v47-control-id='details-toggle']");
      const strip = root?.querySelector("[data-m8a-v47-control-strip='true']");
      const sheet = root?.querySelector("[data-m8a-v47-ui-surface='inspection-sheet']");

      if (!(details instanceof HTMLButtonElement)) {
        throw new Error("Missing Details trigger for Slice 4 inspector.");
      }

      if (sheet instanceof HTMLElement && sheet.hidden) {
        details.click();
      }

      const state =
        window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.m8aV4GroundStationScene.getState();
      const primary = root?.querySelector("[data-m8a-v49-inspector-primary-body='true']");
      const debugEvidence = root?.querySelector("[data-m8a-v49-debug-evidence='true']");
      const truthBoundary = root?.querySelector("[data-m8a-v49-truth-boundary-details='true']");
      const primarySections = Array.from(
        primary?.querySelectorAll("[data-m8a-v49-inspector-primary]") ?? []
      );
      const sectionText = Object.fromEntries(
        primarySections.map((section) => [
          section.dataset.m8aV49InspectorPrimary,
          normalize(section.innerText)
        ])
      );

      return {
        state,
        activeWindowId: state.productUx.activeWindowId,
        activeProductLabel: state.productUx.activeProductLabel,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        stripText: normalize(strip?.innerText),
        stripRect: strip
          ? rectToPlain(strip.getBoundingClientRect())
          : null,
        detailsAriaExpanded: details.getAttribute("aria-expanded"),
        sheetVisible: isVisible(sheet),
        sheetRect: sheet
          ? rectToPlain(sheet.getBoundingClientRect())
          : null,
        visibleTextClassificationFailures: root
          ? visibleTextClassificationFailures(root)
          : [],
        sheetDataset: {
          inspectorLayer: sheet?.dataset.m8aV49InspectorLayer ?? null,
          primaryVisibleContent:
            sheet?.dataset.m8aV49InspectorPrimaryVisibleContent ?? null,
          deniedPrimaryContent:
            sheet?.dataset.m8aV49InspectorDeniedPrimaryContent ?? null,
          debugEvidenceContent:
            sheet?.dataset.m8aV49InspectorDebugEvidenceContent ?? null,
          debugEvidenceDefaultOpen:
            sheet?.dataset.m8aV49InspectorDebugEvidenceDefaultOpen ?? null,
          truthBoundaryPlacement:
            sheet?.dataset.m8aV49InspectorTruthBoundaryPlacement ?? null,
          metadataPolicy: sheet?.dataset.m8aV49InspectorMetadataPolicy ?? null
        },
        primary: {
          visible: isVisible(primary),
          text: normalize(primary?.innerText),
          labels: primarySections.map((section) =>
            normalize(section.querySelector("span")?.textContent)
          ),
          sections: sectionText,
          dataset: {
            windowId: primary?.dataset.m8aV48WindowId ?? null,
            primaryVisibleContent:
              primary?.dataset.m8aV49PrimaryVisibleContent ?? null,
            deniedPrimaryContent:
              primary?.dataset.m8aV49DeniedPrimaryContent ?? null
          }
        },
        debugEvidence: {
          visible: isVisible(debugEvidence),
          open: debugEvidence instanceof HTMLDetailsElement
            ? debugEvidence.open
            : null,
          summaryText: normalize(
            debugEvidence?.querySelector("summary")?.textContent
          ),
          visibleText: debugEvidence instanceof HTMLElement
            ? visibleTextNodes(debugEvidence).join(" ")
            : "",
          textContent: normalize(debugEvidence?.textContent),
          dataset: {
            defaultOpen:
              debugEvidence?.dataset.m8aV49DebugEvidenceDefaultOpen ?? null,
            content:
              debugEvidence?.dataset.m8aV49DebugEvidenceContent ?? null,
            open:
              debugEvidence?.dataset.m8aV49DebugEvidenceOpen ?? null
          }
        },
        truthBoundary: {
          visible: isVisible(truthBoundary),
          open: truthBoundary instanceof HTMLDetailsElement
            ? truthBoundary.open
            : null,
          summaryText: normalize(
            truthBoundary?.querySelector("summary")?.textContent
          ),
          visibleText: truthBoundary instanceof HTMLElement
            ? visibleTextNodes(truthBoundary).join(" ")
            : "",
          textContent: normalize(truthBoundary?.textContent),
          dataset: {
            placement:
              truthBoundary?.dataset.m8aV49TruthBoundaryPlacement ?? null,
            open:
              truthBoundary?.dataset.m8aV49TruthBoundaryOpen ?? null
          }
        }
      };
    })()`
  );
}

function assertInspectorPrimaryClean(result, expected) {
  const primaryText = result.primary.text;
  const debugVisibleText = result.debugEvidence.visibleText;
  const forbiddenPrimaryPatterns = [
    /oneweb-\d{4}-leo-display-context/i,
    /o3b-mpower-f\d-meo-display-context/i,
    /st-2-geo-continuity-anchor/i,
    /ses-9-geo-display-context/i,
    /m8a-v46e-simulation-/i,
    /m8a-v4-operator-family-endpoint-context-ribbon/i,
    /displayRepresentative primary/i,
    /candidateContext/i,
    /fallbackContext/i,
    /selected actor/i,
    /selected cue/i,
    /selected anchor/i,
    /selected corridor/i,
    /anchor metadata/i,
    /raw ids/i,
    /cue ids/i,
    /Candidate actor ids/i,
    /Fallback actor ids/i,
    /Representative actor id/i
  ];

  assert(
    forbiddenPrimaryPatterns.every((pattern) => !pattern.test(primaryText)),
    "V4.9 Slice 4 primary inspector exposed raw ids or metadata: " +
      JSON.stringify({ primaryText, expected })
  );
  assert(
    forbiddenPrimaryPatterns.every((pattern) => !pattern.test(debugVisibleText)),
    "V4.9 Slice 4 closed debug evidence leaked raw ids into visible text: " +
      JSON.stringify({ debugVisibleText, expected })
  );
}

function assertInspectorVisualEvidence(result, expected, viewport) {
  assert(
    result.viewport.width === viewport.width &&
      result.viewport.height === viewport.height,
    "V4.9 inspector visual evidence viewport dimensions mismatch: " +
      JSON.stringify({ actual: result.viewport, expected: viewport })
  );
  assertRectInsideViewport(result.stripRect, viewport, {
    surface: "persistent-strip-with-inspector-open",
    windowId: result.activeWindowId,
    viewport: viewport.name
  });
  assertRectInsideViewport(result.sheetRect, viewport, {
    surface: "inspection-sheet",
    windowId: result.activeWindowId,
    viewport: viewport.name
  });
  if (viewport.expectedViewportClass === "narrow") {
    // Phase 4 (spec v2 §8.2) supersedes the V4.9 narrow non-overlap rule:
    // narrow Details now opens as a full-screen modal (min-height: 100dvh,
    // safe-area, focus trap) and is intentionally above the strip when open.
    // The desktop class still requires the persistent-strip / sheet
    // non-overlap contract.
  } else {
    assert(
      !rectsOverlap(result.stripRect, result.sheetRect),
      "V4.9 inspector sheet must not cover the persistent current-state strip: " +
        JSON.stringify({
          viewport: viewport.name,
          windowId: result.activeWindowId,
          stripRect: result.stripRect,
          sheetRect: result.sheetRect
        })
    );
  }
  assert(
    result.stripText.includes(expected.productLabel) &&
      result.stripText.includes(expected.stateOrdinalLabel),
    "V4.9 inspector-open viewport must retain first-read current-state context in the persistent layer: " +
      JSON.stringify({
        viewport: viewport.name,
        stripText: result.stripText,
        expected
      })
  );
  if (viewport.expectedViewportClass === "narrow") {
    // Phase 4 (spec v2 §8.2) supersedes the V4.9 narrow secondary-sheet height
    // rule: narrow Details now opens as a full-screen modal (100dvh, safe-area,
    // focus trap), so the sheet intentionally fills the viewport.
  } else {
    assert(
      result.sheetRect.height < viewport.height * 0.64 ||
        (viewport.expectedViewportClass === "desktop" &&
          result.sheetRect.left > viewport.width * 0.7 &&
          result.sheetRect.bottom <= viewport.height - 24),
      "V4.9 inspector sheet must remain secondary or use the Correction A right-docked inspector geometry: " +
        JSON.stringify({
          viewport: viewport.name,
          sheetRect: result.sheetRect
        })
    );
  }
  assert(
    result.visibleTextClassificationFailures.length === 0,
    "V4.9 inspector-open visible product text must keep valid info classifications: " +
      JSON.stringify(result.visibleTextClassificationFailures)
  );
  assertVisibleForbiddenClaimScanClean(result.primary.text, {
    surface: "primary-inspector",
    windowId: result.activeWindowId,
    viewport: viewport.name
  });
}

function assertInspectorLayer(result, expected, viewport = VIEWPORTS.desktop) {
  const review = result.state.productUx.reviewViewModel;
  const primary = result.primary;
  const debugEvidence = result.debugEvidence;
  const truthBoundary = result.truthBoundary;
  const v411StateEvidenceInspector =
    primary.labels.some((label) => label.includes("State Evidence")) &&
    primary.labels.some((label) => label.includes("Truth Boundary")) &&
    primary.labels.includes("Evidence");

  assert(
    result.sheetVisible === true &&
      result.detailsAriaExpanded === "true" &&
      primary.visible === true,
    "V4.9 Slice 4 Details path must open the primary inspector: " +
      JSON.stringify(result)
  );
  assert(
    result.sheetDataset.inspectorLayer === EXPECTED_V49_SCOPE &&
      result.sheetDataset.primaryVisibleContent ===
        EXPECTED_INSPECTOR_PRIMARY_CONTENT.join("|") &&
      result.sheetDataset.deniedPrimaryContent ===
        EXPECTED_INSPECTOR_DENIED_PRIMARY_CONTENT.join("|") &&
      result.sheetDataset.debugEvidenceContent ===
        EXPECTED_INSPECTOR_DEBUG_CONTENT.join("|") &&
      result.sheetDataset.debugEvidenceDefaultOpen === "false" &&
      result.sheetDataset.truthBoundaryPlacement ===
        "concise-primary-summary-full-secondary-disclosure" &&
      result.sheetDataset.metadataPolicy ===
        "raw-ids-and-arrays-collapsed-implementation-evidence" &&
      primary.dataset.primaryVisibleContent ===
        EXPECTED_INSPECTOR_PRIMARY_CONTENT.join("|") &&
      primary.dataset.deniedPrimaryContent ===
        EXPECTED_INSPECTOR_DENIED_PRIMARY_CONTENT.join("|"),
    "V4.9 Slice 4 inspector sheet dataset mismatch: " +
      JSON.stringify({ sheetDataset: result.sheetDataset, primaryDataset: primary.dataset })
  );
  if (v411StateEvidenceInspector) {
    assert(
      primary.labels.some((label) => label.includes("Truth Boundary")) &&
        primary.text.includes(expected.productLabel) &&
        (primary.text.includes(expected.stateOrdinalLabel) ||
          /window [1-5] of 5/i.test(primary.text)) &&
        truthBoundary.visible === false,
      "V4.11 State Evidence role must preserve V4.9 inspector state context without opening Truth Boundary: " +
        JSON.stringify({
          labels: primary.labels,
          primaryText: primary.text,
          truthBoundary
        })
    );
  } else {
    assert(
      JSON.stringify(primary.labels) === JSON.stringify(EXPECTED_INSPECTOR_LABELS),
      "V4.9 Slice 4 primary inspector labels mismatch: " +
        JSON.stringify(primary.labels)
    );
    assert(
      primary.sections["current-state"].includes(expected.productLabel) &&
        primary.sections["current-state"].includes(expected.stateOrdinalLabel) &&
        primary.sections["current-state"].includes(expected.firstReadMessage) &&
        primary.sections.why.includes(review.reviewPurpose) &&
        primary.sections.changed.includes(review.whatChangedFromPreviousState) &&
        primary.sections.watch.includes(review.whatToWatch) &&
        primary.sections.next.includes(review.nextStateHint) &&
        primary.sections.boundary.includes(review.truthBoundarySummary),
      "V4.9 Slice 4 primary inspector content must be state-specific and complete: " +
        JSON.stringify({ sections: primary.sections, review, expected })
    );
  }
  assertInspectorPrimaryClean(result, expected);
  assertInspectorVisualEvidence(result, expected, viewport);
  if (v411StateEvidenceInspector) {
    assert(
      debugEvidence.visible === true &&
        debugEvidence.open === false &&
        debugEvidence.summaryText === "Implementation evidence" &&
        /implementation evidence/i.test(debugEvidence.visibleText) &&
        /Raw ids/i.test(debugEvidence.textContent),
      "V4.11 implementation evidence must exist but stay collapsed by default: " +
        JSON.stringify(debugEvidence)
    );
  } else {
    assert(
      debugEvidence.visible === true &&
        debugEvidence.open === false &&
        debugEvidence.dataset.defaultOpen === "false" &&
        debugEvidence.dataset.open === "false" &&
        debugEvidence.dataset.content === EXPECTED_INSPECTOR_DEBUG_CONTENT.join("|") &&
        debugEvidence.summaryText === "Implementation evidence" &&
        /implementation evidence/i.test(debugEvidence.visibleText) &&
        /not the primary product explanation/i.test(debugEvidence.textContent) &&
        /oneweb-\d{4}-leo-display-context|o3b-mpower-f\d-meo-display-context|st-2-geo-continuity-anchor|ses-9-geo-display-context/i.test(
          debugEvidence.textContent
        ) &&
        /m8a-v46e-simulation-|m8a-v4-operator-family-endpoint-context-ribbon|selected actor|selected cue|fallback/i.test(
          debugEvidence.textContent
        ),
      "V4.9 Slice 4 debug/evidence metadata must exist but stay collapsed by default: " +
        JSON.stringify(debugEvidence)
    );
  }
  assertPrimaryMetadataDemoted(debugEvidence.visibleText, {
    surface: "closed-implementation-evidence-summary",
    windowId: result.activeWindowId,
    viewport: viewport.name
  });
  if (v411StateEvidenceInspector) {
    assert(
      truthBoundary.visible === false &&
        /Truth Boundary/.test(truthBoundary.textContent) &&
        /No active gateway assignment is claimed/i.test(
          truthBoundary.textContent
        ) &&
        /No native RF handover is claimed/i.test(truthBoundary.textContent) &&
        truthBoundary.visibleText === "",
      "V4.11 Truth Boundary role must remain available but closed when Details opens State Evidence: " +
        JSON.stringify(truthBoundary)
    );
  } else {
    assert(
      truthBoundary.visible === true &&
        truthBoundary.open === false &&
        truthBoundary.summaryText === "Full truth boundary" &&
        truthBoundary.dataset.placement ===
          "concise-primary-summary-full-secondary-disclosure" &&
        truthBoundary.dataset.open === "false" &&
        /Full truth boundary/i.test(truthBoundary.visibleText) &&
        /No active gateway assignment is claimed/i.test(truthBoundary.textContent) &&
        /No native RF handover is claimed/i.test(truthBoundary.textContent),
      "V4.9 Slice 4 truth boundary must remain available without replacing primary explanation: " +
        JSON.stringify(truthBoundary)
    );
    assert(
      !/No active gateway assignment is claimed|No native RF handover is claimed|simulation output|operator-family precision|display-context actors/i.test(
        truthBoundary.visibleText
      ),
      "V4.9 closed Full truth boundary must not leak full disclosure text into the primary inspector view: " +
        JSON.stringify(truthBoundary)
    );
  }
}

async function verifyInspectorLayerForWindows(
  client,
  viewport,
  windowIds = EXPECTED_WINDOW_IDS
) {
  await setViewport(client, viewport);
  await closeInspector(client);

  const primaryTexts = [];
  const results = [];

  for (const windowId of windowIds) {
    const expected = EXPECTED_PRODUCT_COPY[windowId];

    await seekReplayRatio(client, expected.ratio);

    const result = await captureInspectorLayer(client);

    assert(
      result.activeWindowId === windowId &&
        result.activeProductLabel === expected.productLabel,
      "V4.9 Slice 5 inspector matrix did not reach the expected active window: " +
        JSON.stringify({ result, expected, windowId, viewport })
    );
    assertInspectorLayer(result, expected, viewport);

    primaryTexts.push(result.primary.text);
    results.push({
      viewport: viewport.name,
      windowId,
      productLabel: expected.productLabel,
      labels: result.primary.labels,
      debugEvidenceOpen: result.debugEvidence.open,
      truthBoundaryOpen: result.truthBoundary.open,
      sheetHeight: result.sheetRect.height
    });

    await closeInspector(client);
  }

  if (windowIds.length === EXPECTED_WINDOW_IDS.length) {
    assert(
      new Set(primaryTexts).size === EXPECTED_WINDOW_IDS.length,
      "V4.9 Slice 4 primary inspector body must change across all five windows: " +
        JSON.stringify(primaryTexts)
    );
  }

  return results;
}

function expectedTransitionContext(expectedTo) {
  if (expectedTo.orbitClassToken === "MEO") {
    return "Continuity shifts to MEO review context";
  }

  if (expectedTo.orbitClassToken === "GEO") {
    return "Continuity guard shifts to GEO guard context";
  }

  return "Review context shifts to LEO focus";
}

function assertTransitionEvent(result, expectedFrom, expectedTo) {
  const transition = result.transitionEvent;
  const layer = result.state.productUx.productComprehension.transitionEventLayer;
  const activeEvent = layer.activeEvent;
  const expectedSummary = `${EXPECTED_TRANSITION_LABELS[expectedFrom.windowId]} -> ${EXPECTED_TRANSITION_LABELS[expectedTo.windowId]}`;
  const expectedContext = expectedTransitionContext(expectedTo);
  const expectedMicroCue = EXPECTED_SLICE1_MICRO_CUES[expectedTo.windowId];
  const currentSceneContextVisible =
    result.sceneNearVisibleText.meaning === expectedTo.firstReadMessage ||
    (result.annotationText ?? "").includes(expectedMicroCue);

  assert(
    result.activeWindowId === expectedTo.windowId ||
      result.activeProductLabel === expectedTo.productLabel,
    "V4.9 transition test must capture the target active window: " +
      JSON.stringify({
        activeWindowId: result.activeWindowId,
        activeProductLabel: result.activeProductLabel,
        expectedTo
      })
  );
  assert(
    transition.visible === true &&
      result.productRootDataset.transitionEventVisible === "true" &&
      transition.dataset.visible === "true" &&
      activeEvent,
    "V4.9 transition event must be visible after a V4.6D window change: " +
      JSON.stringify({ transition, productRootDataset: result.productRootDataset, layer })
  );
  assert(
    activeEvent.fromProductLabel === expectedFrom.productLabel &&
      activeEvent.toProductLabel === expectedTo.productLabel &&
      activeEvent.summaryText === expectedSummary &&
      activeEvent.contextText === expectedContext &&
      activeEvent.durationMs === EXPECTED_TRANSITION_DURATION_MS &&
      activeEvent.source === "active-v46d-window-id-change" &&
      activeEvent.stateTruthSource === "persistent-and-scene-near-layers" &&
      activeEvent.blocksControls === false &&
      activeEvent.requiresUserAction === false,
    "V4.9 transition event state seam must be concise and window-change sourced: " +
      JSON.stringify({ activeEvent, expectedSummary, expectedContext })
  );
  assert(
    transition.summary === expectedSummary &&
      transition.context === expectedContext &&
      transition.text === `${expectedSummary} ${expectedContext}` &&
      result.productRootDataset.transitionEventText === expectedSummary &&
      result.productRootDataset.transitionEventContext === expectedContext &&
      transition.dataset.fromLabel === expectedFrom.productLabel &&
      transition.dataset.toLabel === expectedTo.productLabel &&
      transition.dataset.durationMs === String(EXPECTED_TRANSITION_DURATION_MS) &&
      transition.dataset.stateTruthSource === "persistent-and-scene-near-layers" &&
      transition.dataset.nonBlocking === "non-blocking-no-user-action",
    "V4.9 transition visible text/dataset mismatch: " +
      JSON.stringify({ transition, productRootDataset: result.productRootDataset })
  );
  assert(
    transition.summary.length <= 32 && transition.context.length <= 62,
    "V4.9 transition text must remain concise: " +
      JSON.stringify(transition)
  );
  assertCleanTransitionText(transition.text, {
    from: expectedFrom.productLabel,
    to: expectedTo.productLabel
  });
  assert(
    transition.pointerEvents === "none",
    "V4.9 transition event must not intercept pointer controls: " +
      JSON.stringify(transition)
  );
  assertDefaultVisualEvidence(result, expectedTo, VIEWPORTS.desktop);
  assert(
    result.stripText.includes(expectedTo.productLabel) &&
      currentSceneContextVisible,
    "V4.9 transition event must not be the only current-state truth source: " +
      JSON.stringify({
        stripText: result.stripText,
        annotationText: result.annotationText,
        expectedMicroCue,
        sceneNearVisibleText: result.sceneNearVisibleText,
        expectedTo
      })
  );

  if (result.annotationDataset.anchorStatus === "geometry-reliable") {
    assert(
      !rectsOverlap(transition.rect, result.annotationRect),
      "V4.9 transition event must not cover the selected reliable scene cue: " +
        JSON.stringify({
          transitionRect: transition.rect,
          annotationRect: result.annotationRect,
          transitionPlacement: transition.dataset.placement
        })
    );
  }
}

function expectedTransitionSummary(expectedFrom, expectedTo) {
  return `${EXPECTED_TRANSITION_LABELS[expectedFrom.windowId]} -> ${EXPECTED_TRANSITION_LABELS[expectedTo.windowId]}`;
}

async function waitForTransitionEvent(client, expectedFrom, expectedTo) {
  let lastResult = null;

  for (let attempt = 0; attempt < 30; attempt += 1) {
    lastResult = await capturePersistentLayer(client);

    if (
      lastResult.transitionEvent.visible &&
      lastResult.transitionEvent.summary ===
        expectedTransitionSummary(expectedFrom, expectedTo)
    ) {
      assertTransitionEvent(lastResult, expectedFrom, expectedTo);
      return lastResult;
    }

    await sleep(80);
  }

  throw new Error(
    "V4.9 transition event did not appear for expected window change: " +
      JSON.stringify({
        from: expectedFrom.productLabel,
        to: expectedTo.productLabel,
        lastResult
      })
  );
}

async function triggerTransition(client, fromExpected, toExpected) {
  await closeInspector(client);
  await seekReplayRatio(client, fromExpected.ratio);

  const fromResult = await capturePersistentLayer(client);

  assert(
    fromResult.activeProductLabel === fromExpected.productLabel,
    "V4.9 transition test failed to establish source window: " +
      JSON.stringify({
        activeProductLabel: fromResult.activeProductLabel,
        fromExpected
      })
  );

  await seekReplayRatio(client, toExpected.ratio);

  return await waitForTransitionEvent(client, fromExpected, toExpected);
}

async function verifyTransitionInitialState(client) {
  await setViewport(client, VIEWPORTS.desktop);
  await closeInspector(client);
  const expected = EXPECTED_PRODUCT_COPY["leo-acquisition-context"];

  await seekReplayRatio(client, expected.ratio);

  const initial = await capturePersistentLayer(client);

  assert(
    initial.activeProductLabel === expected.productLabel &&
      initial.transitionEvent.visible === false &&
      initial.state.productUx.productComprehension.transitionEventLayer
        .activeEvent === null &&
      initial.productRootDataset.transitionEventVisible === "false",
    "V4.9 transition event must not be visible before a window change: " +
      JSON.stringify(initial.transitionEvent)
  );

  await seekReplayRatio(client, 0.12);

  const sameWindow = await capturePersistentLayer(client);

  assert(
    sameWindow.activeProductLabel === expected.productLabel &&
      sameWindow.transitionEvent.visible === false &&
      sameWindow.state.productUx.productComprehension.transitionEventLayer
        .activeEvent === null,
    "V4.9 transition event must not appear for same-window replay movement: " +
      JSON.stringify(sameWindow.transitionEvent)
  );

  return {
    initialVisible: initial.transitionEvent.visible,
    sameWindowVisible: sameWindow.transitionEvent.visible
  };
}

async function verifyTransitionTimeout(client, visibleResult) {
  await sleep(1200);

  const midDuration = await capturePersistentLayer(client);
  const midDurationStillVisible =
    midDuration.transitionEvent.visible === true &&
    midDuration.transitionEvent.summary === visibleResult.transitionEvent.summary;

  assert(
    midDuration.transitionEvent.visible === false || midDurationStillVisible,
    "V4.9 transition event mid-duration state must either preserve the same event or be closed: " +
      JSON.stringify({
        initial: visibleResult.transitionEvent,
        midDuration: midDuration.transitionEvent
      })
  );

  await sleep(midDurationStillVisible ? 1900 : 100);

  const afterTimeout = await capturePersistentLayer(client);

  assert(
    afterTimeout.transitionEvent.visible === false &&
      afterTimeout.productRootDataset.transitionEventVisible === "false" &&
      afterTimeout.state.productUx.productComprehension.transitionEventLayer
        .activeEvent === null,
    "V4.9 transition event must disappear within the accepted 2-3 second duration: " +
      JSON.stringify(afterTimeout.transitionEvent)
  );

  return {
    midDurationVisible: midDuration.transitionEvent.visible,
    midDurationStillVisible,
    afterTimeoutVisible: afterTimeout.transitionEvent.visible,
    durationMs: EXPECTED_TRANSITION_DURATION_MS
  };
}

async function clickAt(client, point) {
  await client.send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: point.x,
    y: point.y,
    button: "left",
    clickCount: 1
  });
  await client.send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: point.x,
    y: point.y,
    button: "left",
    clickCount: 1
  });
}

async function captureControlHitTargets(client) {
  return await evaluateRuntimeValue(
    client,
    `(() => {
      const root = document.querySelector("[data-m8a-v47-product-ux='true']");
      const transitionEvent = root?.querySelector("[data-m8a-v49-transition-event='true']");
      // Conv 3 minimal update: Truth button removed; footer chip with toggle-boundary replaces it
      const controls = {
        playPause: "[data-m8a-v47-control-id='play-pause']",
        restart: "[data-m8a-v47-control-id='restart']",
        speed120: "[data-m8a-v47-playback-multiplier='120']",
        details: "[data-m8a-v47-control-id='details-toggle']",
        truth: "[data-m8a-v47-action='toggle-boundary']"
      };
      const centerOf = (element) => {
        const rect = element.getBoundingClientRect();
        return {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
          rect: {
            left: rect.left,
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            width: rect.width,
            height: rect.height
          }
        };
      };

      return Object.fromEntries(
        Object.entries(controls).map(([name, selector]) => {
          const element = root?.querySelector(selector);

          if (!(element instanceof HTMLElement)) {
            return [name, { missing: true }];
          }

          const center = centerOf(element);
          const hit = document.elementFromPoint(center.x, center.y);
          const hitControl = hit?.closest(
            "[data-m8a-v47-control-id], [data-m8a-v47-playback-multiplier], [data-m8a-v49-truth-affordance]"
          );

          return [
            name,
            {
              missing: false,
              center,
              hitText: hitControl?.textContent?.replace(/\\s+/g, " ").trim() ?? "",
              hitControlId: hitControl?.dataset.m8aV47ControlId ?? null,
              hitMultiplier: hitControl?.dataset.m8aV47PlaybackMultiplier ?? null,
              hitTruth:
                hitControl?.dataset.m8aV49TruthAffordance ?? null,
              transitionVisible:
                transitionEvent instanceof HTMLElement &&
                transitionEvent.hidden !== true &&
                getComputedStyle(transitionEvent).display !== "none"
            }
          ];
        })
      );
    })()`
  );
}

async function verifyTransitionControlsNonBlocking(client) {
  const fromExpected = EXPECTED_PRODUCT_COPY["meo-continuity-hold"];
  const toExpected = EXPECTED_PRODUCT_COPY["leo-reentry-candidate"];
  const visibleResult = await triggerTransition(
    client,
    fromExpected,
    toExpected
  );
  const hitTargets = await captureControlHitTargets(client);
  // Conv 3 minimal update: Truth button removed; footer chip with toggle-boundary used instead
  const expectedHits = {
    playPause: { controlId: "play-pause" },
    restart: { controlId: "restart" },
    speed120: { multiplier: "120" },
    details: { controlId: "details-toggle" },
    truth: {}  // footer chip hit — no controlId/multiplier/truth attr check, just missing=false
  };

  for (const [name, expected] of Object.entries(expectedHits)) {
    const target = hitTargets[name];

    assert(
      target?.missing === false &&
        target.transitionVisible === true &&
        (!expected.controlId || target.hitControlId === expected.controlId) &&
        (!expected.multiplier || target.hitMultiplier === expected.multiplier) &&
        (!expected.truth || target.hitTruth === expected.truth),
      "V4.9 transition event must not intercept persistent controls: " +
        JSON.stringify({ name, target, expected, hitTargets })
    );
  }

  await clickAt(client, hitTargets.playPause.center);
  await sleep(120);

  let state = await capturePersistentLayer(client);
  assert(
    state.state.productUx.playback.status === "playing",
    "V4.9 play control must work while transition event is visible: " +
      JSON.stringify(state.state.productUx.playback)
  );

  await clickAt(client, hitTargets.playPause.center);
  await sleep(120);
  state = await capturePersistentLayer(client);
  assert(
    state.state.productUx.playback.status === "paused",
    "V4.9 pause control must work while transition event is visible: " +
      JSON.stringify(state.state.productUx.playback)
  );

  await clickAt(client, hitTargets.speed120.center);
  await sleep(120);
  state = await capturePersistentLayer(client);
  assert(
    state.state.productUx.playback.multiplier === 120,
    "V4.9 speed control must work while transition event is visible: " +
      JSON.stringify(state.state.productUx.playback)
  );

  await clickAt(client, hitTargets.details.center);
  await sleep(120);
  state = await capturePersistentLayer(client);
  assert(
    state.state.productUx.disclosure.state === "open" &&
      state.sheetVisible === true &&
      state.boundarySurfaceVisible === false,
    "V4.9 details control must work while transition event is visible: " +
      JSON.stringify({
        disclosure: state.state.productUx.disclosure,
        sheetVisible: state.sheetVisible,
        boundarySurfaceVisible: state.boundarySurfaceVisible
      })
  );
  await closeInspector(client);

  // Conv 3 minimal update: Truth button removed; footer chip with toggle-boundary replaces it
  await clickAt(client, hitTargets.truth.center);
  await sleep(120);
  state = await capturePersistentLayer(client);
  const sharedInspectorTruthOpen =
    state.state.productUx.disclosure.state === "open" &&
    state.state.productUx.disclosure.detailsSheetState === "closed" &&
    state.state.productUx.disclosure.boundarySurfaceState === "open" &&
    state.sheetVisible === true &&
    state.boundarySurfaceVisible === false &&
    state.state.productUx.disclosure.lines?.includes(
      "No active gateway assignment is claimed."
    ) &&
    state.state.productUx.disclosure.lines?.includes(
      "No native RF handover is claimed."
    );
  assert(
    sharedInspectorTruthOpen ||
      (state.state.productUx.disclosure.state === "closed" &&
        state.state.productUx.disclosure.detailsSheetState === "closed" &&
        state.state.productUx.disclosure.boundarySurfaceState === "open" &&
        state.sheetVisible === false &&
        state.boundarySurfaceVisible === true),
    "V4.9 truth affordance must open the focused boundary surface while transition event is visible: " +
      JSON.stringify({
        disclosure: state.state.productUx.disclosure,
        sheetVisible: state.sheetVisible,
        boundarySurfaceVisible: state.boundarySurfaceVisible
      })
  );
  await closeBoundarySurface(client);

  await clickAt(client, hitTargets.restart.center);
  await sleep(160);
  state = await capturePersistentLayer(client);
  assert(
    state.activeProductLabel ===
      EXPECTED_PRODUCT_COPY["leo-acquisition-context"].productLabel,
    "V4.9 restart control must work while transition event is visible: " +
      JSON.stringify({
        activeProductLabel: state.activeProductLabel,
        activeWindowId: state.activeWindowId
      })
  );

  return {
    visibleTransition: visibleResult.transitionEvent.text,
    hitTargets,
    restartWindow: state.activeWindowId
  };
}

async function verifyTransitionEventLayer(client) {
  const initialState = await verifyTransitionInitialState(client);
  const firstTransition = await triggerTransition(
    client,
    EXPECTED_PRODUCT_COPY["leo-acquisition-context"],
    EXPECTED_PRODUCT_COPY["leo-aging-pressure"]
  );
  const firstTimeout = await verifyTransitionTimeout(client, firstTransition);
  const secondTransition = await triggerTransition(
    client,
    EXPECTED_PRODUCT_COPY["leo-aging-pressure"],
    EXPECTED_PRODUCT_COPY["meo-continuity-hold"]
  );
  const secondTimeout = await verifyTransitionTimeout(client, secondTransition);
  const nonBlockingControls = await verifyTransitionControlsNonBlocking(client);

  return {
    initialState,
    transitions: [
      {
        text: firstTransition.transitionEvent.text,
        placement: firstTransition.transitionEvent.dataset.placement,
        timeout: firstTimeout
      },
      {
        text: secondTransition.transitionEvent.text,
        placement: secondTransition.transitionEvent.dataset.placement,
        timeout: secondTimeout
      }
    ],
    nonBlockingControls
  };
}

async function verifyViewport(client, viewport) {
  await setViewport(client, viewport);
  await sleep(180);

  const results = [];

  for (const [windowId, expected] of Object.entries(EXPECTED_PRODUCT_COPY)) {
    await closeInspector(client);
    await seekReplayRatio(client, expected.ratio);

    const result = await capturePersistentLayer(client);

    assert(
      result.activeWindowId === windowId &&
        result.activeProductLabel === expected.productLabel,
      "V4.9 active state did not match expected replay window: " +
        JSON.stringify({
          activeWindowId: result.activeWindowId,
          activeProductLabel: result.activeProductLabel,
          expectedWindowId: windowId,
          expectedProductLabel: expected.productLabel
        })
    );
    assertPreservedScenarioFacts(result);
    assertProductCopy(result, expected);
    assertPersistentLayer(result, expected, viewport);
    assertSceneNearMeaning(result, expected, viewport);
    assertDefaultVisualEvidence(result, expected, viewport);

    results.push({
      viewport: viewport.name,
      windowId,
      productLabel: expected.productLabel,
      stripText: result.stripText,
      stripRect: result.stripRect,
      annotationRect: result.annotationRect,
      transitionVisible: result.transitionEvent.visible,
      transitionRect: result.transitionEvent.rect,
      sceneNearMode: result.annotationDataset.sceneNearMode,
      anchorStatus: result.annotationDataset.anchorStatus,
      textClassificationFailures:
        result.visibleTextClassificationFailures.length,
      resourceHits: result.resourceHits.length
    });
  }

  return results;
}

async function main() {
  ensureDistBuildExists();

  const browserCommand = findHeadlessBrowser();
  let serverHandle = null;
  let browserHandle = null;
  let client = null;

  try {
    serverHandle = await startStaticServer();
    await verifyFetches(serverHandle.baseUrl);

    browserHandle = await startHeadlessBrowser(browserCommand);
    const pageWebSocketUrl = await resolvePageWebSocketUrl(
      browserHandle.browserWebSocketUrl
    );
    client = await connectCdp(pageWebSocketUrl);
    await client.send("Page.enable");
    await client.send("Runtime.enable");

    await setViewport(client, VIEWPORTS.desktop);
    await navigateAndWait(client, serverHandle.baseUrl);

    const transitionEventLayer = await verifyTransitionEventLayer(client);
    await sleep(EXPECTED_TRANSITION_DURATION_MS + 250);
    const desktopResults = await verifyViewport(client, VIEWPORTS.desktop);
    const desktopCompactResults = await verifyViewport(
      client,
      VIEWPORTS.desktopCompact
    );
    const inspectorLayer = await verifyInspectorLayerForWindows(
      client,
      VIEWPORTS.desktop
    );
    const truthAffordance =
      await verifyTruthAffordanceOpensBoundarySurface(client);
    const narrowResults = await verifyViewport(client, VIEWPORTS.narrow);
    const narrowInspectorLayer = await verifyInspectorLayerForWindows(
      client,
      VIEWPORTS.narrow,
      [
        "leo-acquisition-context",
        "meo-continuity-hold",
        "geo-continuity-guard"
      ]
    );
    const unreliableAnchorFallback =
      await verifyForcedUnreliableAnchorFallback(client);

    console.log(
      `M8A-V4.9 product comprehension Slice 5 validation matrix smoke passed: ${JSON.stringify(
        {
          desktopWindows: desktopResults.map((result) => ({
            viewport: result.viewport,
            windowId: result.windowId,
            productLabel: result.productLabel,
            stripHeight: result.stripRect.height,
            sceneNearMode: result.sceneNearMode,
            anchorStatus: result.anchorStatus,
            transitionVisible: result.transitionVisible
          })),
          desktopCompactWindows: desktopCompactResults.map((result) => ({
            viewport: result.viewport,
            windowId: result.windowId,
            productLabel: result.productLabel,
            stripHeight: result.stripRect.height,
            sceneNearMode: result.sceneNearMode,
            anchorStatus: result.anchorStatus,
            transitionVisible: result.transitionVisible
          })),
          narrowWindows: narrowResults.map((result) => ({
            viewport: result.viewport,
            windowId: result.windowId,
            productLabel: result.productLabel,
            stripHeight: result.stripRect.height,
            sceneNearMode: result.sceneNearMode,
            anchorStatus: result.anchorStatus,
            transitionVisible: result.transitionVisible
          })),
          transitionEventLayer,
          inspectorLayer,
          narrowInspectorLayer,
          truthAffordance,
          unreliableAnchorFallback,
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
      await stopHeadlessBrowser(browserHandle);
    }

    if (serverHandle) {
      await stopStaticServer(serverHandle.server);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
