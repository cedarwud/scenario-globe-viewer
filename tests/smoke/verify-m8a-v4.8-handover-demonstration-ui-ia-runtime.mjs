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
  "m8a-v4.8-handover-demonstration-ui-ia-phase1-runtime.v1";
const EXPECTED_ACTOR_COUNTS = { leo: 6, meo: 5, geo: 2 };
const EXPECTED_REVIEW_MODELS = {
  "leo-acquisition-context": {
    ratio: 0.1,
    productLabel: "LEO acquire",
    representativeActorId: "oneweb-0386-leo-display-context",
    candidateContextActorIds: [
      "oneweb-0537-leo-display-context",
      "oneweb-0701-leo-display-context",
      "o3b-mpower-f6-meo-display-context"
    ],
    fallbackContextActorIds: [
      "st-2-geo-continuity-anchor",
      "ses-9-geo-display-context"
    ]
  },
  "leo-aging-pressure": {
    ratio: 0.3,
    productLabel: "LEO pressure",
    representativeActorId: "oneweb-0537-leo-display-context",
    candidateContextActorIds: [
      "oneweb-0012-leo-display-context",
      "oneweb-0249-leo-display-context",
      "o3b-mpower-f1-meo-display-context",
      "o3b-mpower-f2-meo-display-context"
    ],
    fallbackContextActorIds: [
      "st-2-geo-continuity-anchor",
      "ses-9-geo-display-context"
    ]
  },
  "meo-continuity-hold": {
    ratio: 0.5,
    productLabel: "MEO hold",
    representativeActorId: "o3b-mpower-f6-meo-display-context",
    candidateContextActorIds: [
      "o3b-mpower-f1-meo-display-context",
      "o3b-mpower-f2-meo-display-context",
      "o3b-mpower-f4-meo-display-context",
      "o3b-mpower-f3-meo-display-context",
      "oneweb-0702-leo-display-context"
    ],
    fallbackContextActorIds: [
      "st-2-geo-continuity-anchor",
      "ses-9-geo-display-context"
    ]
  },
  "leo-reentry-candidate": {
    ratio: 0.7,
    productLabel: "LEO re-entry",
    representativeActorId: "oneweb-0702-leo-display-context",
    candidateContextActorIds: [
      "oneweb-0012-leo-display-context",
      "oneweb-0249-leo-display-context",
      "oneweb-0386-leo-display-context",
      "o3b-mpower-f4-meo-display-context"
    ],
    fallbackContextActorIds: [
      "st-2-geo-continuity-anchor",
      "ses-9-geo-display-context"
    ]
  },
  "geo-continuity-guard": {
    ratio: 0.92,
    productLabel: "GEO guard",
    representativeActorId: "st-2-geo-continuity-anchor",
    candidateContextActorIds: [
      "ses-9-geo-display-context",
      "o3b-mpower-f3-meo-display-context",
      "oneweb-0701-leo-display-context"
    ],
    fallbackContextActorIds: [
      "st-2-geo-continuity-anchor",
      "ses-9-geo-display-context"
    ]
  }
};
const FORBIDDEN_POSITIVE_PHRASES = [
  "real operator handover event",
  "operator handover log",
  "active serving satellite",
  "serving satellite",
  "active gateway assignment",
  "active gateway",
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

async function setViewport(client) {
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  });
}

async function waitForBootstrapReady(client) {
  let lastState = null;

  for (let attempt = 0; attempt < 240; attempt += 1) {
    lastState = await evaluateRuntimeValue(
      client,
      `(() => {
        const root = document.documentElement;

        return {
          bootstrapState: root?.dataset.bootstrapState ?? null,
          scenePreset: root?.dataset.scenePreset ?? null,
          v48UiIaVersion: root?.dataset.m8aV48UiIaVersion ?? null,
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
      lastState?.hasV4Seam === true
    ) {
      return lastState;
    }

    if (lastState?.bootstrapState === "error") {
      throw new Error(
        `M8A-V4.8 route hit bootstrap error: ${JSON.stringify(lastState)}`
      );
    }

    await sleep(100);
  }

  throw new Error(
    `M8A-V4.8 validation did not reach a ready route: ${JSON.stringify(
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
    `M8A-V4.8 globe did not settle: ${JSON.stringify(lastState)}`
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

async function inspectPhaseOneDom(client) {
  return await evaluateRuntimeValue(
    client,
    `((config) => {
      const assert = (condition, message) => {
        if (!condition) {
          throw new Error(message);
        }
      };
      const validInfoClasses = new Set([
        "fixed",
        "dynamic",
        "disclosure",
        "control"
      ]);
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
      const visibleTextClassificationFailures = (scope) => {
        const failures = [];
        const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);

        while (walker.nextNode()) {
          const node = walker.currentNode;
          const text = node.textContent.replace(/\\s+/g, " ").trim();

          if (!text) {
            continue;
          }

          const parent = node.parentElement;

          if (!parent || !isVisible(parent)) {
            continue;
          }

          const classified = parent.closest("[data-m8a-v48-info-class]");
          const infoClass = classified?.getAttribute("data-m8a-v48-info-class") ?? null;

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
      const collectPositiveClaimHits = (text) => {
        const sourceText = String(text ?? "");
        const lowered = sourceText.toLowerCase();
        const hits = [];
        const isNegated = (index) => {
          const prefix = sourceText
            .slice(Math.max(0, index - 110), index)
            .toLowerCase();

          return /\\b(no|not|without|forbidden|must not|does not claim|not claimed|non-claim)\\b/.test(
            prefix
          );
        };

        for (const phrase of config.forbiddenPositivePhrases) {
          const needle = phrase.toLowerCase();
          let index = lowered.indexOf(needle);

          while (index !== -1) {
            if (!isNegated(index)) {
              hits.push({
                phrase,
                context: sourceText
                  .slice(Math.max(0, index - 70), index + needle.length + 70)
                  .replace(/\\s+/g, " ")
                  .trim()
              });
            }

            index = lowered.indexOf(needle, index + needle.length);
          }
        }

        return hits;
      };
      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      const state = capture?.m8aV4GroundStationScene?.getState?.();
      const productRoot = document.querySelector("[data-m8a-v47-product-ux='true']");
      const cesiumTimeline = document.querySelector(".cesium-viewer-timelineContainer");
      const strip = productRoot?.querySelector("[data-m8a-v47-control-strip='true']");
      const visibleProductProgress = Array.from(
        productRoot.querySelectorAll(
          "progress, [role='progressbar'], input[type='range'], [data-m8a-v47-progress='true']"
        )
      ).filter(isVisible);
      const hiddenProgress = productRoot.querySelector("[data-m8a-v47-progress='true']");
      const visibleControls = Array.from(
        productRoot.querySelectorAll("button, input, select, textarea, [role='button']")
      ).filter(isVisible);
      const controlClassFailures = visibleControls
        .map((element) => ({
          text: element.textContent.trim(),
          infoClass: element.getAttribute("data-m8a-v48-info-class")
        }))
        .filter((entry) => entry.infoClass !== "control");
      const classificationFailures = visibleTextClassificationFailures(productRoot);
      const visibleText = document.body.innerText;
      const forbiddenUnitHits = config.forbiddenUnitPatterns
        .map((pattern) => new RegExp(pattern.source, pattern.flags))
        .filter((pattern) => pattern.test(visibleText))
        .map((pattern) => pattern.toString());
      const positiveClaimHits = collectPositiveClaimHits(visibleText);
      const resourceHits = performance
        .getEntriesByType("resource")
        .map((entry) => entry.name)
        .filter((name) => /celestrak|itri\\/multi-orbit/i.test(name));

      assert(state, "Missing V4.8 runtime state.");
      assert(productRoot instanceof HTMLElement, "Missing V4.8 product UX root.");
      assert(
        productRoot.dataset.m8aV48UiIaVersion === config.expectedV48Version &&
          state.productUx.uiIaVersion === config.expectedV48Version &&
          document.documentElement.dataset.m8aV48UiIaVersion === config.expectedV48Version,
        "V4.8 UI IA version seam mismatch: " +
          JSON.stringify({
            dom: productRoot.dataset.m8aV48UiIaVersion,
            state: state.productUx.uiIaVersion,
            telemetry: document.documentElement.dataset.m8aV48UiIaVersion
          })
      );
      assert(
        state.simulationHandoverModel.route === config.expectedRoute &&
          state.simulationHandoverModel.endpointPairId ===
            config.expectedEndpointPairId &&
          state.simulationHandoverModel.acceptedPairPrecision ===
            config.expectedPrecision &&
          state.simulationHandoverModel.modelTruth ===
            "simulation-output-not-operator-log" &&
          state.simulationHandoverModel.modelId === config.expectedModelId,
        "V4.8 must preserve V4.6D route, endpoint, precision, and model truth."
      );
      assert(
        JSON.stringify(state.orbitActorCounts) ===
          JSON.stringify(config.expectedActorCounts),
        "V4.8 actor set must remain 6 LEO / 5 MEO / 2 GEO: " +
          JSON.stringify(state.orbitActorCounts)
      );
      assert(
        classificationFailures.length === 0,
        "Every visible V4.8 product text node must have a valid info class: " +
          JSON.stringify(classificationFailures)
      );
      assert(
        controlClassFailures.length === 0,
        "Every visible V4.8 product control must be classified as control: " +
          JSON.stringify(controlClassFailures)
      );
      assert(
        isVisible(cesiumTimeline) && visibleProductProgress.length === 0,
        "V4.8 must not expose a duplicate visible primary product progress/timeline while Cesium timeline is visible: " +
          JSON.stringify({
            cesiumTimelineVisible: isVisible(cesiumTimeline),
            visibleProductProgress: visibleProductProgress.map((element) => ({
              tag: element.tagName,
              text: element.textContent.trim(),
              role: element.getAttribute("role")
            }))
          })
      );
      assert(
        hiddenProgress instanceof HTMLProgressElement &&
          hiddenProgress.hidden === true &&
          hiddenProgress.getAttribute("aria-hidden") === "true",
        "V4.8 may keep only a hidden non-focus product progress seam: " +
          JSON.stringify({
            hasHiddenProgress: Boolean(hiddenProgress),
            hidden: hiddenProgress?.hidden,
            ariaHidden: hiddenProgress?.getAttribute("aria-hidden")
          })
      );
      assert(
        strip instanceof HTMLElement &&
          /State\\s+\\d+\\s+of\\s+5/.test(strip.innerText) &&
          !/Replay UTC|Sim replay|\\b\\d+(?:\\.\\d+)?%/.test(strip.innerText),
        "V4.8 top strip must show state count, not duplicate replay time/progress: " +
          JSON.stringify({ stripText: strip?.innerText })
      );
      assert(
        positiveClaimHits.length === 0 && forbiddenUnitHits.length === 0,
        "V4.8 visible forbidden-claim scan failed: " +
          JSON.stringify({ positiveClaimHits, forbiddenUnitHits })
      );
      assert(
        resourceHits.length === 0,
        "V4.8 runtime fetched a raw source or live external resource: " +
          JSON.stringify(resourceHits)
      );

      return {
        infoClassValues: state.productUx.infoClassValues,
        visibleControlCount: visibleControls.length,
        stripText: strip.innerText,
        resourceHits
      };
    })(${JSON.stringify({
      expectedRoute: REQUEST_PATH,
      expectedEndpointPairId: EXPECTED_ENDPOINT_PAIR_ID,
      expectedPrecision: EXPECTED_PRECISION,
      expectedModelId: EXPECTED_MODEL_ID,
      expectedV48Version: EXPECTED_V48_VERSION,
      expectedActorCounts: EXPECTED_ACTOR_COUNTS,
      forbiddenPositivePhrases: FORBIDDEN_POSITIVE_PHRASES,
      forbiddenUnitPatterns: FORBIDDEN_UNIT_PATTERNS.map((pattern) => ({
        source: pattern.source,
        flags: pattern.flags
      }))
    })})`
  );
}

async function openInspector(client) {
  await evaluateRuntimeValue(
    client,
    `(() => {
      const root = document.querySelector("[data-m8a-v47-product-ux='true']");
      const toggle = root?.querySelector("[data-m8a-v47-control-id='details-toggle']");

      if (!(toggle instanceof HTMLButtonElement)) {
        throw new Error("Missing V4.8 details trigger.");
      }

      const sheet = root.querySelector("[data-m8a-v47-ui-surface='inspection-sheet']");

      if (sheet.hidden) {
        toggle.click();
      }
    })()`
  );
  await sleep(160);
}

async function verifyReviewViewModels(client) {
  const results = [];

  await openInspector(client);

  for (const [windowId, expected] of Object.entries(EXPECTED_REVIEW_MODELS)) {
    await seekReplayRatio(client, expected.ratio);
    const result = await evaluateRuntimeValue(
      client,
      `((expectedWindowId) => {
        const root = document.querySelector("[data-m8a-v47-product-ux='true']");
        const sheet = root.querySelector("[data-m8a-v47-ui-surface='inspection-sheet']");
        const body = root.querySelector("[data-m8a-v48-inspector-body='true']");
        const state =
          window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.m8aV4GroundStationScene.getState();
        const review = state.productUx.reviewViewModel;
        const isVisible = (element) => {
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

        return {
          expectedWindowId,
          activeWindowId: state.productUx.activeWindowId,
          activeProductLabel: state.productUx.activeProductLabel,
          disclosureState: state.productUx.disclosure.state,
          sheetVisible: isVisible(sheet),
          sheetWindowId: sheet.dataset.m8aV48WindowId,
          bodyWindowId: body.dataset.m8aV48WindowId,
          bodyText: body.innerText,
          bodyRepresentativeActorId: body.dataset.m8aV48RepresentativeActorId,
          bodyCandidateContextActorIds:
            body.dataset.m8aV48CandidateContextActorIds,
          bodyFallbackContextActorIds:
            body.dataset.m8aV48FallbackContextActorIds,
          bodySceneAnchorState: body.dataset.m8aV48SceneAnchorState,
          review: {
            version: review.version,
            windowId: review.windowId,
            productLabel: review.productLabel,
            stateOrdinalLabel: review.stateOrdinalLabel,
            representativeActorId: review.representativeActor.actorId,
            candidateContextActorIds: review.candidateContextActors.map(
              (actor) => actor.actorId
            ),
            fallbackContextActorIds: review.fallbackContextActors.map(
              (actor) => actor.actorId
            ),
            reviewPurpose: review.reviewPurpose,
            whatChangedFromPreviousState:
              review.whatChangedFromPreviousState,
            whatToWatch: review.whatToWatch,
            nextStateHint: review.nextStateHint,
            relationCueRole: review.relationCueRole,
            sceneAnchorState: review.sceneAnchorState,
            truthBoundarySummary: review.truthBoundarySummary
          },
          v46d: {
            windowId: state.simulationHandoverModel.window.windowId,
            representativeActorId:
              state.simulationHandoverModel.window.displayRepresentativeActorId,
            candidateContextActorIds:
              state.simulationHandoverModel.window.candidateContextActorIds,
            fallbackContextActorIds:
              state.simulationHandoverModel.window.fallbackContextActorIds
          }
        };
      })(${JSON.stringify(windowId)})`
    );

    assert(
      result.activeWindowId === windowId &&
        result.review.windowId === windowId &&
        result.review.version === EXPECTED_V48_VERSION &&
        result.review.productLabel === expected.productLabel &&
        result.activeProductLabel === expected.productLabel,
      "V4.8 review view-model must map to the active V4.6D product state: " +
        JSON.stringify(result)
    );
    assert(
      result.review.representativeActorId === expected.representativeActorId &&
        result.v46d.representativeActorId === expected.representativeActorId &&
        result.bodyRepresentativeActorId === expected.representativeActorId,
      "V4.8 representative actor id changed from the accepted table: " +
        JSON.stringify(result)
    );
    assert(
      JSON.stringify(result.review.candidateContextActorIds) ===
        JSON.stringify(expected.candidateContextActorIds) &&
        JSON.stringify(result.v46d.candidateContextActorIds) ===
          JSON.stringify(expected.candidateContextActorIds) &&
        result.bodyCandidateContextActorIds ===
          expected.candidateContextActorIds.join("|"),
      "V4.8 candidate context actor ids changed from the accepted table: " +
        JSON.stringify(result)
    );
    assert(
      JSON.stringify(result.review.fallbackContextActorIds) ===
        JSON.stringify(expected.fallbackContextActorIds) &&
        JSON.stringify(result.v46d.fallbackContextActorIds) ===
          JSON.stringify(expected.fallbackContextActorIds) &&
        result.bodyFallbackContextActorIds ===
          expected.fallbackContextActorIds.join("|"),
      "V4.8 fallback context actor ids changed from the accepted table: " +
        JSON.stringify(result)
    );
    assert(
      result.disclosureState === "open" &&
        result.sheetVisible === true &&
        result.sheetWindowId === windowId &&
        result.bodyWindowId === windowId &&
        result.bodyText.includes(result.review.reviewPurpose) &&
        result.bodyText.includes(result.review.whatChangedFromPreviousState) &&
        result.bodyText.includes(result.review.whatToWatch) &&
        result.bodyText.includes(result.review.nextStateHint),
      "V4.8 inspector body must be dynamic and state-specific: " +
        JSON.stringify(result)
    );
    assert(
      result.review.relationCueRole.primary === "displayRepresentative" &&
        result.review.relationCueRole.secondary === "candidateContext" &&
        result.review.sceneAnchorState.state === "phase1-placeholder" &&
        result.review.sceneAnchorState.selectedActorId ===
          expected.representativeActorId &&
        result.bodySceneAnchorState === "phase1-placeholder",
      "V4.8 review model must expose the Phase 1 relation cue and scene-anchor placeholder: " +
        JSON.stringify(result)
    );

    results.push(result);
  }

  const uniqueBodyTexts = new Set(results.map((result) => result.bodyText));
  assert(
    uniqueBodyTexts.size === Object.keys(EXPECTED_REVIEW_MODELS).length,
    "V4.8 inspector body must change across all five V4.6D windows: " +
      JSON.stringify(results.map((result) => ({
        windowId: result.review.windowId,
        bodyText: result.bodyText
      })))
  );

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

    await setViewport(client);
    await navigateAndWait(client, serverHandle.baseUrl);

    const domInspection = await inspectPhaseOneDom(client);
    const reviewModels = await verifyReviewViewModels(client);

    console.log(
      `M8A-V4.8 handover demonstration UI IA Phase 1 smoke passed: ${JSON.stringify(
        {
          domInspection,
          reviewWindows: reviewModels.map((result) => ({
            windowId: result.review.windowId,
            productLabel: result.review.productLabel,
            representativeActorId: result.review.representativeActorId,
            candidateContextActorIds: result.review.candidateContextActorIds,
            fallbackContextActorIds: result.review.fallbackContextActorIds,
            sceneAnchorState: result.review.sceneAnchorState.state
          })),
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
