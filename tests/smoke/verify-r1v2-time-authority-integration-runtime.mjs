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

const TARGET_SCENARIO_ID = "app-oneweb-intelsat-geo-aviation";
const EXPECTED_REQUEST_PATH = `/?scenePreset=global&firstIntakeScenarioId=${encodeURIComponent(
  TARGET_SCENARIO_ID
)}`;
const DEFAULT_REQUEST_PATH = "/?scenePreset=global";
const EXPECTED_REPLAY_START_UTC = "2026-04-21T01:28:07.420000Z";
const EXPECTED_REPLAY_STOP_UTC = "2026-04-21T02:09:36.690000Z";
const EXPECTED_ALLOWED_MULTIPLIERS = [1, 10, 30, 60, 120];
const EXPECTED_PROOF_SEAM =
  "window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.firstIntakeReplayTimeAuthority";

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
        `R1V.2 validation hit bootstrap error: ${JSON.stringify(lastState)}`
      );
    }

    await sleep(50);
  }

  throw new Error(
    `R1V.2 validation did not reach a ready viewer: ${JSON.stringify(lastState)}`
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

        await navigateAndWait(client, `${baseUrl}${EXPECTED_REQUEST_PATH}`);

        const addressedResult = await evaluateRuntimeValue(
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
            const normalizeTimestampMs = (value) => {
              const parsed = typeof value === "number" ? value : Date.parse(value);

              assert(Number.isFinite(parsed), "Replay timestamp must parse.");
              return parsed;
            };
            const sameJulian = (left, right) => {
              return (
                left &&
                right &&
                left.dayNumber === right.dayNumber &&
                Math.abs(left.secondsOfDay - right.secondsOfDay) < 1e-6
              );
            };

            for (let attempt = 0; attempt < 100; attempt += 1) {
              const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
              const authorityState =
                capture?.firstIntakeReplayTimeAuthority?.getState?.() ?? null;
              const expressionState =
                capture?.firstIntakeNearbySecondEndpointExpression?.getState?.() ??
                null;

              if (
                capture?.firstIntakeReplayTimeAuthority &&
                capture?.firstIntakeMobileEndpointTrajectory &&
                capture?.firstIntakeNearbySecondEndpointExpression &&
                authorityState?.replayStartUtc === "${EXPECTED_REPLAY_START_UTC}" &&
                expressionState?.dataSourceAttached === true
              ) {
                break;
              }

              await sleep(50);
            }

            const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
            assert(capture, "Missing runtime capture seam.");
            assert(
              capture.firstIntakeReplayTimeAuthority,
              "Missing R1V.2 replay time authority seam."
            );
            assert(
              capture.firstIntakeMobileEndpointTrajectory,
              "Missing addressed route mobile trajectory seam."
            );
            assert(
              capture.firstIntakeNearbySecondEndpointExpression,
              "Missing M8A.3 expression seam needed for replay-time proof."
            );

            const authority = capture.firstIntakeReplayTimeAuthority;
            const trajectoryState =
              capture.firstIntakeMobileEndpointTrajectory.getState();
            const initialExpressionState =
              capture.firstIntakeNearbySecondEndpointExpression.getState();
            const authorityState = authority.getState();
            const replayState = capture.replayClock.getState();
            const rootData = document.documentElement.dataset;
            const clockViewModel = capture.viewer.clockViewModel;
            const animationViewModel = capture.viewer.animation?.viewModel ?? null;
            const timeline = capture.viewer.timeline ?? null;
            const replayStartMs = normalizeTimestampMs(
              trajectoryState.trajectory.trajectory.windowStartUtc
            );
            const replayStopMs = normalizeTimestampMs(
              trajectoryState.trajectory.trajectory.windowEndUtc
            );

            assert(
              capture.firstIntakeScenarioSurface.getState().addressResolution ===
                "matched" &&
                capture.scenarioSession.getCurrentScenario()?.scenarioId ===
                  "${TARGET_SCENARIO_ID}",
              "Addressed first-intake route must remain the active owner lane."
            );

            assert(
              capture.replayClock === authority.replayClock,
              "The addressed route capture seam must expose the bounded replay clock owned by R1V.2."
            );

            assert(
              authorityState.timeAuthorityState ===
                "active-addressed-route-replay-authority" &&
                authorityState.proofSeam === "${EXPECTED_PROOF_SEAM}" &&
                authorityState.trajectoryProofSeam ===
                  trajectoryState.proofSeam &&
                authorityState.replayClockProofSeam ===
                  "window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.replayClock",
              "R1V.2 must expose a dedicated addressed-route replay authority proof seam."
            );

            assert(
              trajectoryState.trajectory.trajectory.windowStartUtc ===
                "${EXPECTED_REPLAY_START_UTC}" &&
                trajectoryState.trajectory.trajectory.windowEndUtc ===
                  "${EXPECTED_REPLAY_STOP_UTC}",
              "The trajectory seam must preserve the accepted replay window."
            );

            assert(
              authorityState.replayStartUtc ===
                trajectoryState.trajectory.trajectory.windowStartUtc &&
                authorityState.replayStopUtc ===
                  trajectoryState.trajectory.trajectory.windowEndUtc,
              "R1V.2 must derive replay start/stop from the first-intake trajectory seam."
            );

            assert(
              replayState.mode === "prerecorded" &&
                normalizeTimestampMs(replayState.startTime) === replayStartMs &&
                normalizeTimestampMs(replayState.stopTime) === replayStopMs &&
                normalizeTimestampMs(replayState.currentTime) === replayStartMs &&
                replayState.isPlaying === false &&
                replayState.multiplier === 60,
              "Addressed route replay must initialize paused at replay start with the default 60x multiplier."
            );

            assert(
              normalizeTimestampMs(authorityState.currentTimeUtc) === replayStartMs &&
                authorityState.mode === replayState.mode &&
                authorityState.multiplier === replayState.multiplier &&
                authorityState.isPlaying === replayState.isPlaying &&
                authorityState.defaultMultiplier === 60 &&
                authorityState.allowedMultipliers.join("|") ===
                  "${EXPECTED_ALLOWED_MULTIPLIERS.join("|")}" &&
                authorityState.resetPolicy === "pause-seek-start-restore-60x" &&
                authorityState.stopBehavior === "clamp-and-pause",
              "Authority state must mirror the bounded replay defaults and policies."
            );

            assert(
              animationViewModel &&
                animationViewModel.clockViewModel === clockViewModel &&
                animationViewModel.getShuttleRingTicks().join("|") ===
                  "${EXPECTED_ALLOWED_MULTIPLIERS.join("|")}" &&
                clockViewModel.multiplier === replayState.multiplier &&
                clockViewModel.shouldAnimate === replayState.isPlaying,
              "Cesium animation widget must use the same clock view model and bounded speed presets."
            );

            assert(
              timeline &&
                timeline._clock === capture.viewer.clock &&
                sameJulian(timeline._startJulian, capture.viewer.clock.startTime) &&
                sameJulian(timeline._endJulian, capture.viewer.clock.stopTime) &&
                sameJulian(timeline._scrubJulian, capture.viewer.clock.currentTime),
              "Cesium timeline must be bound to the same viewer clock and replay window."
            );

            assert(
              rootData.firstIntakeReplayTimeAuthorityState ===
                "active-addressed-route-replay-authority" &&
                rootData.firstIntakeReplayTimeAuthorityScenarioId ===
                  "${TARGET_SCENARIO_ID}" &&
                rootData.firstIntakeReplayTimeAuthorityReplayStartUtc ===
                  "${EXPECTED_REPLAY_START_UTC}" &&
                rootData.firstIntakeReplayTimeAuthorityReplayStopUtc ===
                  "${EXPECTED_REPLAY_STOP_UTC}" &&
                rootData.firstIntakeReplayTimeAuthorityMode === "prerecorded" &&
                rootData.firstIntakeReplayTimeAuthorityMultiplier === "60" &&
                rootData.firstIntakeReplayTimeAuthorityIsPlaying === "false" &&
                rootData.firstIntakeReplayTimeAuthorityDefaultMultiplier ===
                  "60" &&
                rootData.firstIntakeReplayTimeAuthorityAllowedMultipliers ===
                  "1x|10x|30x|60x|120x" &&
                rootData.firstIntakeReplayTimeAuthorityAnimationWidgetBound ===
                  "true" &&
                rootData.firstIntakeReplayTimeAuthorityTimelineBound === "true" &&
                rootData.firstIntakeReplayTimeAuthorityResetPolicy ===
                  "pause-seek-start-restore-60x" &&
                rootData.firstIntakeReplayTimeAuthorityStopBehavior ===
                  "clamp-and-pause" &&
                rootData.firstIntakeReplayTimeAuthorityTrajectoryProofSeam ===
                  trajectoryState.proofSeam &&
                rootData.firstIntakeReplayTimeAuthorityReplayClockProofSeam ===
                  "window.__SCENARIO_GLOBE_VIEWER_CAPTURE__.replayClock" &&
                rootData.firstIntakeReplayTimeAuthorityProofSeam ===
                  "${EXPECTED_PROOF_SEAM}",
              "Document telemetry must publish the bounded R1V.2 replay authority state."
            );

            const scrubTargetMs = replayStartMs + Math.floor((replayStopMs - replayStartMs) / 2);
            const scrubSeconds = (scrubTargetMs - replayStartMs) / 1000;
            timeline._setTimeBarTime(320, scrubSeconds);
            await sleep(100);

            const replayAfterScrub = capture.replayClock.getState();
            const authorityAfterScrub = authority.getState();
            const expressionAfterScrub =
              capture.firstIntakeNearbySecondEndpointExpression.getState();

            assert(
              normalizeTimestampMs(replayAfterScrub.currentTime) === scrubTargetMs &&
                normalizeTimestampMs(authorityAfterScrub.currentTimeUtc) ===
                  scrubTargetMs &&
                replayAfterScrub.isPlaying === false &&
                clockViewModel.shouldAnimate === false &&
                sameJulian(timeline._scrubJulian, capture.viewer.clock.currentTime),
              "Timeline scrubbing must update the shared replay authority while remaining paused."
            );

            assert(
              expressionAfterScrub.currentMobileCue.waypointSequence >
                initialExpressionState.currentMobileCue.waypointSequence &&
                expressionAfterScrub.currentMobileCue.pointTimeUtc !==
                  initialExpressionState.currentMobileCue.pointTimeUtc,
              "Replay-time scrub may only use nearest-sample cue repositioning to prove shared state in R1V.2."
            );

            authority.reset();
            await sleep(100);

            const replayAfterReset = capture.replayClock.getState();
            const authorityAfterReset = authority.getState();
            const expressionAfterReset =
              capture.firstIntakeNearbySecondEndpointExpression.getState();

            assert(
              normalizeTimestampMs(replayAfterReset.currentTime) === replayStartMs &&
                normalizeTimestampMs(authorityAfterReset.currentTimeUtc) ===
                  replayStartMs &&
                replayAfterReset.isPlaying === false &&
                replayAfterReset.multiplier === 60 &&
                clockViewModel.multiplier === 60 &&
                clockViewModel.shouldAnimate === false &&
                expressionAfterReset.currentMobileCue.waypointSequence ===
                  initialExpressionState.currentMobileCue.waypointSequence,
              "Reset must seek to replay start, pause, restore 60x, and realign replay-driven state."
            );

            capture.replayClock.setMultiplier(120);
            capture.replayClock.seek(replayStopMs - 100);
            capture.replayClock.play();
            await sleep(250);

            const replayAfterStopClamp = capture.replayClock.getState();
            const authorityAfterStopClamp = authority.getState();

            assert(
              normalizeTimestampMs(replayAfterStopClamp.currentTime) ===
                replayStopMs &&
                normalizeTimestampMs(authorityAfterStopClamp.currentTimeUtc) ===
                  replayStopMs &&
                replayAfterStopClamp.isPlaying === false &&
                authorityAfterStopClamp.isPlaying === false &&
                clockViewModel.shouldAnimate === false &&
                capture.viewer.clock.shouldAnimate === false &&
                sameJulian(timeline._scrubJulian, capture.viewer.clock.currentTime),
              "Replay playback must clamp at replay stop and pause the shared authority."
            );

            return {
              replayStartUtc: authorityState.replayStartUtc,
              replayStopUtc: authorityState.replayStopUtc,
              allowedMultipliers: authorityState.allowedMultipliers,
              scrubWaypointSequence:
                expressionAfterScrub.currentMobileCue.waypointSequence,
              stopClampCurrentTimeUtc: authorityAfterStopClamp.currentTimeUtc
            };
          })()`,
          { awaitPromise: true }
        );

        await navigateAndWait(client, `${baseUrl}${DEFAULT_REQUEST_PATH}`);

        const defaultRouteResult = await evaluateRuntimeValue(
          client,
          `(() => {
            const assert = (condition, message) => {
              if (!condition) {
                throw new Error(message);
              }
            };

            const capture = window.__SCENARIO_GLOBE_VIEWER_CAPTURE__;
            const rootData = document.documentElement.dataset;

            assert(capture, "Missing capture seam on default route.");
            assert(
              capture.firstIntakeReplayTimeAuthority === undefined,
              "Default route must not publish the R1V.2 replay authority seam."
            );
            assert(
              rootData.firstIntakeReplayTimeAuthorityState === undefined &&
                rootData.firstIntakeReplayTimeAuthorityScenarioId === undefined &&
                rootData.firstIntakeReplayTimeAuthorityProofSeam === undefined,
              "Default route must not publish R1V.2 time-authority document telemetry."
            );

            return {
              replayClockAvailable: Boolean(capture.replayClock),
              timeAuthorityPublished:
                rootData.firstIntakeReplayTimeAuthorityState ?? null
            };
          })()`
        );

        console.log(
          JSON.stringify(
            {
              addressedResult,
              defaultRouteResult
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
