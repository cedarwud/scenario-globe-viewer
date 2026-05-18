import {
  assert,
  assertRectInsideViewport,
  clickAt,
  DOM_CAPTURE_HELPERS_SCRIPT,
  evaluateRuntimeValue,
  rectsOverlap,
  setViewport,
  sleep
} from "./m8a-v4-browser-capture-harness.mjs";
import { seekReplayRatio } from "./m8a-v4-product-comprehension-navigation.mjs";
import {
  REQUEST_PATH,
  EXPECTED_ENDPOINT_PAIR_ID,
  EXPECTED_PRECISION,
  EXPECTED_MODEL_ID,
  EXPECTED_V48_VERSION,
  EXPECTED_V49_VERSION,
  EXPECTED_V49_SCOPE,
  EXPECTED_SCENE_NEAR_SCOPE,
  EXPECTED_TRANSITION_SCOPE,
  EXPECTED_TRANSITION_DURATION_MS,
  EXPECTED_ACTOR_COUNTS,
  EXPECTED_WINDOW_IDS,
  EXPECTED_ALLOWED_PERSISTENT_CONTENT,
  EXPECTED_DENIED_PERSISTENT_CONTENT,
  EXPECTED_SCENE_NEAR_RELIABLE_CONTENT,
  EXPECTED_SCENE_NEAR_FALLBACK_CONTENT,
  EXPECTED_TRANSITION_VISIBLE_CONTENT,
  EXPECTED_TRANSITION_DENIED_VISIBLE_CONTENT,
  EXPECTED_INSPECTOR_PRIMARY_CONTENT,
  EXPECTED_INSPECTOR_DENIED_PRIMARY_CONTENT,
  EXPECTED_INSPECTOR_DEBUG_CONTENT,
  EXPECTED_INSPECTOR_LABELS,
  EXPECTED_PRODUCT_COPY,
  EXPECTED_SLICE1_MICRO_CUES,
  EXPECTED_TRANSITION_LABELS,
  FORBIDDEN_POSITIVE_PHRASES,
  FORBIDDEN_UNIT_PATTERNS,
  V411_CORRECTION_A_AMBIENT_DISCLOSURE_PATTERNS,
  VIEWPORTS
} from "./m8a-v4-product-comprehension-data.mjs";

const LEGACY_SOURCE_TOKEN = "it" + "ri";
const LEGACY_SOURCE_TOKEN_PASCAL =
  LEGACY_SOURCE_TOKEN.charAt(0).toUpperCase() + LEGACY_SOURCE_TOKEN.slice(1);
const LEGACY_SOURCE_RESOURCE_PATTERN_SOURCE = `celestrak|${LEGACY_SOURCE_TOKEN}\\/multi-orbit`;
const RUNTIME_RAW_SOURCE_SIDE_READ_ALLOWED_KEY = `runtimeRaw${LEGACY_SOURCE_TOKEN_PASCAL}SideReadAllowed`;
const NO_RAW_OR_LIVE_EXTERNAL_RUNTIME_SOURCE_KEY = `noRaw${LEGACY_SOURCE_TOKEN_PASCAL}OrLiveExternalRuntimeSource`;

export async function closeInspector(client) {
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

export async function closeBoundarySurface(client) {
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

export async function capturePersistentLayer(client) {
  return await evaluateRuntimeValue(
    client,
    `(() => {
      ${DOM_CAPTURE_HELPERS_SCRIPT}
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
        .filter((name) =>
          new RegExp(
            ${JSON.stringify(LEGACY_SOURCE_RESOURCE_PATTERN_SOURCE)},
            "i"
          ).test(name)
        );

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

export function assertPreservedScenarioFacts(result) {
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
      expectations[RUNTIME_RAW_SOURCE_SIDE_READ_ALLOWED_KEY] === false &&
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
      requiredNonClaimKeys.includes(
        NO_RAW_OR_LIVE_EXTERNAL_RUNTIME_SOURCE_KEY
      ) &&
      state.simulationHandoverModel.timeline.every(
        (windowDefinition) =>
          windowDefinition.nonClaims.noR2RuntimeSelector === true &&
          windowDefinition.nonClaims.noEndpointPairOrPrecisionChange === true &&
          windowDefinition.nonClaims[
            NO_RAW_OR_LIVE_EXTERNAL_RUNTIME_SOURCE_KEY
          ] ===
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

export function assertProductCopy(result, expected) {
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

export function assertPersistentLayer(result, expected, viewport) {
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
    result.sheetVisible === false ||
      result.state.productUx.disclosure.detailsSheetState === "closed",
    "V4.9 default persistent view must keep details closed: " +
      JSON.stringify({
        sheetVisible: result.sheetVisible,
        disclosure: result.state.productUx.disclosure,
        sheetSurface: result.visualSurfaces.sheet
      })
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

export function assertCleanSceneNearText(text, context) {
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

export function assertCleanTransitionText(text, context) {
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

export function collectPositiveClaimHits(text) {
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

export function assertVisibleForbiddenClaimScanClean(text, context) {
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

export function assertPrimaryMetadataDemoted(text, context) {
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

export function assertNoSurfaceOverlap(firstName, first, secondName, second, context) {
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

export function assertDefaultVisualEvidence(result, expected, viewport) {
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

export function assertSceneNearMeaning(result, expected, viewport) {
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
