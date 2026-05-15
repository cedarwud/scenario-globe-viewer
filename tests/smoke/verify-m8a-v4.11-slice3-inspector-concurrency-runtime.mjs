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
const outputRoot = path.join(repoRoot, "output/m8a-v4.11-slice3");

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
// Conv 2 layperson Chinese paragraph (Addendum §1.2). The W1 paragraph is
// the user-facing content; the W4.10 backward-compat English detail is
// rendered in a separate `[data-m8a-v411-state-evidence-detail='true']`
// element that the V4.10 Slice 4 smoke continues to read via
// primarySections["current-state"].
const EXPECTED_W1_STATE_EVIDENCE =
  "Just connected to OneWeb LEO with strong link quality. In ~22 min, geometry change triggers signal degradation.";
const EXPECTED_W1_STATE_EVIDENCE_TITLE =
  "Just connected OneWeb LEO · LEO review focus";
const EXPECTED_W1_STATE_EVIDENCE_DETAIL_FRAGMENT =
  "The simulation review is currently anchored on the OneWeb LEO context marked as the focus role.";
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
      lastState?.hasCapture === true
    ) {
      return lastState;
    }

    if (lastState?.bootstrapState === "error") {
      throw new Error(
        `M8A-V4.11 Slice 3 route hit bootstrap error: ${JSON.stringify(
          lastState
        )}`
      );
    }

    await sleep(100);
  }

  throw new Error(
    `M8A-V4.11 Slice 3 did not reach a ready route: ${JSON.stringify(
      lastState
    )}`
  );
}

async function navigateAndWait(client, baseUrl) {
  await client.send("Page.navigate", { url: `${baseUrl}${REQUEST_PATH}` });
  await waitForBootstrapReady(client);
  await waitForGlobeReady(client, "M8A-V4.11 Slice 3");
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
      const elementRecord = (element) => ({
        exists: element instanceof HTMLElement,
        visible: isVisible(element),
        hidden: element instanceof HTMLElement ? element.hidden : null,
        rect: element instanceof HTMLElement
          ? rectToPlain(element.getBoundingClientRect())
          : null,
        text: element instanceof HTMLElement ? normalize(element.innerText) : ""
      });
      const listDataset = (value) =>
        typeof value === "string" && value.length > 0
          ? value.split("|").filter(Boolean)
          : [];

      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      const state = capture?.m8aV4GroundStationScene?.getState?.();
      const productRoot = document.querySelector("[data-m8a-v47-product-ux='true']");
      const sheet = productRoot?.querySelector("[data-m8a-v47-ui-surface='inspection-sheet']");
      const stateRole = productRoot?.querySelector("[data-m8a-v411-inspector-role='state-evidence']");
      const truthRole = productRoot?.querySelector("[data-m8a-v411-inspector-role='truth-boundary']");
      const stateTitle = stateRole?.querySelector("[data-m8a-v411-state-evidence-title='true']");
      const stateCopy = stateRole?.querySelector("[data-m8a-v411-state-evidence-copy='true']");
      const stateDetail = stateRole?.querySelector("[data-m8a-v411-state-evidence-detail='true']");
      const stateEvidenceTruthTail = productRoot?.querySelector("[data-m8a-v411-state-evidence-truth-tail='true']");
      const truthLines = Array.from(
        truthRole?.querySelectorAll("[data-m8a-v411-truth-boundary-lines='true'] li") ?? []
      ).map((line) => normalize(line.textContent));
      const debugEvidence = productRoot?.querySelector("[data-m8a-v49-debug-evidence='true']");
      const details = productRoot?.querySelector("[data-m8a-v47-control-id='details-toggle']");
      // Conv 3: Truth button removed; footer chip with toggle-boundary replaces it
      const truth = productRoot?.querySelector("[data-m8a-v47-control-id='truth-affordance']");
      const footerBoundaryChip = productRoot?.querySelector("[data-m8a-v47-action='toggle-boundary']");
      const close = productRoot?.querySelector("[data-m8a-v47-control-id='details-close']");
      const boundarySurface = productRoot?.querySelector("[data-m8a-v410-boundary-surface='true']");
      const sequenceRail = productRoot?.querySelector("[data-m8a-v410-sequence-rail='true']");
      const transitionEvent = productRoot?.querySelector("[data-m8a-v49-transition-event='true']");
      const sequenceMarks = Array.from(
        sequenceRail?.querySelectorAll("[data-m8a-v410-sequence-mark='true']") ?? []
      );
      const productVisibleText = productRoot instanceof HTMLElement
        ? normalize(productRoot.innerText)
        : "";
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
          disclosureState: state?.productUx?.disclosure?.state ?? null,
          detailsSheetState:
            state?.productUx?.disclosure?.detailsSheetState ?? null,
          boundarySurfaceState:
            state?.productUx?.disclosure?.boundarySurfaceState ?? null,
          sourcesRoleState:
            state?.productUx?.disclosure?.sourcesRoleState ?? null
        },
        rootDataset: {
          glance: productRoot?.dataset.m8aV411GlanceRankSurface ?? null,
          hover: productRoot?.dataset.m8aV411HoverPopover ?? null,
          concurrency:
            productRoot?.dataset.m8aV411InspectorConcurrency ?? null,
          scope: productRoot?.dataset.m8aV411InspectorSliceScope ?? null,
          roles: listDataset(productRoot?.dataset.m8aV411InspectorRoles),
          stateRole:
            productRoot?.dataset.m8aV411InspectorStateEvidenceState ?? null,
          truthRole:
            productRoot?.dataset.m8aV411InspectorTruthBoundaryState ?? null,
          sourcesRole:
            productRoot?.dataset.m8aV411SourcesRoleState ?? null,
          combinedOpen:
            productRoot?.dataset.m8aV411InspectorCombinedOpen ?? null,
          evidenceDefaultOpen:
            productRoot?.dataset
              .m8aV411InspectorImplementationEvidenceDefaultOpen ?? null,
          maxWidthPx:
            productRoot?.dataset.m8aV411InspectorMaxWidthPx ?? null,
          maxHeightCss:
            productRoot?.dataset.m8aV411InspectorMaxHeightCss ?? null,
          maxCanvasWidthRatio:
            productRoot?.dataset.m8aV411InspectorMaxCanvasWidthRatio ?? null
        },
        tabs: Array.from(
          productRoot?.querySelectorAll("[data-m8a-v411-inspector-tab]") ?? []
        ).map((tab) => ({
          id: tab.dataset.m8aV411InspectorTab ?? "",
          text: normalize(tab.textContent)
        })),
        boundaryStrip: elementRecord(
          productRoot?.querySelector("[data-m8a-v411-inspector-boundary-strip='true']")
        ),
        validationBadge: elementRecord(
          productRoot?.querySelector("[data-m8a-v411-inspector-validation-badge='true']")
        ),
        sheet: {
          ...elementRecord(sheet),
          dataset: {
            concurrency: sheet?.dataset.m8aV411InspectorConcurrency ?? null,
            stateRole:
              sheet?.dataset.m8aV411InspectorStateEvidenceState ?? null,
            truthRole:
              sheet?.dataset.m8aV411InspectorTruthBoundaryState ?? null,
            combinedOpen: sheet?.dataset.m8aV411InspectorCombinedOpen ?? null
          }
        },
        stateRole: {
          ...elementRecord(stateRole),
          roleState: stateRole?.dataset.m8aV411RoleState ?? null,
          title: normalize(stateTitle?.textContent),
          copy: normalize(stateCopy?.textContent),
          detail: normalize(stateDetail?.textContent),
          triggeredByDetails:
            stateRole?.dataset.m8aV411StateEvidenceTriggeredByDetails ?? null,
          triggeredByTruth:
            stateRole?.dataset.m8aV411StateEvidenceTriggeredByTruth ?? null,
          inspectorPrimaryRole:
            stateRole?.dataset.m8aV411InspectorPrimaryRole ?? null
        },
        truthRole: {
          ...elementRecord(truthRole),
          roleState: truthRole?.dataset.m8aV411RoleState ?? null,
          lineCount: truthRole?.dataset.m8aV411TruthBoundaryLineCount ?? null,
          lines: truthLines,
          conv2TailOfStateEvidence:
            truthRole?.dataset.m8aV411InspectorConv2TailOfStateEvidence ?? null
        },
        stateEvidenceTruthTail: {
          ...elementRecord(stateEvidenceTruthTail),
          isTail:
            stateEvidenceTruthTail?.dataset
              .m8aV411StateEvidenceTruthTail ?? null
        },
        implementationEvidence: {
          ...elementRecord(debugEvidence),
          open:
            debugEvidence instanceof HTMLDetailsElement
              ? debugEvidence.open
              : null
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
            truth instanceof HTMLElement ? truth.getAttribute("aria-expanded") : null
        },
        // Conv 3: footer chip replaces Truth button as toggle-boundary owner
        footerBoundaryChip: {
          ...elementRecord(footerBoundaryChip),
          ariaExpanded:
            footerBoundaryChip instanceof HTMLElement
              ? footerBoundaryChip.getAttribute("aria-expanded")
              : null
        },
        close: elementRecord(close),
        boundarySurface: elementRecord(boundarySurface),
        transitionEvent: elementRecord(transitionEvent),
        sequenceRail: {
          ...elementRecord(sequenceRail),
          marks: sequenceMarks.map((mark) => ({
            windowId: mark.dataset.m8aV410SequenceWindowId ?? null,
            index: mark.dataset.m8aV410SequenceIndex ?? null,
            active: mark.dataset.active ?? null,
            next: mark.dataset.next ?? null,
            text: normalize(mark.textContent)
          }))
        },
        forbiddenScopeLeak: {
          transitionToast: Boolean(
            productRoot?.querySelector("[data-m8a-v411-transition-toast]")
          ),
          sceneCue: /\\bscene cue\\b/i.test(productVisibleText),
          sourcesRole: Boolean(
            productRoot?.querySelector("[data-m8a-v411-sources-role]")
          ),
          r2Listing: /candidate endpoints|r2 listing|read-only catalog/i.test(
            productVisibleText
          )
        },
        visibleText: productVisibleText,
        resourceHits
      };
    })(${JSON.stringify(label)})`
  );
}

async function clickControl(client, controlId) {
  await evaluateRuntimeValue(
    client,
    `((controlId) => {
      const control = document.querySelector(
        \`[data-m8a-v47-control-id="\${controlId}"]\`
      );

      if (!(control instanceof HTMLButtonElement)) {
        throw new Error(\`Missing control \${controlId}\`);
      }

      control.click();
    })(${JSON.stringify(controlId)})`
  );
  await sleep(120);
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
      }
    })(${JSON.stringify(ratio)})`
  );
  await sleep(320);
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
    "Slice 3 must preserve route, endpoint pair, precision, and V4.6D truth: " +
      JSON.stringify({ urlPath: result.urlPath, facts })
  );
  assertListEquals(
    facts.orbitActorCounts,
    EXPECTED_ACTOR_COUNTS,
    "Slice 3 actor set"
  );
  assert(
    facts.actorCount === 13,
    `Slice 3 actor count must remain 13: ${JSON.stringify(facts)}`
  );
  assert(
    facts.sourceLineage?.projectionRead === EXPECTED_SOURCE_PROJECTION &&
      facts.sourceLineage?.rawPackageSideReadOwnership === "forbidden" &&
      facts.sourceLineage?.rawSourcePathsIncluded === false &&
      result.resourceHits.length === 0,
    "Slice 3 must preserve repo-owned projection/module runtime source boundary: " +
      JSON.stringify({
        sourceLineage: facts.sourceLineage,
        resourceHits: result.resourceHits
      })
  );
  assertListEquals(
    facts.timelineWindowIds,
    EXPECTED_SEQUENCE_WINDOW_IDS,
    "Slice 3 V4.6D window order"
  );
  assert(
    facts.requiredWindowNonClaimKeys?.includes("noR2RuntimeSelector") &&
      facts.timelineNonClaims?.every(
        (window) => window.nonClaims?.noR2RuntimeSelector === true
      ),
    "Slice 3 must keep R2 read-only evidence/catalog support: " +
      JSON.stringify({
        requiredWindowNonClaimKeys: facts.requiredWindowNonClaimKeys,
        timelineNonClaims: facts.timelineNonClaims
      })
  );
}

function assertDefaultClosed(result) {
  assert(
    result.rootDataset.concurrency === EXPECTED_CONCURRENCY_VERSION &&
      result.rootDataset.scope === "slice3-inspector-concurrency" &&
      JSON.stringify(result.rootDataset.roles) ===
        JSON.stringify(["state-evidence", "truth-boundary", "sources"]) &&
      result.rootDataset.combinedOpen === "false" &&
      result.rootDataset.stateRole === "closed" &&
      result.rootDataset.truthRole === "closed" &&
      result.rootDataset.sourcesRole === "closed" &&
      result.stateFacts.disclosureState === "closed" &&
      result.stateFacts.detailsSheetState === "closed" &&
      result.stateFacts.boundarySurfaceState === "closed" &&
      result.stateFacts.sourcesRoleState === "closed" &&
      result.details.ariaExpanded === "false" &&
      // Conv 3 Smoke Softening: Truth button removed; footer chip ariaExpanded instead
      result.footerBoundaryChip.ariaExpanded === "false" &&
      result.sheet.visible === false &&
      result.stateRole.visible === false &&
      result.truthRole.visible === false,
    "Inspector roles must be closed by default: " +
      JSON.stringify({
        rootDataset: result.rootDataset,
        stateFacts: result.stateFacts,
        details: result.details,
        footerBoundaryChip: result.footerBoundaryChip,
        sheet: result.sheet,
        stateRole: result.stateRole,
        truthRole: result.truthRole
      })
  );
}

function assertConcurrencyOpen(result) {
  // Conv 3 Smoke Softening: footer chip ariaExpanded replaces Truth button ariaExpanded
  assert(
    result.sheet.visible &&
      result.sheet.dataset.concurrency === EXPECTED_CONCURRENCY_VERSION &&
      result.sheet.dataset.combinedOpen === "true" &&
      result.details.ariaExpanded === "true" &&
      result.footerBoundaryChip.ariaExpanded === "true" &&
      result.stateFacts.disclosureState === "open" &&
      result.stateFacts.detailsSheetState === "open" &&
      result.stateFacts.boundarySurfaceState === "open" &&
      result.stateRole.visible &&
      result.truthRole.visible &&
      result.stateRole.roleState === "open" &&
      result.truthRole.roleState === "open",
    "Details then footer chip click must keep both inspector roles visible together: " +
      JSON.stringify({
        sheet: result.sheet,
        details: result.details,
        footerBoundaryChip: result.footerBoundaryChip,
        stateFacts: result.stateFacts,
        stateRole: result.stateRole,
        truthRole: result.truthRole
      })
  );
  // Smoke Softening Disclosure: spec v2 §4.1 / §4.4 supersedes the
  // legacy four-tab inspector. Boundary remains as footer-owned truth-tail
  // compatibility, but it is no longer a standalone tab.
  assert(
    JSON.stringify(result.tabs.map((tab) => tab.text)) ===
      JSON.stringify(["Decision", "Metrics", "Evidence"]) &&
      !result.tabs.some((tab) => tab.id === "boundary" || tab.text === "Boundary"),
    "Slice 3 inspector tabs must follow v2 §4.1 / §4.4 three-tab structure: " +
      JSON.stringify(result.tabs)
  );
  assert(
    result.boundaryStrip.visible &&
      result.boundaryStrip.text.includes("13-actor demo") &&
      result.boundaryStrip.text.includes("operator-family precision"),
    "Slice 3 boundary strip must own scale/endpoint chips per v2 §4.4: " +
      JSON.stringify(result.boundaryStrip)
  );
  assert(
    result.validationBadge.visible &&
      result.validationBadge.text.includes("Validation status: TBD"),
    "Slice 3 validation badge must be visible in inspector header per v2 §4.5: " +
      JSON.stringify(result.validationBadge)
  );
  assert(
    result.boundarySurface.visible === false &&
      result.boundarySurface.hidden === true,
    "Truth Boundary must be merged into the inspector, not the old standalone surface: " +
      JSON.stringify(result.boundarySurface)
  );
  // Conv 2 Smoke Softening (Addendum §1.7 Slice 3 design switch):
  //   - State Evidence W1 copy is now the Addendum §1.2 layperson Chinese
  //     paragraph; the legacy V4.10 W1 English paragraph survives as the
  //     state-evidence detail block (V4.10 Slice 4 backward compat) but is
  //     no longer the primary copy.
  //   - Truth Boundary role still mounts in DOM (V4.10 Slice 4 + V4.11
  //     Slice 5 three-role concurrency depend on it) but is now treated as
  //     a tail of State Evidence per Conv 2 single-role spec.
  assert(
    result.stateRole.title === EXPECTED_W1_STATE_EVIDENCE_TITLE &&
      result.stateRole.copy === EXPECTED_W1_STATE_EVIDENCE &&
      result.stateRole.detail.includes(
        EXPECTED_W1_STATE_EVIDENCE_DETAIL_FRAGMENT
      ) &&
      result.stateRole.inspectorPrimaryRole === "state-evidence",
    "Conv 2 State Evidence W1 must show the Addendum §1.2 Chinese paragraph " +
      "with the V4.10 backward-compat English detail tail: " +
      JSON.stringify(result.stateRole)
  );
  assert(
    result.truthRole.text.includes("Truth boundary") &&
      result.truthRole.text.includes("simulation output") &&
      result.truthRole.text.includes("operator-family precision") &&
      result.truthRole.text.includes("display-context actors") &&
      result.truthRole.lines.includes(
        "Simulated display-context state, not an operator handover log."
      ) &&
      result.truthRole.lines.includes(
        "No measured latency, jitter, throughput, or continuity values are shown."
      ) &&
      result.truthRole.conv2TailOfStateEvidence === "true",
    "Truth Boundary tail must keep V4.10 non-claims while declaring Conv 2 " +
      "state-evidence-tail role: " +
      JSON.stringify(result.truthRole)
  );
  assert(
    result.implementationEvidence.visible &&
      result.implementationEvidence.open === false &&
      /Implementation evidence/i.test(result.implementationEvidence.text),
    "Implementation evidence must be visible as a collapsed inspector toggle: " +
      JSON.stringify(result.implementationEvidence)
  );
}

function assertInspectorSizeBudget(result) {
  const rect = result.sheet.rect;
  const legacyMaxWidth = 320;
  const correctionAMinWidth = 360;
  const correctionAMaxWidth = 420;
  const maxHeight = result.viewport.height - 152;

  assert(rect, "Missing inspector rect for size budget.");
  const widthMatchesAcceptedContract =
    rect.width <= legacyMaxWidth + 1 ||
    (rect.width >= correctionAMinWidth - 1 &&
      rect.width <= correctionAMaxWidth + 1);
  // Smoke Softening: Correction A §5.4 supersedes the legacy 320px-only
  // inspector width with a 360-420px readable desktop range.
  assert(
    widthMatchesAcceptedContract && rect.height <= maxHeight + 1,
    "Inspector must stay within Slice 3 size budget: " +
      JSON.stringify({
        rect,
        legacyMaxWidth,
        correctionAMinWidth,
        correctionAMaxWidth,
        maxHeight
      })
  );
  assert(
    result.rootDataset.maxWidthPx === "320" &&
      result.rootDataset.maxHeightCss === "calc(100vh - 9.5rem)" &&
      result.rootDataset.maxCanvasWidthRatio === "0.28",
    "Inspector budget metadata mismatch: " +
      JSON.stringify(result.rootDataset)
  );
}

function assertSimultaneousClose(result) {
  // Conv 3 Smoke Softening: footer chip ariaExpanded replaces Truth button ariaExpanded
  assert(
    result.stateFacts.disclosureState === "closed" &&
      result.stateFacts.detailsSheetState === "closed" &&
      result.stateFacts.boundarySurfaceState === "closed" &&
      result.rootDataset.combinedOpen === "false" &&
      result.details.ariaExpanded === "false" &&
      result.footerBoundaryChip.ariaExpanded === "false" &&
      result.sheet.visible === false &&
      result.stateRole.visible === false &&
      result.truthRole.visible === false,
    "Closing the inspector must close both roles together: " +
      JSON.stringify({
        rootDataset: result.rootDataset,
        stateFacts: result.stateFacts,
        details: result.details,
        footerBoundaryChip: result.footerBoundaryChip,
        sheet: result.sheet,
        stateRole: result.stateRole,
        truthRole: result.truthRole
      })
  );
}

function assertNoSlice4PlusLeak(result, label) {
  assert(
    result.forbiddenScopeLeak.r2Listing === false,
    `${label} leaked visible R2 listing into the Slice 3 surface: ` +
      JSON.stringify(result.forbiddenScopeLeak)
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

async function run() {
  ensureOutputRoot(outputRoot);
  const captures = [];

  await withStaticSmokeBrowser(async ({ client, baseUrl }) => {
    await setViewport(client, VIEWPORT);
    await navigateAndWait(client, baseUrl);

    let result = await inspectRuntime(client, "default");
    assertPreservedInvariants(result);
    assertDefaultClosed(result);
    assertNoSlice4PlusLeak(result, "default");

    await clickControl(client, "details-toggle");
    result = await inspectRuntime(client, "details-open");
    assert(
      result.stateRole.visible &&
        result.truthRole.visible === false &&
        result.details.ariaExpanded === "true" &&
        // Conv 3 Smoke Softening: footer chip ariaExpanded instead of Truth button
        result.footerBoundaryChip.ariaExpanded === "false",
      "Details must open only State Evidence before boundary chip is clicked: " +
        JSON.stringify({
          stateRole: result.stateRole,
          truthRole: result.truthRole,
          details: result.details,
          footerBoundaryChip: result.footerBoundaryChip
        })
    );

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
    result = await inspectRuntime(client, "details-then-truth");
    assertConcurrencyOpen(result);
    assertInspectorSizeBudget(result);
    assertForbiddenClaimsClean(result.visibleText, "Slice 3 concurrent inspector");
    assertNoSlice4PlusLeak(result, "concurrent inspector");
    const screenshotPath = await captureScreenshot(
      client,
      outputRoot,
      "v4.11-w1-pinned-1440x900.png"
    );
    assertScreenshotEvidence(screenshotPath);
    const metadataPath = writeJsonArtifact(
      outputRoot,
      "v4.11-w1-pinned-1440x900.metadata.json",
      {
        viewport: VIEWPORT,
        screenshot: path.relative(repoRoot, screenshotPath),
        result
      }
    );
    captures.push({
      label: "w1-pinned-concurrency",
      screenshot: path.relative(repoRoot, screenshotPath),
      metadata: path.relative(repoRoot, metadataPath),
      inspectorRect: result.sheet.rect
    });

    await clickControl(client, "details-close");
    result = await inspectRuntime(client, "closed-after-concurrency");
    assertSimultaneousClose(result);

    await seekReplayRatio(client, 0.25);
    result = await inspectRuntime(client, "transition-no-auto-open");
    assert(
      result.stateFacts.activeWindowId === "leo-aging-pressure",
      "Seek must enter W2 before no-auto-open assertion: " +
        JSON.stringify(result.stateFacts)
    );
    assertDefaultClosed(result);
    assertNoSlice4PlusLeak(result, "transition no-auto-open");
  });

  const manifestPath = writeJsonArtifact(outputRoot, "capture-manifest.json", {
    route: REQUEST_PATH,
    version: EXPECTED_CONCURRENCY_VERSION,
    captures
  });

  console.log(
    JSON.stringify(
      {
        status: "passed",
        outputRoot: path.relative(repoRoot, outputRoot),
        manifest: path.relative(repoRoot, manifestPath),
        captures
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
