import {
  buildReplayClockEvaluation,
  runReplayClockValidation
} from "./verify-phase3.3-replay-clock-real-time.mjs";

await runReplayClockValidation({
  phaseLabel: "Phase 3.4 replay-clock prerecorded",
  evaluationExpression: buildReplayClockEvaluation(`
    const initialState = capture.replayClock.getState();
    assertSerializableState(initialState, "initial", "real-time");
    const clipStartMs = normalizeTimestampMs(initialState.currentTime);
    assert(Number.isFinite(clipStartMs), "Initial replay-clock timestamp must parse.");
    const clipStopMs = clipStartMs + 2000;

    capture.replayClock.setMode("prerecorded", {
      start: clipStartMs,
      stop: clipStopMs
    });
    const stateAfterPrerecordedMode = capture.replayClock.getState();
    assertSerializableState(
      stateAfterPrerecordedMode,
      "after setMode(prerecorded, range)",
      "prerecorded"
    );
    assert(
      normalizeTimestampMs(stateAfterPrerecordedMode.startTime) === clipStartMs,
      "setMode(prerecorded, range) must update startTime."
    );
    assert(
      normalizeTimestampMs(stateAfterPrerecordedMode.stopTime) === clipStopMs,
      "setMode(prerecorded, range) must update stopTime."
    );
    assert(
      capture.viewer.clock.clockRange === 1,
      "setMode(prerecorded, range) must clamp the active viewer clock range."
    );
    assert(
      capture.viewer.clock.clockStep === 1,
      "prerecorded mode must stay on Cesium SYSTEM_CLOCK_MULTIPLIER."
    );

    const seekInsideMs = clipStartMs + 500;
    capture.replayClock.seek(seekInsideMs);
    const stateAfterSeekInside = capture.replayClock.getState();
    assertSerializableState(stateAfterSeekInside, "after prerecorded seek inside", "prerecorded");
    assert(
      normalizeTimestampMs(stateAfterSeekInside.currentTime) === seekInsideMs,
      "prerecorded seek must update currentTime inside range."
    );

    capture.replayClock.seek(clipStartMs - 1000);
    const stateAfterSeekBeforeStart = capture.replayClock.getState();
    assertSerializableState(
      stateAfterSeekBeforeStart,
      "after prerecorded seek before start",
      "prerecorded"
    );
    assert(
      normalizeTimestampMs(stateAfterSeekBeforeStart.currentTime) === clipStartMs,
      "prerecorded seek must clamp before startTime."
    );

    capture.replayClock.seek(clipStopMs + 1000);
    const stateAfterSeekAfterStop = capture.replayClock.getState();
    assertSerializableState(
      stateAfterSeekAfterStop,
      "after prerecorded seek after stop",
      "prerecorded"
    );
    assert(
      normalizeTimestampMs(stateAfterSeekAfterStop.currentTime) === clipStopMs,
      "prerecorded seek must clamp after stopTime."
    );

    capture.replayClock.setMode("real-time", {
      start: clipStartMs,
      stop: clipStopMs
    });
    capture.replayClock.setMode("prerecorded");
    const stateAfterPrerecordedWithoutRange = capture.replayClock.getState();
    assertSerializableState(
      stateAfterPrerecordedWithoutRange,
      "after setMode(prerecorded) without range",
      "prerecorded"
    );
    assert(
      normalizeTimestampMs(stateAfterPrerecordedWithoutRange.startTime) === clipStartMs,
      "setMode(prerecorded) without range must reuse the active startTime."
    );
    assert(
      normalizeTimestampMs(stateAfterPrerecordedWithoutRange.stopTime) === clipStopMs,
      "setMode(prerecorded) without range must reuse the active stopTime."
    );

    capture.replayClock.setMultiplier(12);
    const stateAfterMultiplier = capture.replayClock.getState();
    assertSerializableState(stateAfterMultiplier, "after prerecorded setMultiplier", "prerecorded");
    assert(
      capture.viewer.clock.multiplier === 12,
      "prerecorded setMultiplier must update the underlying viewer.clock multiplier."
    );
    assert(
      stateAfterMultiplier.isPlaying === false,
      "prerecorded setMultiplier must not auto-play the clock."
    );

    let tickCount = 0;
    let lastTickState = null;
    const unsubscribe = capture.replayClock.onTick((state) => {
      tickCount += 1;
      lastTickState = state;
    });

    capture.replayClock.seek(clipStartMs);
    const rawBeforePrerecordedPlay = snapshotRawClock();
    capture.replayClock.play();
    await sleep(200);
    const rawAfterPrerecordedPlay = snapshotRawClock();
    assert(
      capture.viewer.clock.shouldAnimate === true,
      "prerecorded play must update the underlying viewer.clock shouldAnimate flag."
    );
    assert(tickCount > 0, "prerecorded onTick listener must receive updates while active.");
    assertSerializableState(lastTickState, "prerecorded tick listener", "prerecorded");
    assert(
      rawAfterPrerecordedPlay.dayNumber !== rawBeforePrerecordedPlay.dayNumber ||
        Math.abs(rawAfterPrerecordedPlay.secondsOfDay - rawBeforePrerecordedPlay.secondsOfDay) >
          0.0001,
      "prerecorded play must advance the underlying viewer.clock currentTime."
    );

    capture.replayClock.pause();
    const pausedPrerecordedState = capture.replayClock.getState();
    const rawAfterPrerecordedPause = snapshotRawClock();
    await sleep(150);
    const rawAfterPrerecordedPauseWait = snapshotRawClock();
    assertSerializableState(
      pausedPrerecordedState,
      "after prerecorded pause",
      "prerecorded"
    );
    assert(
      capture.viewer.clock.shouldAnimate === false,
      "prerecorded pause must update the underlying viewer.clock shouldAnimate flag."
    );
    assert(
      rawAfterPrerecordedPause.dayNumber === rawAfterPrerecordedPauseWait.dayNumber &&
        Math.abs(
          rawAfterPrerecordedPause.secondsOfDay -
            rawAfterPrerecordedPauseWait.secondsOfDay
        ) < 0.0001,
      "prerecorded pause must stop viewer.clock time advancement."
    );

    capture.replayClock.seek(clipStopMs - 100);
    capture.replayClock.setMultiplier(100);
    capture.replayClock.play();
    await sleep(150);
    const stateAfterForwardClamp = capture.replayClock.getState();
    capture.replayClock.pause();
    assertSerializableState(
      stateAfterForwardClamp,
      "after prerecorded forward clamp",
      "prerecorded"
    );
    assert(
      normalizeTimestampMs(stateAfterForwardClamp.currentTime) === clipStopMs,
      "prerecorded forward playback must clamp at stopTime."
    );

    capture.replayClock.seek(clipStartMs + 100);
    capture.replayClock.setMultiplier(-100);
    capture.replayClock.play();
    await sleep(150);
    const stateAfterReverseClamp = capture.replayClock.getState();
    capture.replayClock.pause();
    assertSerializableState(
      stateAfterReverseClamp,
      "after prerecorded reverse clamp",
      "prerecorded"
    );
    assert(
      normalizeTimestampMs(stateAfterReverseClamp.currentTime) === clipStartMs,
      "prerecorded reverse playback must clamp at startTime."
    );

    const tickCountBeforeUnsubscribe = tickCount;
    unsubscribe();
    await sleep(150);
    assert(
      tickCount === tickCountBeforeUnsubscribe,
      "prerecorded onTick unsubscribe must stop further replay-clock callbacks."
    );

    capture.replayClock.setMode("real-time");
    const stateAfterReturnToRealTime = capture.replayClock.getState();
    assertSerializableState(
      stateAfterReturnToRealTime,
      "after switching back to real-time",
      "real-time"
    );
    assert(
      normalizeTimestampMs(stateAfterReturnToRealTime.startTime) === clipStartMs,
      "switching back to real-time must preserve the active startTime."
    );
    assert(
      normalizeTimestampMs(stateAfterReturnToRealTime.stopTime) === clipStopMs,
      "switching back to real-time must preserve the active stopTime."
    );

    capture.replayClock.seek(clipStartMs + 250);
    capture.replayClock.setMultiplier(3);
    const rawBeforeRealTimeReturnPlay = snapshotRawClock();
    capture.replayClock.play();
    await sleep(150);
    const rawAfterRealTimeReturnPlay = snapshotRawClock();
    capture.replayClock.pause();
    assert(
      rawAfterRealTimeReturnPlay.dayNumber !== rawBeforeRealTimeReturnPlay.dayNumber ||
        Math.abs(
          rawAfterRealTimeReturnPlay.secondsOfDay -
            rawBeforeRealTimeReturnPlay.secondsOfDay
        ) > 0.0001,
      "real-time mode must still advance after returning from prerecorded."
    );

    return {
      stateAfterPrerecordedMode,
      stateAfterSeekInside,
      stateAfterSeekBeforeStart,
      stateAfterSeekAfterStop,
      stateAfterPrerecordedWithoutRange,
      stateAfterMultiplier,
      pausedPrerecordedState,
      stateAfterForwardClamp,
      stateAfterReverseClamp,
      stateAfterReturnToRealTime,
      tickCount
    };
  `)
});
