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
const EXPECTED_ACTOR_COUNTS = { leo: 6, meo: 5, geo: 2 };
const PHASE3_MOTION_SAMPLE_COUNT = 8;
const EXPECTED_DISPLAY_MOTION_SOURCE_BOUNDARY =
  "M8A_V4_GROUND_STATION_RUNTIME_PROJECTION.orbitActors.runtimeDisplayTrack";
const VIEWPORTS = [
  {
    name: "desktop-1440",
    width: 1440,
    height: 900,
    mobile: false,
    expectedViewportClass: "desktop",
    connectorThresholdPx: 24,
    protectionRect: { width: 96, height: 72 }
  },
  {
    name: "narrow-390",
    width: 390,
    height: 844,
    mobile: true,
    expectedViewportClass: "narrow",
    connectorThresholdPx: 32,
    protectionRect: { width: 112, height: 88 }
  }
];
const EXPECTED_REVIEW_MODELS = {
  "leo-acquisition-context": {
    ratio: 0.1,
    productLabel: "LEO review focus",
    representativeActorId: "oneweb-0386-leo-display-context",
    sceneAnchorState: "representative-actor-anchor",
    selectedAnchorType: "display-representative-actor",
    selectedRelationCueId:
      "m8a-v46e-simulation-displayRepresentative-context-ribbon",
    selectedCorridorId: "m8a-v4-operator-family-endpoint-context-ribbon",
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
    sceneAnchorState: "representative-actor-anchor",
    selectedAnchorType: "display-representative-actor",
    selectedRelationCueId:
      "m8a-v46e-simulation-displayRepresentative-context-ribbon",
    selectedCorridorId: null,
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
    productLabel: "MEO continuity hold",
    representativeActorId: "o3b-mpower-f6-meo-display-context",
    sceneAnchorState: "representative-meo-actor-anchor",
    selectedAnchorType: "display-representative-actor",
    selectedRelationCueId:
      "m8a-v46e-simulation-displayRepresentative-context-ribbon",
    selectedCorridorId: null,
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
    sceneAnchorState: "representative-leo-actor-anchor",
    selectedAnchorType: "display-representative-actor",
    selectedRelationCueId:
      "m8a-v46e-simulation-displayRepresentative-context-ribbon",
    selectedCorridorId: null,
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
    productLabel: "GEO guard context",
    representativeActorId: "st-2-geo-continuity-anchor",
    sceneAnchorState: "geo-guard-cue-anchor",
    selectedAnchorType: "geo-guard-cue",
    selectedRelationCueId: "m8a-v46e-simulation-geo-guard-cue",
    selectedCorridorId: null,
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
const EXPECTED_V411_STATE_EVIDENCE_COPY = {
  "leo-acquisition-context":
    "The simulation review is currently anchored on the OneWeb LEO context marked as the focus role. The five-state V4.6D model is in window 1 of 5. Watch the LEO actor for the early pressure signal — the next modeled state is LEO pressure. Endpoint precision remains operator-family only and no active gateway is being claimed.",
  "leo-aging-pressure":
    "The simulation marks the LEO context as under aging pressure in window 2 of 5. The geometry is degrading by simulation, not by measurement. The next modeled state holds continuity on the MEO context. No real RF handover is being asserted.",
  "meo-continuity-hold":
    "The simulation holds continuity on the SES O3b mPOWER MEO context in window 3 of 5. This is wider-area continuity by model, not a measured failover. LEO returns as a candidate focus in the next window. Endpoint precision remains operator-family only.",
  "leo-reentry-candidate":
    "LEO returns as a candidate review focus in window 4 of 5. The next state closes the sequence on GEO guard context. Continuity here is modeled, not measured.",
  "geo-continuity-guard":
    "The sequence closes on GEO as guard context in window 5 of 5. GEO is shown as continuity guard only — no failover proof is being asserted. Restart to review the simulation again."
};
const EXPECTED_SLICE1_MICRO_CUES = {
  "leo-acquisition-context": "focus · LEO",
  "leo-aging-pressure": "pressure · LEO",
  "meo-continuity-hold": "hold · MEO",
  "leo-reentry-candidate": "re-entry · LEO",
  "geo-continuity-guard": "guard · GEO"
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

async function setViewport(client, viewport = VIEWPORTS[0]) {
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

async function inspectPhaseTwoDom(client) {
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
      const isSourcesAffordance = (element) =>
        element?.getAttribute?.("data-m8a-v47-action") === "open-sources";
      const visibleControls = Array.from(
        productRoot.querySelectorAll("button, input, select, textarea, [role='button']")
      ).filter((element) => isVisible(element) && !isSourcesAffordance(element));
      const controlClassFailures = visibleControls
        .map((element) => ({
          text: element.textContent.trim(),
          infoClass: element.getAttribute("data-m8a-v48-info-class")
        }))
        .filter((entry) => entry.infoClass !== "control");
      const classificationFailures = visibleTextClassificationFailures(productRoot);
      const visibleText = document.body.innerText;
      const phaseOnePlaceholderHits = [
        state?.productUx?.reviewViewModel?.sceneAnchorState?.state,
        productRoot?.dataset?.m8aV48SceneAnchorState,
        document.documentElement.dataset.m8aV48SceneAnchorState,
        visibleText
      ].filter((value) => String(value ?? "").includes("phase1-placeholder"));
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
      assert(
        phaseOnePlaceholderHits.length === 0,
        "V4.8 Phase 2 must not accept phase1-placeholder as a runtime anchor state: " +
          JSON.stringify(phaseOnePlaceholderHits)
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
          bodySelectedAnchorType: body.dataset.m8aV48SelectedAnchorType,
          bodySelectedActorId: body.dataset.m8aV48SelectedActorId,
          bodySelectedRelationCueId:
            body.dataset.m8aV48SelectedRelationCueId,
          bodySelectedCorridorId: body.dataset.m8aV48SelectedCorridorId,
          bodyAnchorStatus: body.dataset.m8aV48AnchorStatus,
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
    const hasV48InspectorCopy =
      result.bodyText.includes(result.review.reviewPurpose) &&
      result.bodyText.includes(result.review.whatChangedFromPreviousState) &&
      result.bodyText.includes(result.review.whatToWatch) &&
      result.bodyText.includes(result.review.nextStateHint);
    const hasV411StateEvidenceCopy =
      result.bodyText.includes("State Evidence") &&
      result.bodyText.includes(expected.productLabel) &&
      result.bodyText.includes(EXPECTED_V411_STATE_EVIDENCE_COPY[windowId]);
    assert(
      result.disclosureState === "open" &&
        result.sheetVisible === true &&
        result.sheetWindowId === windowId &&
        result.bodyWindowId === windowId &&
        (hasV48InspectorCopy || hasV411StateEvidenceCopy),
      "V4.8 inspector body must be dynamic and state-specific: " +
        JSON.stringify(result)
    );
    assert(
      result.review.relationCueRole.primary === "displayRepresentative" &&
        result.review.relationCueRole.secondary === "candidateContext" &&
        result.review.sceneAnchorState.state === expected.sceneAnchorState &&
        result.review.sceneAnchorState.selectedAnchorType ===
          expected.selectedAnchorType &&
        result.review.sceneAnchorState.selectedActorId ===
          expected.representativeActorId &&
        result.review.sceneAnchorState.selectedRelationCueId ===
          expected.selectedRelationCueId &&
        result.review.sceneAnchorState.selectedCorridorId ===
          expected.selectedCorridorId &&
        result.review.sceneAnchorState.anchorStatus ===
          "requires-render-geometry-validation" &&
        result.review.sceneAnchorState.anchorClaim ===
          "selected-display-context-cue-not-service-truth" &&
        result.bodySceneAnchorState === expected.sceneAnchorState &&
        result.bodySelectedAnchorType === expected.selectedAnchorType &&
        result.bodySelectedActorId === expected.representativeActorId &&
        result.bodySelectedRelationCueId === expected.selectedRelationCueId &&
        (result.bodySelectedCorridorId || null) === expected.selectedCorridorId,
      "V4.8 review model must expose the Phase 2 per-state selected anchor metadata: " +
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

function assertSceneAnchorGeometry(result, expected, viewport, sheetOpen) {
  assert(
    result.activeWindowId === result.expectedWindowId &&
    result.viewportClass === viewport.expectedViewportClass,
    "V4.8 scene anchor viewport class mismatch: " + JSON.stringify(result)
  );
  assert(
    !JSON.stringify(result).includes("phase1-placeholder"),
    "V4.8 scene anchor runtime geometry must not retain phase1-placeholder: " +
      JSON.stringify(result)
  );
  const expectedMicroCue = EXPECTED_SLICE1_MICRO_CUES[result.expectedWindowId];
  assert(
    result.annotationText.includes(expected.productLabel) ||
      result.annotationText.includes(expectedMicroCue),
    "V4.8 scene-near label must track the selected V4.6D state: " +
      JSON.stringify(result)
  );

  if (result.anchorStatus === "geometry-reliable") {
    assert(
      result.selectedAnchorType === expected.selectedAnchorType &&
        result.selectedActorId === expected.representativeActorId &&
        result.selectedRelationCueId === expected.selectedRelationCueId &&
        (result.selectedCorridorId || null) === expected.selectedCorridorId,
      "V4.8 reliable anchor metadata did not match the selected state: " +
        JSON.stringify(result)
    );
    assert(
      result.connectorVisible === true &&
        result.connectorEndpointDistancePx <= viewport.connectorThresholdPx &&
        result.connectorThresholdPx === viewport.connectorThresholdPx,
      "V4.8 connector endpoint must land within the accepted threshold: " +
        JSON.stringify(result)
    );
    assert(
      result.anchorPointDistanceToEntity <= viewport.connectorThresholdPx,
      "V4.8 selected anchor point must match the projected actor/cue point: " +
        JSON.stringify(result)
    );
    assert(
      result.connectorQuadrantOk === true,
      "V4.8 connector must point toward the selected anchor quadrant: " +
        JSON.stringify(result)
    );
    assert(
      result.protectionRect.width === viewport.protectionRect.width &&
        result.protectionRect.height === viewport.protectionRect.height &&
        result.annotationProtectionHit === false,
      "V4.8 annotation must not cover the selected cue protection rectangle: " +
        JSON.stringify(result)
    );

    if (sheetOpen) {
      assert(
        result.sheetVisible === true && result.sheetProtectionHit === false,
        "V4.8 inspector must not cover the selected cue protection rectangle: " +
          JSON.stringify(result)
      );
    } else {
      assert(
        result.sheetVisible === false,
        "V4.8 inspector should be closed for the closed-cue obstruction check: " +
          JSON.stringify(result)
      );
    }
  } else {
    assert(
      result.anchorStatus === "fallback" &&
        result.selectedAnchorType === "non-scene-fallback" &&
        result.connectorVisible === false &&
        result.fallbackReason,
      "V4.8 fallback anchor state must be explicit and must not render a connector: " +
        JSON.stringify(result)
    );
    assert(
      !/\b(attached|serving satellite|active path|active service|teleport path)\b/i.test(
        result.annotationText
      ),
      "V4.8 fallback label must not imply attachment to a satellite, active path, or active service: " +
        JSON.stringify(result)
    );
  }
}

async function captureSceneAnchorGeometry(client, expectedWindowId, sheetOpen) {
  return await evaluateRuntimeValue(
    client,
    `((expectedWindowId) => {
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
      const intersects = (a, b) =>
        a.left < b.right &&
        a.right > b.left &&
        a.top < b.bottom &&
        a.bottom > b.top;
      const numberDataset = (element, key) => {
        const value = Number(element?.dataset?.[key]);
        return Number.isFinite(value) ? value : null;
      };
      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      const viewer = capture.viewer;
      const state = capture.m8aV4GroundStationScene.getState();
      const productRoot = document.querySelector("[data-m8a-v47-product-ux='true']");
      const annotation = productRoot.querySelector("[data-m8a-v47-scene-annotation='true']");
      const connector = productRoot.querySelector("[data-m8a-v48-scene-connector='true']");
      const sheet = productRoot.querySelector("[data-m8a-v47-ui-surface='inspection-sheet']");
      const dataSource = viewer.dataSources.getByName(state.dataSourceName)[0];
      const canvasRect = viewer.scene.canvas.getBoundingClientRect();
      const entityPoint = (entityId) => {
        const entity = dataSource?.entities?.getById?.(entityId);
        const position = entity?.position?.getValue?.(viewer.clock.currentTime);
        const point = position
          ? viewer.scene.cartesianToCanvasCoordinates(position)
          : null;

        return point
          ? { x: canvasRect.left + point.x, y: canvasRect.top + point.y }
          : null;
      };
      const annotationRect = rectToPlain(annotation.getBoundingClientRect());
      const sheetRect = rectToPlain(sheet.getBoundingClientRect());
      const protectionRect = {
        left: numberDataset(annotation, "m8aV48ProtectionRectLeft"),
        top: numberDataset(annotation, "m8aV48ProtectionRectTop"),
        right: numberDataset(annotation, "m8aV48ProtectionRectRight"),
        bottom: numberDataset(annotation, "m8aV48ProtectionRectBottom"),
        width: numberDataset(annotation, "m8aV48ProtectionRectWidth"),
        height: numberDataset(annotation, "m8aV48ProtectionRectHeight")
      };
      const connectorStart = {
        x: numberDataset(connector, "m8aV48ConnectorStartX"),
        y: numberDataset(connector, "m8aV48ConnectorStartY")
      };
      const connectorEnd = {
        x: numberDataset(connector, "m8aV48ConnectorEndX"),
        y: numberDataset(connector, "m8aV48ConnectorEndY")
      };
      const anchor = {
        x: Number(annotation.dataset.m8aV47SceneAnchorX),
        y: Number(annotation.dataset.m8aV47SceneAnchorY)
      };
      const selectedActorId = annotation.dataset.m8aV48SelectedActorId;
      const selectedEntityPoint = selectedActorId
        ? entityPoint(selectedActorId)
        : null;
      const vectorToAnchor = {
        x: anchor.x - connectorStart.x,
        y: anchor.y - connectorStart.y
      };
      const vectorToEnd = {
        x: connectorEnd.x - connectorStart.x,
        y: connectorEnd.y - connectorStart.y
      };
      const sameDirection = (left, right) =>
        Math.abs(left) < 0.1 ||
        Math.abs(right) < 0.1 ||
        Math.sign(left) === Math.sign(right);
      const connectorVisible = isVisible(connector);

      return {
        expectedWindowId,
        activeWindowId: state.productUx.activeWindowId,
        viewportClass: state.productUx.layout.viewportClass,
        reviewSceneAnchorState: state.productUx.reviewViewModel.sceneAnchorState,
        rootSceneAnchorState: productRoot.dataset.m8aV48SceneAnchorState,
        annotationSceneAnchorState: annotation.dataset.m8aV48SceneAnchorState,
        anchorStatus: annotation.dataset.m8aV48AnchorStatus,
        fallbackReason: annotation.dataset.m8aV48FallbackReason,
        selectedAnchorType: annotation.dataset.m8aV48SelectedAnchorType,
        selectedActorId,
        selectedRelationCueId: annotation.dataset.m8aV48SelectedRelationCueId,
        selectedCorridorId: annotation.dataset.m8aV48SelectedCorridorId,
        annotationText: annotation.innerText,
        annotationRect,
        connectorVisible,
        connectorStart,
        connectorEnd,
        connectorEndpointDistancePx: Number(
          connector.dataset.m8aV48ConnectorEndpointDistancePx
        ),
        connectorThresholdPx: Number(
          connector.dataset.m8aV48ConnectorThresholdPx
        ),
        connectorQuadrantOk:
          connectorVisible &&
          sameDirection(vectorToAnchor.x, vectorToEnd.x) &&
          sameDirection(vectorToAnchor.y, vectorToEnd.y),
        anchor,
        selectedEntityPoint,
        anchorPointDistanceToEntity: selectedEntityPoint
          ? Math.hypot(anchor.x - selectedEntityPoint.x, anchor.y - selectedEntityPoint.y)
          : Infinity,
        protectionRect,
        annotationProtectionHit: intersects(annotationRect, protectionRect),
        sheetVisible: isVisible(sheet),
        sheetRect,
        sheetProtectionHit:
          isVisible(sheet) && intersects(sheetRect, protectionRect),
        sheetOpen: ${JSON.stringify(sheetOpen)}
      };
    })(${JSON.stringify(expectedWindowId)})`
  );
}

async function verifySceneAnchorGeometry(client, viewport) {
  const results = [];

  for (const [windowId, expected] of Object.entries(EXPECTED_REVIEW_MODELS)) {
    await closeInspector(client);
    await seekReplayRatio(client, expected.ratio);
    const closedResult = await captureSceneAnchorGeometry(client, windowId, false);
    assertSceneAnchorGeometry(closedResult, expected, viewport, false);

    await openInspector(client);
    const openResult = await captureSceneAnchorGeometry(client, windowId, true);
    assertSceneAnchorGeometry(openResult, expected, viewport, true);
    results.push({ closedResult, openResult });
  }

  await closeInspector(client);
  return results;
}

function distance3d(left, right) {
  return Math.hypot(
    left.x - right.x,
    left.y - right.y,
    left.z - right.z
  );
}

function assertForwardDisplayPass(samples, label) {
  assert(
    samples.length >= PHASE3_MOTION_SAMPLE_COUNT,
    "V4.8 Phase 3 must sample each non-GEO representative actor at least 8 times: " +
      JSON.stringify({ label, sampleCount: samples.length })
  );

  for (const sample of samples) {
    assert(
      sample.displayMotion?.policy === "monotonic-wrapped-display-pass" &&
        sample.displayMotion.sourceBoundary ===
          EXPECTED_DISPLAY_MOTION_SOURCE_BOUNDARY &&
        sample.displayMotion.renderTrackIsSourceTruth === false &&
        sample.displayMotion.truthBoundary ===
          "viewer-owned-display-projection-not-source-truth",
      "V4.8 Phase 3 non-GEO motion must use the repo-owned monotonic display-pass policy: " +
        JSON.stringify({ label, sample })
    );
  }

  for (let index = 1; index < samples.length; index += 1) {
    assert(
      samples[index].displayMotion.unwrappedTrackProgress >
        samples[index - 1].displayMotion.unwrappedTrackProgress,
      "V4.8 Phase 3 non-GEO motion must advance monotonically through active-window samples: " +
        JSON.stringify({ label, samples })
    );
  }

  const wrapIndexes = new Set(
    samples.map((sample) => sample.displayMotion.wrapIndex)
  );

  if (wrapIndexes.size === 1) {
    for (let index = 1; index < samples.length; index += 1) {
      assert(
        samples[index].displayMotion.pathProgress >
          samples[index - 1].displayMotion.pathProgress,
        "V4.8 Phase 3 active-window samples without a seam must not reverse along the projected segment: " +
          JSON.stringify({ label, samples })
      );
    }
  }

  const startProgress = samples[0].displayMotion.pathProgress;
  const progressDistances = samples.map((sample) =>
    Math.abs(sample.displayMotion.pathProgress - startProgress)
  );
  const maxProgressDistance = Math.max(...progressDistances);
  let movedMeaningfully = false;
  const abaHits = [];

  for (let index = 1; index < samples.length; index += 1) {
    if (progressDistances[index] >= maxProgressDistance * 0.4) {
      movedMeaningfully = true;
      continue;
    }

    if (
      movedMeaningfully &&
      progressDistances[index] <= maxProgressDistance * 0.2
    ) {
      abaHits.push({
        index,
        progress: samples[index].displayMotion.pathProgress,
        distanceFromStart: progressDistances[index]
      });
    }
  }

  const renderStart = samples[0].renderPositionEcefMeters;
  const maxRenderDistance = Math.max(
    ...samples.map((sample) =>
      distance3d(sample.renderPositionEcefMeters, renderStart)
    )
  );

  assert(
    maxProgressDistance > 0.06 && maxRenderDistance > 75_000,
    "V4.8 Phase 3 non-GEO representative actor must show meaningful active-window travel: " +
      JSON.stringify({
        label,
        maxProgressDistance,
        maxRenderDistance
      })
  );
  assert(
    abaHits.length === 0,
    "V4.8 Phase 3 motion sampling must fail A-B-A / ping-pong returns after meaningful travel: " +
      JSON.stringify({
        label,
        startProgress,
        maxProgressDistance,
        abaHits,
        samples: samples.map((sample) => ({
          ratio: sample.requestedRatio,
          pathProgress: sample.displayMotion.pathProgress,
          unwrappedTrackProgress:
            sample.displayMotion.unwrappedTrackProgress,
          wrapIndex: sample.displayMotion.wrapIndex
        }))
      })
  );
}

async function captureOrbitMotionSample(client, ratio, actorId) {
  await seekReplayRatio(client, ratio);

  return await evaluateRuntimeValue(
    client,
    `((ratio, actorId) => {
      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      const state = capture.m8aV4GroundStationScene.getState();
      const actor = state.actors.find((candidate) => {
        return candidate.actorId === actorId;
      });

      if (!actor) {
        throw new Error("Missing V4.8 Phase 3 motion actor " + actorId);
      }

      return {
        requestedRatio: ratio,
        activeWindowId: state.productUx.activeWindowId,
        representativeActorId:
          state.simulationHandoverModel.window.displayRepresentativeActorId,
        actorId: actor.actorId,
        orbitClass: actor.orbitClass,
        motionMode: actor.motionMode,
        renderPositionEcefMeters: actor.renderPositionEcefMeters,
        sourcePositionEcefMeters: actor.sourcePositionEcefMeters,
        renderTrackBasis: actor.renderTrackBasis,
        renderTrackIsSourceTruth: actor.renderTrackIsSourceTruth,
        displayMotion: actor.displayMotion,
        sourceLineage: state.sourceLineage
      };
    })(${JSON.stringify(ratio)}, ${JSON.stringify(actorId)})`
  );
}

async function readV46dTimeline(client) {
  return await evaluateRuntimeValue(
    client,
    `(() => {
      const state =
        window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.m8aV4GroundStationScene.getState();

      return state.simulationHandoverModel.timeline.map((windowDefinition) => ({
        windowId: windowDefinition.windowId,
        startRatioInclusive: windowDefinition.startRatioInclusive,
        stopRatioExclusive: windowDefinition.stopRatioExclusive,
        displayRepresentativeOrbitClass:
          windowDefinition.displayRepresentativeOrbitClass,
        displayRepresentativeActorId:
          windowDefinition.displayRepresentativeActorId
      }));
    })()`
  );
}

async function verifyRepresentativeOrbitMotion(client) {
  const timeline = await readV46dTimeline(client);
  const nonGeoRepresentativeWindows = timeline.filter((windowDefinition) => {
    return windowDefinition.displayRepresentativeOrbitClass !== "geo";
  });
  const results = [];

  assert(
    nonGeoRepresentativeWindows.length === 4,
    "V4.8 Phase 3 expected four non-GEO representative windows: " +
      JSON.stringify(timeline)
  );

  for (const windowDefinition of nonGeoRepresentativeWindows) {
    const span =
      windowDefinition.stopRatioExclusive -
      windowDefinition.startRatioInclusive;
    const samples = [];

    for (let index = 0; index < PHASE3_MOTION_SAMPLE_COUNT; index += 1) {
      const sampleOffset = (index + 0.5) / PHASE3_MOTION_SAMPLE_COUNT;
      const ratio = windowDefinition.startRatioInclusive + span * sampleOffset;
      const sample = await captureOrbitMotionSample(
        client,
        ratio,
        windowDefinition.displayRepresentativeActorId
      );

      assert(
        sample.activeWindowId === windowDefinition.windowId &&
          sample.representativeActorId ===
            windowDefinition.displayRepresentativeActorId &&
          sample.orbitClass ===
            windowDefinition.displayRepresentativeOrbitClass,
        "V4.8 Phase 3 motion sample must stay inside the actor's active V4.6D window: " +
          JSON.stringify({ windowDefinition, sample })
      );
      samples.push(sample);
    }

    assertForwardDisplayPass(
      samples,
      `${windowDefinition.windowId}:${windowDefinition.displayRepresentativeActorId}`
    );
    results.push({
      windowId: windowDefinition.windowId,
      representativeActorId: windowDefinition.displayRepresentativeActorId,
      orbitClass: windowDefinition.displayRepresentativeOrbitClass,
      sampleCount: samples.length,
      startPathProgress: samples[0].displayMotion.pathProgress,
      stopPathProgress: samples[samples.length - 1].displayMotion.pathProgress,
      startUnwrappedTrackProgress:
        samples[0].displayMotion.unwrappedTrackProgress,
      stopUnwrappedTrackProgress:
        samples[samples.length - 1].displayMotion.unwrappedTrackProgress
    });
  }

  return results;
}

async function verifyWrappedDisplaySeam(client) {
  const seamCandidate = await evaluateRuntimeValue(
    client,
    `(() => {
      const state =
        window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.m8aV4GroundStationScene.getState();
      const candidates = state.actors
        .filter((actor) => {
          return (
            actor.orbitClass !== "geo" &&
            actor.displayMotion?.policy === "monotonic-wrapped-display-pass" &&
            actor.displayMotion.cycleRate > 0
          );
        })
        .map((actor) => {
          const phase = actor.displayMotion.phaseOffset;
          const cycleRate = actor.displayMotion.cycleRate;
          const firstWrapRatio = (Math.floor(phase) + 1 - phase) / cycleRate;

          return {
            actorId: actor.actorId,
            orbitClass: actor.orbitClass,
            phaseOffset: phase,
            cycleRate,
            firstWrapRatio
          };
        })
        .filter((candidate) => {
          return candidate.firstWrapRatio > 0.01 && candidate.firstWrapRatio < 0.99;
        })
        .sort((left, right) => left.firstWrapRatio - right.firstWrapRatio);

      return candidates[0] ?? null;
    })()`
  );

  assert(
    seamCandidate,
    "V4.8 Phase 3 wrapped display-pass validation must find a non-GEO wrap seam."
  );

  const epsilon = Math.min(0.004, seamCandidate.firstWrapRatio / 3);
  const before = await captureOrbitMotionSample(
    client,
    seamCandidate.firstWrapRatio - epsilon,
    seamCandidate.actorId
  );
  const after = await captureOrbitMotionSample(
    client,
    seamCandidate.firstWrapRatio + epsilon,
    seamCandidate.actorId
  );
  const later = await captureOrbitMotionSample(
    client,
    Math.min(seamCandidate.firstWrapRatio + epsilon * 4, 0.995),
    seamCandidate.actorId
  );

  assert(
    before.displayMotion.wrapIndex + 1 === after.displayMotion.wrapIndex &&
      after.displayMotion.wrapIndex === later.displayMotion.wrapIndex &&
      before.displayMotion.pathProgress > 0.95 &&
      after.displayMotion.pathProgress < 0.05 &&
      later.displayMotion.pathProgress > after.displayMotion.pathProgress &&
      before.displayMotion.unwrappedTrackProgress <
        after.displayMotion.unwrappedTrackProgress &&
      after.displayMotion.unwrappedTrackProgress <
        later.displayMotion.unwrappedTrackProgress,
    "V4.8 Phase 3 wrapped display path must advance through the seam instead of reversing: " +
      JSON.stringify({ seamCandidate, before, after, later })
  );

  return {
    actorId: seamCandidate.actorId,
    orbitClass: seamCandidate.orbitClass,
    firstWrapRatio: seamCandidate.firstWrapRatio,
    before: {
      pathProgress: before.displayMotion.pathProgress,
      unwrappedTrackProgress: before.displayMotion.unwrappedTrackProgress,
      wrapIndex: before.displayMotion.wrapIndex
    },
    after: {
      pathProgress: after.displayMotion.pathProgress,
      unwrappedTrackProgress: after.displayMotion.unwrappedTrackProgress,
      wrapIndex: after.displayMotion.wrapIndex
    },
    later: {
      pathProgress: later.displayMotion.pathProgress,
      unwrappedTrackProgress: later.displayMotion.unwrappedTrackProgress,
      wrapIndex: later.displayMotion.wrapIndex
    }
  };
}

async function verifyGeoGuardMotionSeparately(client) {
  const timeline = await readV46dTimeline(client);
  const geoWindow = timeline.find((windowDefinition) => {
    return windowDefinition.displayRepresentativeOrbitClass === "geo";
  });

  assert(
    geoWindow,
    "V4.8 Phase 3 GEO guard validation must find the GEO representative window."
  );

  const span = geoWindow.stopRatioExclusive - geoWindow.startRatioInclusive;
  const samples = [];

  for (let index = 0; index < PHASE3_MOTION_SAMPLE_COUNT; index += 1) {
    const sampleOffset = (index + 0.5) / PHASE3_MOTION_SAMPLE_COUNT;
    const ratio = Math.min(
      geoWindow.startRatioInclusive + span * sampleOffset,
      0.995
    );
    samples.push(
      await captureOrbitMotionSample(
        client,
        ratio,
        geoWindow.displayRepresentativeActorId
      )
    );
  }

  const startPosition = samples[0].renderPositionEcefMeters;
  const maxGuardDrift = Math.max(
    ...samples.map((sample) =>
      distance3d(sample.renderPositionEcefMeters, startPosition)
    )
  );

  assert(
    samples.every((sample) => {
      return (
        sample.orbitClass === "geo" &&
        sample.displayMotion?.policy === "near-fixed-geo-guard" &&
        sample.displayMotion.sourceBoundary ===
          EXPECTED_DISPLAY_MOTION_SOURCE_BOUNDARY &&
        sample.displayMotion.truthBoundary ===
          "near-fixed-geo-display-context-guard-not-service-truth"
      );
    }) && maxGuardDrift < 1,
    "V4.8 Phase 3 GEO guard motion must remain separate from LEO/MEO passage validation: " +
      JSON.stringify({ geoWindow, maxGuardDrift, samples })
  );

  return {
    windowId: geoWindow.windowId,
    representativeActorId: geoWindow.displayRepresentativeActorId,
    sampleCount: samples.length,
    maxGuardDrift
  };
}

async function verifyOrbitMotionDisplayCorrection(client) {
  const representativeMotion = await verifyRepresentativeOrbitMotion(client);
  const wrappedSeam = await verifyWrappedDisplaySeam(client);
  const geoGuardMotion = await verifyGeoGuardMotionSeparately(client);

  return {
    representativeMotion,
    wrappedSeam,
    geoGuardMotion
  };
}

async function verifyFallbackBehavior(client) {
  await setViewport(client, VIEWPORTS[0]);
  await seekReplayRatio(client, EXPECTED_REVIEW_MODELS["leo-acquisition-context"].ratio);
  await closeInspector(client);
  await evaluateRuntimeValue(
    client,
    `(() => {
      const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
      document.documentElement.dataset.m8aV48ForceSceneAnchorFallback = "true";
      capture.m8aV4GroundStationScene.pause();
    })()`
  );
  await sleep(220);

  const result = await captureSceneAnchorGeometry(
    client,
    "leo-acquisition-context",
    false
  );

  assert(
    result.anchorStatus === "fallback" &&
      result.selectedAnchorType === "non-scene-fallback" &&
      result.connectorVisible === false &&
      result.fallbackReason &&
      !/\b(attached|serving satellite|active path|active service|teleport path)\b/i.test(
        result.annotationText
      ),
    "V4.8 unreliable geometry must fall back without a connector or attachment claim: " +
      JSON.stringify(result)
  );
  await evaluateRuntimeValue(
    client,
    `(() => {
      delete document.documentElement.dataset.m8aV48ForceSceneAnchorFallback;
    })()`
  );

  return result;
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

    await setViewport(client, VIEWPORTS[0]);
    await navigateAndWait(client, serverHandle.baseUrl);

    const domInspection = await inspectPhaseTwoDom(client);
    const reviewModels = await verifyReviewViewModels(client);
    const sceneAnchorGeometry = [];

    for (const viewport of VIEWPORTS) {
      await setViewport(client, viewport);
      await sleep(160);
      sceneAnchorGeometry.push({
        viewport: viewport.name,
        results: await verifySceneAnchorGeometry(client, viewport)
      });
    }

    await setViewport(client, VIEWPORTS[0]);
    await sleep(160);
    const orbitMotionDisplayCorrection =
      await verifyOrbitMotionDisplayCorrection(client);
    const fallbackBehavior = await verifyFallbackBehavior(client);

    console.log(
      `M8A-V4.8 handover demonstration UI IA Phase 3 smoke passed: ${JSON.stringify(
        {
          domInspection,
          reviewWindows: reviewModels.map((result) => ({
            windowId: result.review.windowId,
            productLabel: result.review.productLabel,
            representativeActorId: result.review.representativeActorId,
            candidateContextActorIds: result.review.candidateContextActorIds,
            fallbackContextActorIds: result.review.fallbackContextActorIds,
            sceneAnchorState: result.review.sceneAnchorState.state,
            selectedAnchorType: result.review.sceneAnchorState.selectedAnchorType
          })),
          sceneAnchorGeometry: sceneAnchorGeometry.map((viewportResult) => ({
            viewport: viewportResult.viewport,
            windows: viewportResult.results.map((result) => ({
              windowId: result.closedResult.expectedWindowId,
              closedAnchorStatus: result.closedResult.anchorStatus,
              openAnchorStatus: result.openResult.anchorStatus,
              selectedAnchorType: result.closedResult.selectedAnchorType,
              connectorEndpointDistancePx:
                result.closedResult.connectorEndpointDistancePx
            }))
          })),
          orbitMotionDisplayCorrection,
          fallbackBehavior: {
            anchorStatus: fallbackBehavior.anchorStatus,
            fallbackReason: fallbackBehavior.fallbackReason,
            connectorVisible: fallbackBehavior.connectorVisible
          },
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
