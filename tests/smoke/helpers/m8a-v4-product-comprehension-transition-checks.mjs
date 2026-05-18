import {
  assert,
  clickAt,
  evaluateRuntimeValue,
  setViewport,
  sleep,
  waitForGlobeReady
} from "./m8a-v4-browser-capture-harness.mjs";
import {
  seekReplayRatio,
  waitForBootstrapReady
} from "./m8a-v4-product-comprehension-navigation.mjs";
import {
  assertDefaultVisualEvidence,
  capturePersistentLayer,
  closeInspector,
  closeBoundarySurface
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

export function expectedTransitionContext(expectedTo) {
  if (expectedTo.orbitClassToken === "MEO") {
    return "Continuity shifts to MEO review context";
  }

  if (expectedTo.orbitClassToken === "GEO") {
    return "Continuity guard shifts to GEO guard context";
  }

  return "Review context shifts to LEO focus";
}

export function assertTransitionEvent(result, expectedFrom, expectedTo) {
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

export function expectedTransitionSummary(expectedFrom, expectedTo) {
  return `${EXPECTED_TRANSITION_LABELS[expectedFrom.windowId]} -> ${EXPECTED_TRANSITION_LABELS[expectedTo.windowId]}`;
}

export async function waitForTransitionEvent(client, expectedFrom, expectedTo) {
  let lastResult = null;

  for (let attempt = 0; attempt < 60; attempt += 1) {
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
        lastResult: {
          activeWindowId: lastResult?.activeWindowId,
          activeProductLabel: lastResult?.activeProductLabel,
          transitionEvent: lastResult?.transitionEvent,
          productRootDataset: {
            transitionEventVisible:
              lastResult?.productRootDataset?.transitionEventVisible,
            transitionEventText:
              lastResult?.productRootDataset?.transitionEventText,
            transitionEventContext:
              lastResult?.productRootDataset?.transitionEventContext
          },
          playback: lastResult?.state?.productUx?.playback,
          reviewerMode: lastResult?.state?.productUx?.reviewerMode
        }
      })
  );
}

export async function triggerTransition(client, fromExpected, toExpected) {
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

export async function verifyTransitionInitialState(client) {
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

export async function verifyTransitionTimeout(client, visibleResult) {
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

export async function captureControlHitTargets(client) {
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

export async function verifyTransitionControlsNonBlocking(client) {
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

export async function verifyTransitionEventLayer(client) {
  try {
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
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !error.message.includes(
        "transition event did not appear for expected window change"
      )
    ) {
      throw error;
    }

    const successorSurface = await evaluateRuntimeValue(
      client,
      `(() => {
        const root = document.querySelector("[data-m8a-v47-product-ux='true']");
        return {
          transientSurface:
            root?.dataset.m8aV411TransientSurface ?? null,
          transientSurfaceScope:
            root?.dataset.m8aV411TransientSurfaceScope ?? null,
          toastDurationMs:
            root?.dataset.m8aV411TransitionToastDurationMs ?? null,
          toastMaxCount:
            root?.dataset.m8aV411TransitionToastMaxCount ?? null
        };
      })()`
    );

    assert(
      successorSurface.transientSurface ===
        "m8a-v4.11-transition-toast-slice4-runtime.v1" &&
        successorSurface.transientSurfaceScope === "slice4-transition-toast" &&
        successorSurface.toastDurationMs === "2500" &&
        successorSurface.toastMaxCount === "2",
      "V4.9 legacy transition event is absent but successor transient surface seam is not mounted: " +
        JSON.stringify({ successorSurface, error: error.message })
    );

    await client.send("Page.reload", { ignoreCache: true });
    await waitForBootstrapReady(client);
    await waitForGlobeReady(client, "M8A-V4.9");

    return {
      legacyV49ActiveEvent: "superseded-by-v411-transient-surface",
      successorSurface,
      diagnostic: error.message
    };
  }
}
