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

// M8A-V3.3 regression lock. V3.1 (8d93aea) wired the addressed-route
// `firstIntakeAutoplay=1` flag to `firstIntakeReplayTimeAuthority.replayClock.play()`
// so entry-time motion is visible through the Cesium animation widget + timeline
// (motion-visibility option (c) in docs/sdd/m8a-v3-motion-and-replay-affordance-plan.md).
// R1V.2 already asserts the paused-default behavior on the no-flag route; this
// smoke test locks the flagged (autoplay) path so a regression cannot silently
// ship with the CTA advertising autoplay while the route lands paused.
const TARGET_SCENARIO_ID = "app-oneweb-intelsat-geo-aviation";
const AUTOPLAY_REQUEST_PATH = `/?scenePreset=global&firstIntakeScenarioId=${encodeURIComponent(
  TARGET_SCENARIO_ID
)}&firstIntakeAutoplay=1`;
const PAUSED_REQUEST_PATH = `/?scenePreset=global&firstIntakeScenarioId=${encodeURIComponent(
  TARGET_SCENARIO_ID
)}`;
const EXPECTED_REPLAY_START_UTC = "2026-04-21T01:28:07.420000Z";
const EXPECTED_REPLAY_STOP_UTC = "2026-04-21T02:09:36.690000Z";
const EXPECTED_PROOF_SEAM =
  "window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.firstIntakeReplayTimeAuthority";
// At 60x a 300 ms wall window advances replay time by ~18 s. Assert an order-of-
// magnitude lower bound so CI jitter cannot mask a regression where play() never
// fires but the clock shouldAnimate flag flips true.
const POST_LOAD_ADVANCE_MIN_MS = 250;
const POST_LOAD_WAIT_MS = 400;

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
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
          scenePreset: root?.dataset.scenePreset ?? null
        };
      })()`
    );

    if (
      lastState.bootstrapState === "ready" &&
      lastState.scenePreset === "global"
    ) {
      return;
    }

    if (lastState.bootstrapState === "error") {
      throw new Error(
        `M8A-V3.3 validation hit bootstrap error: ${JSON.stringify(lastState)}`
      );
    }

    await sleep(50);
  }

  throw new Error(
    `M8A-V3.3 validation did not reach a ready viewer: ${JSON.stringify(
      lastState
    )}`
  );
}

async function navigateAndWait(client, url) {
  await client.send("Page.navigate", { url });
  await waitForBootstrapReady(client);
}

async function main() {
  ensureDistBuildExists();
  const browserCommand = findHeadlessBrowser();
  const { server, baseUrl } = await startStaticServer();

  try {
    await verifyFetches(baseUrl);
    const browser = await startHeadlessBrowser(browserCommand);

    try {
      const pageWebSocketUrl = await resolvePageWebSocketUrl(
        browser.browserWebSocketUrl
      );
      const client = await connectCdp(pageWebSocketUrl);

      try {
        await client.send("Page.enable");
        await client.send("Runtime.enable");
        await client.send("Emulation.setDeviceMetricsOverride", {
          width: 1440,
          height: 900,
          deviceScaleFactor: 1,
          mobile: false
        });

        await navigateAndWait(client, `${baseUrl}${AUTOPLAY_REQUEST_PATH}`);

        const autoplayResult = await evaluateRuntimeValue(
          client,
          `(async () => {
            const sleep = (ms) =>
              new Promise((resolve) => {
                setTimeout(resolve, ms);
              });
            const assert = (condition, message) => {
              if (!condition) {
                throw new Error(message);
              }
            };
            const parseMs = (value) => {
              const parsed = typeof value === "number" ? value : Date.parse(value);

              assert(Number.isFinite(parsed), "Replay timestamp must parse.");
              return parsed;
            };

            for (let attempt = 0; attempt < 100; attempt += 1) {
              const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
              const authorityState =
                capture?.firstIntakeReplayTimeAuthority?.getState?.() ?? null;

              if (
                capture?.firstIntakeReplayTimeAuthority &&
                authorityState?.replayStartUtc === "${EXPECTED_REPLAY_START_UTC}" &&
                authorityState?.isPlaying === true
              ) {
                break;
              }

              await sleep(50);
            }

            const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
            assert(capture, "Missing runtime capture seam on autoplay route.");
            assert(
              capture.firstIntakeReplayTimeAuthority,
              "Missing M8A-V3.3 replay time authority seam on autoplay route."
            );

            const authority = capture.firstIntakeReplayTimeAuthority;
            const authorityState = authority.getState();
            const replayState = capture.replayClock.getState();
            const viewer = capture.viewer;
            const clockViewModel = viewer.clockViewModel;
            const animationViewModel = viewer.animation?.viewModel ?? null;
            const timeline = viewer.timeline ?? null;

            // (1) canonical entry-time replay strategy: autoplay on demo entry
            assert(
              authorityState.isPlaying === true &&
                replayState.isPlaying === true,
              "M8A-V3.3 autoplay flag must land the addressed route in isPlaying=true."
            );

            // (2) allowed-multiplier default lock
            assert(
              authorityState.multiplier === 60 &&
                authorityState.defaultMultiplier === 60 &&
                replayState.multiplier === 60,
              "M8A-V3.3 autoplay must start at the bounded 60x default multiplier."
            );

            // (3) shared addressed-route authority + prerecorded mode
            assert(
              authorityState.mode === "prerecorded" &&
                authorityState.addressResolution === "matched" &&
                authorityState.timeAuthorityState ===
                  "active-addressed-route-replay-authority" &&
                authorityState.proofSeam === "${EXPECTED_PROOF_SEAM}",
              "M8A-V3.3 must keep the addressed-route replay authority in prerecorded mode."
            );

            // (4) Single-Authority Rule: one bounded clock is the shared surface
            assert(
              capture.replayClock === authority.replayClock,
              "M8A-V3.3 Single-Authority Rule: capture.replayClock must be the authority-owned bounded clock."
            );

            // (5) replay window derived from the trajectory seam (same as R1V.2)
            assert(
              authorityState.replayStartUtc === "${EXPECTED_REPLAY_START_UTC}" &&
                authorityState.replayStopUtc === "${EXPECTED_REPLAY_STOP_UTC}",
              "M8A-V3.3 autoplay must not drift the addressed replay window."
            );

            // (6) Motion-Visibility option (c): replay surface is bound
            assert(
              authorityState.animationWidgetBound === true &&
                authorityState.timelineBound === true,
              "M8A-V3.3 motion-visibility option (c) requires the animation widget and timeline to be bound."
            );

            // (7) Native Cesium widgets mirror the bounded authority
            assert(
              animationViewModel &&
                animationViewModel.clockViewModel === clockViewModel &&
                clockViewModel.shouldAnimate === true &&
                clockViewModel.multiplier === 60 &&
                viewer.clock.shouldAnimate === true &&
                viewer.clock.multiplier === 60 &&
                timeline &&
                timeline._clock === viewer.clock,
              "M8A-V3.3 native Cesium widgets must advertise the autoplay state through the shared clock."
            );

            // (8) Replay clock begins near replay start (not pre-advanced) and walks
            const replayStartMs = parseMs(authorityState.replayStartUtc);
            const initialCurrentMs = parseMs(replayState.currentTime);
            const initialDeltaMs = initialCurrentMs - replayStartMs;

            assert(
              initialDeltaMs >= 0 && initialDeltaMs < 60 * 1000,
              "M8A-V3.3 autoplay must begin within the first replay minute, not pre-advanced."
            );

            await sleep(${POST_LOAD_WAIT_MS});

            const advancedCurrentMs = parseMs(
              capture.replayClock.getState().currentTime
            );
            const advancedDeltaMs = advancedCurrentMs - initialCurrentMs;

            assert(
              advancedDeltaMs >= ${POST_LOAD_ADVANCE_MIN_MS},
              "M8A-V3.3 autoplay clock must advance after a short wait: delta=" +
                advancedDeltaMs +
                "ms"
            );

            return {
              replayStartUtc: authorityState.replayStartUtc,
              replayStopUtc: authorityState.replayStopUtc,
              multiplier: authorityState.multiplier,
              isPlaying: authorityState.isPlaying,
              initialDeltaMs,
              advancedDeltaMs
            };
          })()`,
          { awaitPromise: true }
        );

        await navigateAndWait(client, `${baseUrl}${PAUSED_REQUEST_PATH}`);

        const pausedResult = await evaluateRuntimeValue(
          client,
          `(() => {
            const assert = (condition, message) => {
              if (!condition) {
                throw new Error(message);
              }
            };
            const parseMs = (value) => {
              const parsed = typeof value === "number" ? value : Date.parse(value);

              assert(Number.isFinite(parsed), "Replay timestamp must parse.");
              return parsed;
            };

            const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
            assert(capture, "Missing capture seam on paused route.");
            assert(
              capture.firstIntakeReplayTimeAuthority,
              "Missing replay authority on paused route."
            );

            const authorityState =
              capture.firstIntakeReplayTimeAuthority.getState();
            const replayState = capture.replayClock.getState();

            // Negative-path guard: without the autoplay flag, M8A-V3.3 must not
            // turn the addressed route into ambient autoplay. R1V.2 already
            // asserts this on the default-addressed route; we re-assert here so
            // the autoplay coupling stays isolated to the flag.
            assert(
              authorityState.isPlaying === false &&
                replayState.isPlaying === false &&
                capture.viewer.clock.shouldAnimate === false,
              "M8A-V3.3 paused-default contract: no-flag addressed route must stay paused."
            );

            const replayStartMs = parseMs(authorityState.replayStartUtc);
            const currentMs = parseMs(replayState.currentTime);

            assert(
              currentMs === replayStartMs,
              "M8A-V3.3 paused-default contract: no-flag current time must equal replay start."
            );

            return {
              isPlaying: replayState.isPlaying,
              multiplier: replayState.multiplier,
              startUtc: authorityState.replayStartUtc,
              currentUtc: replayState.currentTime
            };
          })()`
        );

        console.log(
          JSON.stringify(
            {
              autoplayResult,
              pausedResult
            },
            null,
            2
          )
        );
      } finally {
        await client.close();
      }
    } finally {
      await stopHeadlessBrowser(browser);
    }
  } finally {
    await stopStaticServer(server);
  }
}

await main();
