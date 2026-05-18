import {
  assert,
  DOM_CAPTURE_HELPERS_SCRIPT,
  evaluateRuntimeValue,
  setViewport,
  sleep
} from "./m8a-v4-browser-capture-harness.mjs";
import { seekReplayRatio } from "./m8a-v4-product-comprehension-navigation.mjs";
import {
  EXPECTED_PRODUCT_COPY,
  EXPECTED_SLICE1_MICRO_CUES,
  VIEWPORTS
} from "./m8a-v4-product-comprehension-data.mjs";
import {
  assertCleanSceneNearText,
  capturePersistentLayer,
  closeBoundarySurface,
  closeInspector
} from "./m8a-v4-product-comprehension-persistent-checks.mjs";

export async function verifyForcedUnreliableAnchorFallback(client) {
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

export async function verifyTruthAffordanceOpensBoundarySurface(client) {
  const result = await evaluateRuntimeValue(
    client,
    `(() => {
      ${DOM_CAPTURE_HELPERS_SCRIPT}
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
        sheetText: normalize(sheet?.textContent),
        boundarySurfaceVisible: isVisible(boundarySurface),
        boundarySurfaceText: normalize(boundarySurface?.textContent),
        boundarySummaryText: normalize(boundarySummary?.textContent),
        boundarySecondaryText: normalize(boundarySecondary?.textContent),
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
