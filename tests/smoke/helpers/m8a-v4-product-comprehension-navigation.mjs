import {
  evaluateRuntimeValue,
  sleep,
  waitForGlobeReady
} from "./m8a-v4-browser-capture-harness.mjs";
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

export async function waitForBootstrapReady(client) {
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

export async function navigateAndWait(client, baseUrl) {
  await client.send("Page.navigate", { url: `${baseUrl}${REQUEST_PATH}` });
  await waitForBootstrapReady(client);
  await waitForGlobeReady(client, "M8A-V4.9");
}

export async function seekReplayRatio(client, ratio) {
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
      capture.viewer?.clock?.tick?.();
      capture.m8aV4GroundStationScene.pause();
    })(${JSON.stringify(ratio)})`
  );
  await sleep(180);
}
