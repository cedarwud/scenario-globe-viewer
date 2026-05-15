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
const outputRoot = path.join(repoRoot, "output/m8a-v4.11-conv2");

const REQUEST_PATH = "/?scenePreset=regional&m8aV4GroundStationScene=1";
const EXPECTED_ENDPOINT_PAIR_ID =
  "taiwan-cht-speedcast-singapore-operator-family-2026-04-26";
const EXPECTED_PRECISION = "operator-family-only";
const EXPECTED_MODEL_ID = "m8a-v4.6d-simulation-handover-model.v1";
const EXPECTED_MODEL_TRUTH = "simulation-output-not-operator-log";
const EXPECTED_HOVER_VERSION =
  "m8a-v4.11-hover-popover-slice2-runtime.v1";
const EXPECTED_HOVER_CONV2_SCHEMA = "phase-specific-three-line";
const EXPECTED_INSPECTOR_VERSION =
  "m8a-v4.11-inspector-concurrency-slice3-runtime.v1";
const EXPECTED_INSPECTOR_CONV2_BEHAVIOR =
  "single-state-evidence-role-truth-button-shows-state-evidence";
const EXPECTED_COUNTDOWN_VERSION =
  "m8a-v4.11-countdown-surface-conv2-runtime.v1";
const EXPECTED_COUNTDOWN_FOOTNOTE = "~ = simulated value";
const EXPECTED_COUNTDOWN_DERIVATION_TAG = "addendum-1.1";

const VIEWPORT = {
  name: "desktop-1440x900",
  width: 1440,
  height: 900
};

const HOVER_CASES = {
  "leo-acquisition-context": {
    ratio: 0.1,
    roleToken: "focus",
    expectedFocusLines: [
      "OneWeb LEO · in focus now",
      "Link quality: strong",
      "Service time: ~22 min"
    ],
    screenshot: "v4.11-conv2-w1-hover-1440x900.png"
  },
  "leo-aging-pressure": {
    ratio: 0.3,
    roleToken: "pressure",
    expectedFocusLines: [
      "OneWeb LEO · signal degrading",
      "Switch in ~10 min",
      "Geometry degrading"
    ],
    screenshot: "v4.11-conv2-w2-countdown-1440x900.png"
  },
  "meo-continuity-hold": {
    ratio: 0.5,
    roleToken: "continuity-hold",
    expectedFocusLines: [
      "SES O3b mPOWER MEO · continuity hold",
      "Continuity hold ~22 min",
      "New LEO returning soon"
    ],
    screenshot: "v4.11-conv2-w3-hover-1440x900.png"
  },
  "leo-reentry-candidate": {
    ratio: 0.7,
    roleToken: "re-entry",
    expectedFocusLines: [
      "OneWeb LEO · candidate",
      "Candidate quality: strong",
      "If switching back: ~22 min"
    ],
    screenshot: "v4.11-conv2-w4-hover-candidate-1440x900.png"
  },
  "geo-continuity-guard": {
    ratio: 0.9,
    roleToken: "guard",
    expectedFocusLines: [
      "Singtel/SES GEO · guard coverage",
      "Always reachable",
      "Sequence ending soon"
    ],
    screenshot: "v4.11-conv2-w5-hover-1440x900.png"
  }
};

const W2_FRACTION_FOR_CHECK = 0.30;
const W2_START_RATIO = 0.2;
const W2_STOP_RATIO = 0.4;

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
          hover: productRoot?.dataset.m8aV411HoverPopover ?? null,
          hoverConv2Schema: productRoot?.dataset.m8aV411HoverConv2Schema ?? null,
          inspector:
            productRoot?.dataset.m8aV411InspectorConcurrency ?? null,
          inspectorConv2Behavior:
            productRoot?.dataset.m8aV411InspectorConv2Behavior ?? null,
          countdown:
            productRoot?.dataset.m8aV411CountdownSurface ?? null,
          countdownDerivation:
            productRoot?.dataset.m8aV411CountdownDerivation ?? null,
          hasCapture: Boolean(
            window.__SCENARIO_GLOBE_VIEWER_CAPTURE__?.m8aV4GroundStationScene
          )
        };
      })()`
    );

    if (
      lastState?.bootstrapState === "ready" &&
      lastState?.scenePreset === "regional" &&
      lastState?.hover === EXPECTED_HOVER_VERSION &&
      lastState?.hoverConv2Schema === EXPECTED_HOVER_CONV2_SCHEMA &&
      lastState?.inspector === EXPECTED_INSPECTOR_VERSION &&
      lastState?.inspectorConv2Behavior === EXPECTED_INSPECTOR_CONV2_BEHAVIOR &&
      lastState?.countdown === EXPECTED_COUNTDOWN_VERSION &&
      lastState?.countdownDerivation === EXPECTED_COUNTDOWN_DERIVATION_TAG &&
      lastState?.hasCapture === true
    ) {
      return lastState;
    }

    if (lastState?.bootstrapState === "error") {
      throw new Error(
        `Conv 2 route hit bootstrap error: ${JSON.stringify(lastState)}`
      );
    }

    await sleep(100);
  }

  throw new Error(
    `Conv 2 did not reach a ready route: ${JSON.stringify(lastState)}`
  );
}

async function navigateAndWait(client, baseUrl) {
  await client.send("Page.navigate", { url: `${baseUrl}${REQUEST_PATH}` });
  await waitForBootstrapReady(client);
  await waitForGlobeReady(client, "M8A-V4.11 Conv 2");
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
      const elementRecord = (element) => ({
        exists: element instanceof HTMLElement,
        visible: isVisible(element),
        hidden: element instanceof HTMLElement ? element.hidden : null,
        text: element instanceof HTMLElement ? normalize(element.innerText) : "",
        rect: element instanceof HTMLElement
          ? {
              left: element.getBoundingClientRect().left,
              top: element.getBoundingClientRect().top,
              width: element.getBoundingClientRect().width,
              height: element.getBoundingClientRect().height
            }
          : null
      });

      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      const state = capture?.m8aV4GroundStationScene?.getState?.();
      const productRoot = document.querySelector("[data-m8a-v47-product-ux='true']");
      const stateRole = productRoot?.querySelector("[data-m8a-v411-inspector-role='state-evidence']");
      const truthRole = productRoot?.querySelector("[data-m8a-v411-inspector-role='truth-boundary']");
      const sourcesRole = productRoot?.querySelector("[data-m8a-v411-inspector-role='sources']");
      const stateTitle = stateRole?.querySelector("[data-m8a-v411-state-evidence-title='true']");
      const stateCopy = stateRole?.querySelector("[data-m8a-v411-state-evidence-copy='true']");
      const stateDetail = stateRole?.querySelector("[data-m8a-v411-state-evidence-detail='true']");
      const truthTail = productRoot?.querySelector("[data-m8a-v411-state-evidence-truth-tail='true']");
      const countdownSurface = productRoot?.querySelector("[data-m8a-v411-countdown-surface='true']");
      const details = productRoot?.querySelector("[data-m8a-v47-control-id='details-toggle']");
      const truth = productRoot?.querySelector("[data-m8a-v47-control-id='truth-affordance']");
      const sheet = productRoot?.querySelector("[data-m8a-v47-ui-surface='inspection-sheet']");

      return {
        label,
        urlPath: window.location.pathname + window.location.search,
        stateFacts: {
          route: state?.simulationHandoverModel?.route ?? null,
          endpointPairId:
            state?.simulationHandoverModel?.endpointPairId ?? null,
          acceptedPairPrecision:
            state?.simulationHandoverModel?.acceptedPairPrecision ?? null,
          modelId: state?.simulationHandoverModel?.modelId ?? null,
          modelTruth: state?.simulationHandoverModel?.modelTruth ?? null,
          activeWindowId: state?.productUx?.activeWindowId ?? null,
          replayRatio: state?.simulationHandoverModel?.replayRatio ?? null,
          window: state?.simulationHandoverModel?.window
            ? {
                windowId: state.simulationHandoverModel.window.windowId,
                startRatioInclusive:
                  state.simulationHandoverModel.window.startRatioInclusive,
                stopRatioExclusive:
                  state.simulationHandoverModel.window.stopRatioExclusive
              }
            : null,
          detailsSheetState:
            state?.productUx?.disclosure?.detailsSheetState ?? null,
          boundarySurfaceState:
            state?.productUx?.disclosure?.boundarySurfaceState ?? null
        },
        rootDataset: {
          hover: productRoot?.dataset.m8aV411HoverPopover ?? null,
          hoverConv2Schema:
            productRoot?.dataset.m8aV411HoverConv2Schema ?? null,
          inspector:
            productRoot?.dataset.m8aV411InspectorConcurrency ?? null,
          inspectorConv2Behavior:
            productRoot?.dataset.m8aV411InspectorConv2Behavior ?? null,
          inspectorPrimaryRole:
            productRoot?.dataset.m8aV411InspectorPrimaryRole ?? null,
          countdown:
            productRoot?.dataset.m8aV411CountdownSurface ?? null,
          countdownDerivation:
            productRoot?.dataset.m8aV411CountdownDerivation ?? null,
          countdownWindowId:
            productRoot?.dataset.m8aV411CountdownWindowId ?? null,
          countdownReplayRatio:
            productRoot?.dataset.m8aV411CountdownReplayRatio ?? null,
          countdownRemainingSimulatedSec:
            productRoot?.dataset.m8aV411CountdownRemainingSimulatedSec ?? null,
          countdownApproximateDisplay:
            productRoot?.dataset.m8aV411CountdownApproximateDisplay ?? null,
          countdownFullReplaySimulatedSec:
            productRoot?.dataset.m8aV411CountdownFullReplaySimulatedSec ?? null,
          countdownFontSizePx:
            productRoot?.dataset.m8aV411CountdownFontSizePx ?? null,
          countdownGapFromMicroCuePx:
            productRoot?.dataset.m8aV411CountdownGapFromMicroCuePx ?? null,
          countdownFootnoteText:
            productRoot?.dataset.m8aV411CountdownFootnoteText ?? null,
          truthAffordanceConv2Behavior:
            productRoot?.dataset.m8aV411TruthAffordanceConv2Behavior ?? null,
          // Conv 3: footer chip replaces Truth button; new behavior attr
          footerChipBoundaryBehavior:
            productRoot?.dataset.m8aV411FooterChipBoundaryBehavior ?? null
        },
        stateRole: {
          ...elementRecord(stateRole),
          title: normalize(stateTitle?.textContent),
          copy: normalize(stateCopy?.textContent),
          detail: normalize(stateDetail?.textContent),
          roleState: stateRole?.dataset.m8aV411RoleState ?? null,
          triggeredByDetails:
            stateRole?.dataset.m8aV411StateEvidenceTriggeredByDetails ?? null,
          triggeredByTruth:
            stateRole?.dataset.m8aV411StateEvidenceTriggeredByTruth ?? null
        },
        truthRole: {
          ...elementRecord(truthRole),
          roleState: truthRole?.dataset.m8aV411RoleState ?? null,
          conv2TailOfStateEvidence:
            truthRole?.dataset.m8aV411InspectorConv2TailOfStateEvidence ?? null
        },
        sourcesRole: elementRecord(sourcesRole),
        truthTail: {
          ...elementRecord(truthTail),
          isTail:
            truthTail?.dataset.m8aV411StateEvidenceTruthTail ?? null
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
        sheet: elementRecord(sheet),
        countdownSurface: {
          ...elementRecord(countdownSurface),
          dataset: countdownSurface
            ? {
                version: countdownSurface.dataset.m8aV411CountdownSurfaceVersion ?? null,
                derivation: countdownSurface.dataset.m8aV411CountdownDerivation ?? null,
                windowId: countdownSurface.dataset.m8aV411CountdownWindowId ?? null,
                replayRatio: countdownSurface.dataset.m8aV411CountdownReplayRatio ?? null,
                startRatio: countdownSurface.dataset.m8aV411CountdownStartRatio ?? null,
                stopRatio: countdownSurface.dataset.m8aV411CountdownStopRatio ?? null,
                withinWindowFraction:
                  countdownSurface.dataset.m8aV411CountdownWithinWindowFraction ?? null,
                remainingFraction:
                  countdownSurface.dataset.m8aV411CountdownRemainingFraction ?? null,
                remainingSimulatedSec:
                  countdownSurface.dataset.m8aV411CountdownRemainingSimulatedSec ?? null,
                fullReplaySimulatedSec:
                  countdownSurface.dataset.m8aV411CountdownFullReplaySimulatedSec ?? null,
                approximateDisplay:
                  countdownSurface.dataset.m8aV411CountdownApproximateDisplay ?? null,
                primaryText:
                  countdownSurface.dataset.m8aV411CountdownPrimaryText ?? null,
                appendixText:
                  countdownSurface.dataset.m8aV411CountdownAppendixText ?? null,
                footnoteText:
                  countdownSurface.dataset.m8aV411CountdownFootnoteText ?? null,
                fontSizePx:
                  countdownSurface.dataset.m8aV411CountdownFontSizePx ?? null,
                gapFromMicroCuePx:
                  countdownSurface.dataset.m8aV411CountdownGapFromMicroCuePx ?? null
              }
            : null
        }
      };
    })(${JSON.stringify(label)})`
  );
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
    last = await inspectRuntime(client, `seek-${ratio}`);
    if (last.stateFacts.activeWindowId === expectedWindowId) {
      return last;
    }
    await sleep(100);
  }

  throw new Error(
    `Conv 2 could not settle on ${expectedWindowId} at ratio ${ratio}: ` +
      JSON.stringify(last?.stateFacts)
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
  await sleep(140);
}

function assertCountdownDerivation(result, label) {
  const surface = result.countdownSurface;
  assert(
    surface.exists && surface.visible,
    `${label} countdown surface must be visible: ` +
      JSON.stringify(surface)
  );
  assert(
    surface.dataset.derivation === EXPECTED_COUNTDOWN_DERIVATION_TAG,
    `${label} countdown derivation tag must be addendum-1.1: ` +
      JSON.stringify(surface.dataset)
  );
  assert(
    surface.dataset.footnoteText === EXPECTED_COUNTDOWN_FOOTNOTE,
    `${label} countdown footnote must be present: ` +
      JSON.stringify(surface.dataset)
  );
  const fullReplay = Number(surface.dataset.fullReplaySimulatedSec);
  const replayRatio = Number(surface.dataset.replayRatio);
  const startRatio = Number(surface.dataset.startRatio);
  const stopRatio = Number(surface.dataset.stopRatio);
  const remainingFromDataset = Number(surface.dataset.remainingSimulatedSec);
  const withinFromDataset = Number(surface.dataset.withinWindowFraction);

  assert(
    Number.isFinite(fullReplay) && fullReplay > 0,
    `${label} countdown fullReplaySimulatedSec must be positive: ` +
      surface.dataset.fullReplaySimulatedSec
  );
  assert(
    Number.isFinite(replayRatio) &&
      replayRatio >= startRatio - 1e-6 &&
      replayRatio <= stopRatio + 1e-6,
    `${label} countdown replayRatio must lie within window: ` +
      JSON.stringify(surface.dataset)
  );
  const span = stopRatio - startRatio;
  const expectedWithin = (replayRatio - startRatio) / span;
  const expectedRemaining = (1 - expectedWithin) * span * fullReplay;
  assert(
    Math.abs(withinFromDataset - expectedWithin) < 0.005,
    `${label} withinWindowFraction must match Addendum §1.1 derivation: ` +
      JSON.stringify({ withinFromDataset, expectedWithin, surface })
  );
  assert(
    Math.abs(remainingFromDataset - expectedRemaining) < 1.5,
    `${label} remainingSimulatedSec must match Addendum §1.1 derivation: ` +
      JSON.stringify({ remainingFromDataset, expectedRemaining, surface })
  );
  assert(
    /^~\d+\s+(min|s)$/.test(surface.dataset.approximateDisplay),
    `${label} countdown approximate display must be English ~N min / s: ` +
      surface.dataset.approximateDisplay
  );
  assert(
    surface.dataset.primaryText.endsWith(surface.dataset.approximateDisplay),
    `${label} countdown primaryText must end with the approximate display: ` +
      JSON.stringify(surface.dataset)
  );
  assert(
    surface.dataset.fontSizePx === "14",
    `${label} countdown font size must be 14 px (≤14 budget): ` +
      surface.dataset.fontSizePx
  );
  assert(
    surface.dataset.gapFromMicroCuePx === "8",
    `${label} countdown gap from micro-cue must be 8 px: ` +
      surface.dataset.gapFromMicroCuePx
  );
  assert(
    surface.text.includes(surface.dataset.primaryText) &&
      surface.text.includes(EXPECTED_COUNTDOWN_FOOTNOTE),
    `${label} countdown surface text must include primary + footnote: ` +
      JSON.stringify(surface)
  );
}

async function verifyHoverPhaseSpecific(client, windowId, hoverCase) {
  await seekToWindow(client, hoverCase.ratio, windowId);
  const selector =
    `[data-m8a-v411-hover-target-kind='satellite']` +
    `[data-m8a-v411-hover-window-id='${windowId}']` +
    `[data-m8a-v411-hover-role-token='${hoverCase.roleToken}']`;

  const target = await evaluateRuntimeValue(
    client,
    `((selector) => {
      const element = document.querySelector(selector);
      if (!(element instanceof HTMLElement)) {
        return null;
      }
      const rect = element.getBoundingClientRect();
      const count = Number(element.dataset.m8aV411HoverLineCount ?? "0");
      return {
        count,
        lines: Array.from({ length: count }).map(
          (_, index) => element.dataset[\`m8aV411HoverLine\${index + 1}\`] ?? ""
        ),
        center: {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        },
        ariaLabel: element.getAttribute("aria-label"),
        schema: element.dataset.m8aV411HoverConv2Schema ?? null
      };
    })(${JSON.stringify(selector)})`
  );

  assert(
    target,
    `Conv 2 hover target missing for ${windowId}/${hoverCase.roleToken}`
  );
  assert(
    target.count === 3,
    `Conv 2 hover target must be exactly 3 lines for ${windowId}: ` +
      JSON.stringify(target)
  );
  assertListEquals(
    target.lines,
    hoverCase.expectedFocusLines,
    `Conv 2 hover focus lines for ${windowId}`
  );
  assert(
    target.schema === EXPECTED_HOVER_CONV2_SCHEMA,
    `Conv 2 hover target must declare phase-specific-three-line schema: ` +
      JSON.stringify(target)
  );

  return target;
}

async function captureWindowScreenshot(client, screenshotName) {
  return await captureScreenshot(client, outputRoot, screenshotName);
}

function assertScreenshotEvidence(absolutePath) {
  const stats = statSync(absolutePath);
  assert(
    stats.size > 20_000,
    `Conv 2 screenshot is unexpectedly small: ${absolutePath}`
  );
}

async function dispatchHover(client, x, y) {
  await client.send("Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x,
    y
  });
  await sleep(160);
}

async function leaveHover(client) {
  await client.send("Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x: 2,
    y: 2
  });
  await sleep(220);
}

async function captureHoverScreenshotForWindow(client, windowId, hoverCase) {
  await seekToWindow(client, hoverCase.ratio, windowId);
  const target = await verifyHoverPhaseSpecific(client, windowId, hoverCase);
  await dispatchHover(client, target.center.x, target.center.y);
  const screenshotPath = await captureWindowScreenshot(
    client,
    hoverCase.screenshot
  );
  assertScreenshotEvidence(screenshotPath);
  await leaveHover(client);
  return screenshotPath;
}

async function captureCountdownScreenshot(client) {
  await seekToWindow(client, 0.3, "leo-aging-pressure");
  const screenshotPath = await captureWindowScreenshot(
    client,
    HOVER_CASES["leo-aging-pressure"].screenshot
  );
  assertScreenshotEvidence(screenshotPath);
  return screenshotPath;
}

async function captureInspectorScreenshot(client) {
  await seekToWindow(client, 0.5, "meo-continuity-hold");
  await clickControl(client, "details-toggle");
  const result = await inspectRuntime(client, "w3-inspector");
  assert(
    result.stateRole.visible &&
      result.truthRole.visible === false &&
      result.sourcesRole.visible === false,
    "Conv 2 W3 inspector must show only State Evidence (single role): " +
      JSON.stringify({
        stateRole: result.stateRole,
        truthRole: result.truthRole,
        sourcesRole: result.sourcesRole
      })
  );
  assert(
    result.stateRole.copy.includes(
      "MEO is currently holding continuity with wider coverage and slightly higher latency. The simulation expects a new candidate LEO in ~14 min."
    ),
    "Conv 2 W3 State Evidence copy must include Addendum §1.2 (formerly Chinese rewording): " +
      JSON.stringify(result.stateRole)
  );
  const screenshotPath = await captureWindowScreenshot(
    client,
    "v4.11-conv2-w3-inspector-1440x900.png"
  );
  assertScreenshotEvidence(screenshotPath);
  await clickControl(client, "details-close");
  return { screenshotPath, result };
}

async function captureTruthButtonScreenshot(client) {
  await seekToWindow(client, 0.1, "leo-acquisition-context");
  // Conv 3 Smoke Softening: Truth button removed; click footer chip with toggle-boundary action
  // Selector [data-m8a-v47-action='toggle-boundary'] unchanged; element owner changed to footer chip
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
  const result = await inspectRuntime(client, "truth-button");
  assert(
    result.stateRole.visible &&
      result.stateFacts.boundarySurfaceState === "open" &&
      result.stateFacts.detailsSheetState === "closed",
    "Conv 3 footer chip click must open inspector with State Evidence visible: " +
      JSON.stringify({
        stateRole: result.stateRole,
        stateFacts: result.stateFacts
      })
  );
  assert(
    result.stateRole.triggeredByTruth === "true" &&
      result.rootDataset.footerChipBoundaryBehavior ===
        "footer-chip-opens-state-evidence-with-truth-tail-visible",
    "Conv 3 footer chip must record Conv 3 boundary behavior (Truth button removed): " +
      JSON.stringify({
        stateRole: result.stateRole,
        rootDataset: result.rootDataset
      })
  );
  assert(
    result.stateRole.copy.length > 0 &&
      result.stateRole.title.length > 0,
    "Conv 2 Truth click must show Addendum §1.2 Chinese paragraph: " +
      JSON.stringify(result.stateRole)
  );
  const screenshotPath = await captureWindowScreenshot(
    client,
    "v4.11-conv2-truth-button-1440x900.png"
  );
  assertScreenshotEvidence(screenshotPath);
  await clickControl(client, "details-close");
  return { screenshotPath, result };
}

async function verifyCountdownDecreasesAcrossPlayback(client) {
  await seekToWindow(client, 0.22, "leo-aging-pressure");
  const before = await inspectRuntime(client, "countdown-before");
  await seekToWindow(client, 0.32, "leo-aging-pressure");
  const after = await inspectRuntime(client, "countdown-after");

  const remainingBefore = Number(
    before.countdownSurface.dataset.remainingSimulatedSec
  );
  const remainingAfter = Number(
    after.countdownSurface.dataset.remainingSimulatedSec
  );

  assert(
    Number.isFinite(remainingBefore) &&
      Number.isFinite(remainingAfter) &&
      remainingAfter < remainingBefore,
    "Conv 2 countdown must decrease as replay clock advances: " +
      JSON.stringify({ remainingBefore, remainingAfter })
  );

  return { remainingBefore, remainingAfter };
}

async function verifyW2WorkedExample(client) {
  await seekToWindow(client, W2_FRACTION_FOR_CHECK, "leo-aging-pressure");
  const result = await inspectRuntime(client, "w2-worked-example");
  const surface = result.countdownSurface.dataset;

  assert(
    Math.abs(Number(surface.startRatio) - W2_START_RATIO) < 1e-3 &&
      Math.abs(Number(surface.stopRatio) - W2_STOP_RATIO) < 1e-3,
    "Conv 2 W2 ratios must match V4.6D timeline: " +
      JSON.stringify(surface)
  );
  assert(
    Math.abs(Number(surface.replayRatio) - W2_FRACTION_FOR_CHECK) < 0.02,
    "Conv 2 W2 replay ratio must seek to ~0.30: " +
      JSON.stringify(surface)
  );
  const fullReplay = Number(surface.fullReplaySimulatedSec);
  const remainingDataset = Number(surface.remainingSimulatedSec);
  const expectedRemaining =
    (W2_STOP_RATIO - Number(surface.replayRatio)) * fullReplay;
  assert(
    Math.abs(remainingDataset - expectedRemaining) < 5,
    "Conv 2 W2 remainingSimulatedSec must match (stop - replayRatio) × fullReplay: " +
      JSON.stringify({ remainingDataset, expectedRemaining, surface })
  );

  return { surface, fullReplay, remainingDataset };
}

async function run() {
  ensureOutputRoot(outputRoot);
  const captures = [];

  await withStaticSmokeBrowser(async ({ client, baseUrl }) => {
    await setViewport(client, VIEWPORT);
    await navigateAndWait(client, baseUrl);

    const initial = await seekToWindow(client, 0.1, "leo-acquisition-context");

    assert(
      initial.urlPath === REQUEST_PATH &&
        initial.stateFacts.route === REQUEST_PATH &&
        initial.stateFacts.endpointPairId === EXPECTED_ENDPOINT_PAIR_ID &&
        initial.stateFacts.acceptedPairPrecision === EXPECTED_PRECISION &&
        initial.stateFacts.modelId === EXPECTED_MODEL_ID &&
        initial.stateFacts.modelTruth === EXPECTED_MODEL_TRUTH,
      "Conv 2 must preserve route, endpoint pair, precision, and V4.6D truth: " +
        JSON.stringify({
          urlPath: initial.urlPath,
          stateFacts: initial.stateFacts
        })
    );

    assertCountdownDerivation(initial, "initial-w1");

    // Hover content phase-specific 5 windows × 3 lines exact match
    for (const [windowId, hoverCase] of Object.entries(HOVER_CASES)) {
      const target = await verifyHoverPhaseSpecific(client, windowId, hoverCase);
      captures.push({
        kind: "hover-phase-specific",
        windowId,
        roleToken: hoverCase.roleToken,
        lines: target.lines
      });
    }

    // Re-seek to W1 for inspector single-role + Details click checks
    await seekToWindow(client, 0.1, "leo-acquisition-context");

    // Default closed: only state-evidence is the primary (no role visible)
    const defaultClosed = await inspectRuntime(client, "default-closed");
    assert(
      defaultClosed.stateRole.visible === false &&
        defaultClosed.truthRole.visible === false &&
        defaultClosed.sourcesRole.visible === false &&
        defaultClosed.rootDataset.inspectorPrimaryRole === "state-evidence",
      "Conv 2 default closed must keep all roles hidden and declare " +
        "state-evidence as the primary role: " +
        JSON.stringify(defaultClosed)
    );

    // Details click only → state-evidence visible, truth-boundary HIDDEN
    await clickControl(client, "details-toggle");
    const afterDetails = await inspectRuntime(client, "details-only");
    assert(
      afterDetails.stateRole.visible === true &&
        afterDetails.truthRole.visible === false &&
        afterDetails.sourcesRole.visible === false &&
        afterDetails.stateFacts.detailsSheetState === "open" &&
        afterDetails.stateFacts.boundarySurfaceState === "closed" &&
        afterDetails.stateRole.triggeredByDetails === "true" &&
        afterDetails.stateRole.triggeredByTruth === "false",
      "Conv 2 Details click must show ONLY State Evidence (single role): " +
        JSON.stringify({
          stateRole: afterDetails.stateRole,
          truthRole: afterDetails.truthRole,
          sourcesRole: afterDetails.sourcesRole,
          stateFacts: afterDetails.stateFacts
        })
    );
    assert(
      afterDetails.stateRole.copy.includes(
        "Just connected to OneWeb LEO with strong link quality. In ~22 min, geometry change triggers signal degradation."
      ) &&
        afterDetails.stateRole.title === "Just connected OneWeb LEO · LEO review focus" &&
        afterDetails.stateRole.detail.includes(
          "Endpoint precision remains operator-family only and no active gateway is being claimed."
        ) &&
        afterDetails.stateRole.detail.includes("window 1 of 5"),
      "Conv 2 W1 State Evidence must show Addendum §1.2 (formerly Chinese rewording) paragraph + title + V4.10 backward-compat English detail: " +
        JSON.stringify(afterDetails.stateRole)
    );
    captures.push({
      kind: "details-only-single-role",
      stateRoleVisible: afterDetails.stateRole.visible,
      truthRoleVisible: afterDetails.truthRole.visible
    });
    await clickControl(client, "details-close");

    // Truth click → State Evidence visible (Conv 2 spec); Conv 2 transitional
    // truth tail also visible (V4.10 + Slice 5 backward compat)
    const truthCapture = await captureTruthButtonScreenshot(client);
    captures.push({
      kind: "truth-button-opens-state-evidence",
      screenshot: path.relative(repoRoot, truthCapture.screenshotPath)
    });

    // Inspector single-role screenshot at W3
    const inspectorCapture = await captureInspectorScreenshot(client);
    captures.push({
      kind: "w3-inspector-single-role",
      screenshot: path.relative(repoRoot, inspectorCapture.screenshotPath)
    });

    // Per-window hover screenshots (W1, W3, W4, W5)
    for (const windowId of [
      "leo-acquisition-context",
      "meo-continuity-hold",
      "leo-reentry-candidate",
      "geo-continuity-guard"
    ]) {
      const hoverCase = HOVER_CASES[windowId];
      const screenshotPath = await captureHoverScreenshotForWindow(
        client,
        windowId,
        hoverCase
      );
      captures.push({
        kind: "hover-screenshot",
        windowId,
        screenshot: path.relative(repoRoot, screenshotPath)
      });
    }

    // W2 countdown screenshot
    const w2CountdownPath = await captureCountdownScreenshot(client);
    captures.push({
      kind: "w2-countdown",
      screenshot: path.relative(repoRoot, w2CountdownPath)
    });

    // Per-window countdown derivation must match Addendum §1.1
    for (const [windowId, hoverCase] of Object.entries(HOVER_CASES)) {
      const seeked = await seekToWindow(client, hoverCase.ratio, windowId);
      assertCountdownDerivation(seeked, `countdown-${windowId}`);
      captures.push({
        kind: "countdown-derivation",
        windowId,
        replayRatio: seeked.countdownSurface.dataset.replayRatio,
        approximate: seeked.countdownSurface.dataset.approximateDisplay,
        remainingSimulatedSec:
          seeked.countdownSurface.dataset.remainingSimulatedSec
      });
    }

    // Countdown decreases as replay clock advances
    const monotone = await verifyCountdownDecreasesAcrossPlayback(client);
    captures.push({ kind: "countdown-monotone", ...monotone });

    // W2 worked example numerical check
    const w2Worked = await verifyW2WorkedExample(client);
    captures.push({
      kind: "w2-worked-example",
      surface: w2Worked.surface,
      fullReplay: w2Worked.fullReplay,
      remaining: w2Worked.remainingDataset
    });
  });

  const manifestPath = writeJsonArtifact(
    outputRoot,
    "capture-manifest.json",
    {
      route: REQUEST_PATH,
      hoverVersion: EXPECTED_HOVER_VERSION,
      hoverConv2Schema: EXPECTED_HOVER_CONV2_SCHEMA,
      inspectorVersion: EXPECTED_INSPECTOR_VERSION,
      inspectorConv2Behavior: EXPECTED_INSPECTOR_CONV2_BEHAVIOR,
      countdownVersion: EXPECTED_COUNTDOWN_VERSION,
      captures
    }
  );

  console.log(
    JSON.stringify(
      {
        status: "passed",
        outputRoot: path.relative(repoRoot, outputRoot),
        manifest: path.relative(repoRoot, manifestPath),
        captureCount: captures.length
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
