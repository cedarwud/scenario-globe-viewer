import {
  assert,
  assertRectInsideViewport,
  DOM_CAPTURE_HELPERS_SCRIPT,
  evaluateRuntimeValue,
  rectsOverlap
} from "./m8a-v4-browser-capture-harness.mjs";
import { seekReplayRatio } from "./m8a-v4-product-comprehension-navigation.mjs";
import {
  assertPrimaryMetadataDemoted,
  assertProductCopy,
  assertVisibleForbiddenClaimScanClean,
  closeInspector
} from "./m8a-v4-product-comprehension-persistent-checks.mjs";
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

export async function captureInspectorLayer(client) {
  return await evaluateRuntimeValue(
    client,
    `(() => {
      ${DOM_CAPTURE_HELPERS_SCRIPT}
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

export function assertInspectorPrimaryClean(result, expected) {
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

export function assertInspectorVisualEvidence(result, expected, viewport) {
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

export function assertInspectorLayer(result, expected, viewport = VIEWPORTS.desktop) {
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

export async function verifyInspectorLayerForWindows(
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
