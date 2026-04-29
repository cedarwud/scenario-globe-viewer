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
  "m8a-v4.9-product-comprehension-slice2-runtime.v1";
const EXPECTED_V49_SCOPE = "slice2-scene-near-meaning-layer-correction";
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
  "state-meaning",
  "watch-cue-label"
];
const EXPECTED_SCENE_NEAR_FALLBACK_CONTENT = [
  "product-label",
  "state-ordinal",
  "no-scene-attachment"
];
const EXPECTED_PRODUCT_COPY = {
  "leo-acquisition-context": {
    ratio: 0.1,
    productLabel: "LEO acquire",
    stateOrdinalLabel: "State 1 of 5",
    orbitClassToken: "LEO",
    firstReadMessage: "LEO display context establishes the first review focus.",
    watchCueLabel: "Representative LEO cue",
    transitionRole: "start of review"
  },
  "leo-aging-pressure": {
    ratio: 0.3,
    productLabel: "LEO pressure",
    stateOrdinalLabel: "State 2 of 5",
    orbitClassToken: "LEO",
    firstReadMessage:
      "LEO context is under simulated pressure, not measured degradation.",
    watchCueLabel: "LEO candidate context",
    transitionRole: "pressure before continuity shift"
  },
  "meo-continuity-hold": {
    ratio: 0.5,
    productLabel: "MEO hold",
    stateOrdinalLabel: "State 3 of 5",
    orbitClassToken: "MEO",
    firstReadMessage: "MEO display context holds continuity in the simulation.",
    watchCueLabel: "MEO representative cue",
    transitionRole: "continuity hold"
  },
  "leo-reentry-candidate": {
    ratio: 0.7,
    productLabel: "LEO re-entry",
    stateOrdinalLabel: "State 4 of 5",
    orbitClassToken: "LEO",
    firstReadMessage: "LEO returns as a candidate display context.",
    watchCueLabel: "LEO re-entry cue",
    transitionRole: "re-entry candidate"
  },
  "geo-continuity-guard": {
    ratio: 0.92,
    productLabel: "GEO guard",
    stateOrdinalLabel: "State 5 of 5",
    orbitClassToken: "GEO",
    firstReadMessage:
      "GEO guard context closes the review, not active failover proof.",
    watchCueLabel: "GEO guard cue",
    transitionRole: "final guard"
  }
};
const VIEWPORTS = {
  desktop: {
    width: 1440,
    height: 900,
    mobile: false,
    expectedViewportClass: "desktop"
  },
  narrow: {
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
      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      const state = capture?.m8aV4GroundStationScene?.getState?.();
      const productRoot = document.querySelector("[data-m8a-v47-product-ux='true']");
      const strip = productRoot?.querySelector("[data-m8a-v47-control-strip='true']");
      const sheet = productRoot?.querySelector("[data-m8a-v47-ui-surface='inspection-sheet']");
      const annotation = productRoot?.querySelector("[data-m8a-v47-scene-annotation='true']");
      const connector = productRoot?.querySelector("[data-m8a-v48-scene-connector='true']");
      const sceneNearMeaning = annotation?.querySelector("[data-m8a-v49-scene-near-meaning='true']");
      const sceneNearCue = annotation?.querySelector(
        "[data-m8a-v49-scene-near-cue='true'], [data-m8a-v47-annotation-context='true']"
      );
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
          rect: rectToPlain(button.getBoundingClientRect())
        }));
      const stripText = strip?.innerText.replace(/\\s+/g, " ").trim() ?? "";
      const visibleProductText = visibleTextNodes(productRoot).join(" ");
      const compactTruthText = truthAffordance?.textContent
        .replace(/\\s+/g, " ")
        .trim() ?? null;

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
        stripText,
        visibleProductText,
        stripRect: strip ? rectToPlain(strip.getBoundingClientRect()) : null,
        sheetVisible: sheet ? isVisible(sheet) : null,
        annotationText:
          annotation?.innerText.replace(/\\s+/g, " ").trim() ?? null,
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
        truthAffordanceVisible: isVisible(truthAffordance),
        compactTruthText,
        detailsTriggerVisible: isVisible(detailsTrigger),
        visibleStripTruthBadgeTexts: visibleStripTruthBadges.map((element) =>
          element.textContent.replace(/\\s+/g, " ").trim()
        ),
        visibleProgressCount: visibleProgress.length,
        visibleButtons
      };
    })()`
  );
}

function assertPreservedScenarioFacts(result) {
  const state = result.state;

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
}

function assertProductCopy(result, expected) {
  const comprehension = result.state.productUx.productComprehension;
  const activeCopy = comprehension.activeWindowCopy;

  assert(
    comprehension.version === EXPECTED_V49_VERSION &&
      result.productRootDataset.v49ProductComprehension ===
        EXPECTED_V49_VERSION,
    "V4.9 Slice 2 version seam mismatch: " +
      JSON.stringify(result.productRootDataset)
  );
  assert(
    comprehension.scope === EXPECTED_V49_SCOPE &&
      result.productRootDataset.v49SliceScope === comprehension.scope,
    "V4.9 Slice 2 scope seam mismatch: " +
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
    comprehension.sceneNearMeaningLayer.scope === EXPECTED_V49_SCOPE &&
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
      result.productRootDataset.sceneNearMeaningLayer === EXPECTED_V49_SCOPE &&
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
}

function assertPersistentLayer(result, expected, viewport) {
  const stripText = result.stripText;
  const visibleProductText = result.visibleProductText;
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
    "Current state",
    expected.productLabel,
    expected.stateOrdinalLabel,
    "Restart",
    "30x",
    "60x",
    "120x",
    "Details",
    "Truth"
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
  assert(
    result.truthAffordanceVisible === true &&
      result.compactTruthText === "Truth" &&
      result.detailsTriggerVisible === true,
    "V4.9 persistent layer must expose a compact truth affordance and details trigger: " +
      JSON.stringify({
        truthAffordanceVisible: result.truthAffordanceVisible,
        compactTruthText: result.compactTruthText,
        detailsTriggerVisible: result.detailsTriggerVisible
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
      (pattern) => !pattern.test(visibleProductText)
    ),
    "V4.9 default-visible product text exposed denied metadata or long badges: " +
      JSON.stringify({ visibleProductText })
  );
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

function assertSceneNearMeaning(result, expected, viewport) {
  const annotationText = result.annotationText ?? "";
  const annotation = result.annotationDataset;
  const rootDataset = result.productRootDataset;

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
  assert(
    annotationText.includes(`${expected.orbitClassToken} display context`) &&
      annotationText.includes(expected.productLabel) &&
      annotationText.includes(expected.firstReadMessage) &&
      annotationText.includes(expected.watchCueLabel) &&
      result.sceneNearVisibleText.meaning === expected.firstReadMessage &&
      result.sceneNearVisibleText.cue === expected.watchCueLabel &&
      result.sceneNearVisibleText.fallback === "" &&
      annotation.sceneNearMeaning === expected.firstReadMessage &&
      annotation.sceneNearCueLabel === expected.watchCueLabel,
    "V4.9 scene-near label must contain concise state-specific product meaning: " +
      JSON.stringify({
        annotationText,
        sceneNearVisibleText: result.sceneNearVisibleText,
        annotation,
        expected
      })
  );
  assert(
    expected.firstReadMessage.length <= 90 &&
      annotationText.length <= 150,
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

    assert(
      result.activeWindowId === "leo-acquisition-context" &&
        annotation.anchorStatus === "fallback" &&
        annotation.selectedAnchorType === "non-scene-fallback" &&
        annotation.sceneNearMode === "persistent-layer-fallback" &&
        annotation.sceneNearMeaningVisible === "false" &&
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
      !result.annotationText.includes(expected.firstReadMessage) &&
        !result.annotationText.includes(expected.watchCueLabel) &&
        result.annotationText.includes(expected.productLabel) &&
        result.annotationText.includes(expected.stateOrdinalLabel) &&
        result.annotationText.includes("no scene attachment") &&
        result.sceneNearVisibleText.meaning === "" &&
        result.sceneNearVisibleText.cue === "" &&
        result.sceneNearVisibleText.fallback.includes("no scene attachment"),
      "V4.9 unreliable fallback must use persistent wording and not scene-near meaning: " +
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

async function verifyTruthAffordanceOpensInspector(client) {
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
      const truth = root?.querySelector("[data-m8a-v49-truth-affordance='compact']");
      const sheet = root?.querySelector("[data-m8a-v47-ui-surface='inspection-sheet']");

      if (!(truth instanceof HTMLButtonElement)) {
        throw new Error("Missing V4.9 compact truth affordance.");
      }

      if (sheet instanceof HTMLElement && sheet.hidden) {
        truth.click();
      }

      return {
        disclosureState:
          window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.m8aV4GroundStationScene.getState()
            .productUx.disclosure.state,
        truthAriaExpanded: truth.getAttribute("aria-expanded"),
        sheetVisible: isVisible(sheet)
      };
    })()`
  );

  assert(
    result.disclosureState === "open" &&
      result.truthAriaExpanded === "true" &&
      result.sheetVisible === true,
    "V4.9 compact truth affordance must open the existing details sheet: " +
      JSON.stringify(result)
  );

  await closeInspector(client);

  return result;
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

    results.push({
      windowId,
      productLabel: expected.productLabel,
      stripText: result.stripText,
      stripRect: result.stripRect,
      sceneNearMode: result.annotationDataset.sceneNearMode,
      anchorStatus: result.annotationDataset.anchorStatus
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

    const desktopResults = await verifyViewport(client, VIEWPORTS.desktop);
    const truthAffordance = await verifyTruthAffordanceOpensInspector(client);
    const narrowResults = await verifyViewport(client, VIEWPORTS.narrow);
    const unreliableAnchorFallback =
      await verifyForcedUnreliableAnchorFallback(client);

    console.log(
      `M8A-V4.9 product comprehension Slice 2 smoke passed: ${JSON.stringify(
        {
          desktopWindows: desktopResults.map((result) => ({
            windowId: result.windowId,
            productLabel: result.productLabel,
            stripHeight: result.stripRect.height,
            sceneNearMode: result.sceneNearMode,
            anchorStatus: result.anchorStatus
          })),
          narrowWindows: narrowResults.map((result) => ({
            windowId: result.windowId,
            productLabel: result.productLabel,
            stripHeight: result.stripRect.height,
            sceneNearMode: result.sceneNearMode,
            anchorStatus: result.anchorStatus
          })),
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
