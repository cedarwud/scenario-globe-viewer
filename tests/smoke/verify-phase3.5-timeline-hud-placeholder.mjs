import {
  buildReplayClockEvaluation,
  runReplayClockValidation
} from "./verify-phase3.3-replay-clock-real-time.mjs";

await runReplayClockValidation({
  phaseLabel: "Phase 3.5 timeline HUD placeholder",
  evaluationExpression: buildReplayClockEvaluation(`
    const normalizeTimestamp = (value) => {
      const parsed = typeof value === "number" ? value : Date.parse(value);
      assert(Number.isFinite(parsed), "Timeline HUD timestamp must parse.");
      return new Date(parsed).toISOString();
    };

    const formatTimestampLabel = (value) =>
      normalizeTimestamp(value).replace("T", " ").replace("Z", " UTC");

    const formatPlaybackStateLabel = (state) => {
      const playback = state.isPlaying ? "Playing" : "Paused";
      const multiplier = Number.isInteger(state.multiplier)
        ? state.multiplier.toFixed(0)
        : state.multiplier.toFixed(2);

      return playback + " @ " + multiplier + "x";
    };

    const readRect = (selector) => {
      const element = document.querySelector(selector);
      if (!(element instanceof HTMLElement)) {
        return null;
      }

      const rect = element.getBoundingClientRect();
      return {
        width: rect.width,
        height: rect.height,
        display: getComputedStyle(element).display
      };
    };

    const readHudSnapshot = () => {
      const hudFrame = document.querySelector('[data-hud-frame="true"]');
      const placeholder = document.querySelector('[data-time-placeholder="true"]');
      const readField = (name) => {
        const field = document.querySelector('[data-time-field="' + name + '"]');
        return field instanceof HTMLElement ? field.innerText.trim() : "";
      };

      return {
        hudVisibility:
          hudFrame instanceof HTMLElement
            ? hudFrame.getAttribute("data-hud-visibility")
            : null,
        leftPanel: readRect(".hud-panel--left"),
        rightPanel: readRect(".hud-panel--right"),
        statusPanel: readRect(".hud-panel--status"),
        timeline: readRect(".cesium-viewer-timelineContainer"),
        toolbar: readRect(".cesium-viewer-toolbar"),
        credits: readRect(".cesium-viewer-bottom"),
        placeholderDisplay:
          placeholder instanceof HTMLElement ? getComputedStyle(placeholder).display : null,
        interactiveCount:
          placeholder instanceof HTMLElement
            ? placeholder.querySelectorAll("button, input, select").length
            : -1,
        labelText:
          placeholder instanceof HTMLElement
            ? Array.from(
                placeholder.querySelectorAll(".timeline-hud-placeholder__label"),
                (node) => node.textContent?.trim() ?? ""
              )
            : [],
        placeholderText: placeholder instanceof HTMLElement ? placeholder.innerText : "",
        heading: readField("heading"),
        mode: readField("mode"),
        currentTime: readField("currentTime"),
        activeRange: readField("activeRange"),
        playbackState: readField("playbackState")
      };
    };

    const assertHudMatchesReplayClock = (label) => {
      const snapshot = readHudSnapshot();
      const state = capture.replayClock.getState();
      assert(snapshot.hudVisibility === "status-only", label + ": HUD must stay status-only.");
      assert(snapshot.leftPanel?.width === 0, label + ": left panel must stay hidden.");
      assert(snapshot.rightPanel?.width === 0, label + ": right panel must stay hidden.");
      assert(
        snapshot.statusPanel && snapshot.statusPanel.width > 0 && snapshot.statusPanel.height > 0,
        label + ": status panel must stay visible."
      );
      assert(
        snapshot.toolbar && snapshot.toolbar.width > 0 && snapshot.toolbar.height > 0,
        label + ": native toolbar must stay visible."
      );
      assert(
        snapshot.timeline && snapshot.timeline.width > 0 && snapshot.timeline.height > 0,
        label + ": native timeline must stay visible."
      );
      assert(
        snapshot.credits && snapshot.credits.width > 0 && snapshot.credits.height > 0,
        label + ": native credits band must stay visible."
      );
      assert(
        snapshot.placeholderDisplay !== "none" && snapshot.interactiveCount === 0,
        label + ": placeholder must stay visible and read-only."
      );
      assert(
        JSON.stringify(snapshot.labelText) === JSON.stringify(["Mode", "Current", "Range", "State"]),
        label + ": placeholder must stay limited to time fields."
      );
      assert(
        !/satellite|scenario/i.test(snapshot.placeholderText),
        label + ": placeholder must not surface satellite or scenario controls."
      );
      assert(snapshot.heading === "Timeline", label + ": heading must stay Timeline.");
      assert(
        snapshot.mode === (state.mode === "real-time" ? "Real-time" : "Prerecorded"),
        label + ": mode field must match replay clock state."
      );
      assert(
        snapshot.currentTime === formatTimestampLabel(state.currentTime),
        label + ": currentTime field must match replay clock state."
      );
      assert(
        snapshot.activeRange ===
          formatTimestampLabel(state.startTime) + " -> " + formatTimestampLabel(state.stopTime),
        label + ": activeRange field must match replay clock state."
      );
      assert(
        snapshot.playbackState === formatPlaybackStateLabel(state),
        label + ": playbackState field must match replay clock state."
      );

      return snapshot;
    };

    const initialState = capture.replayClock.getState();
    assertSerializableState(initialState, "initial", "real-time");
    const initialSnapshot = assertHudMatchesReplayClock("initial");

    const clipStartMs = normalizeTimestampMs(initialState.currentTime);
    const clipStopMs = clipStartMs + 5000;
    capture.replayClock.setMode("prerecorded", {
      start: clipStartMs,
      stop: clipStopMs
    });
    capture.replayClock.seek(clipStartMs + 1200);
    capture.replayClock.setMultiplier(4);
    await sleep(150);
    const prerecordedSnapshot = assertHudMatchesReplayClock("after prerecorded seek");

    capture.replayClock.play();
    await sleep(180);
    capture.replayClock.pause();
    await sleep(120);
    const pausedSnapshot = assertHudMatchesReplayClock("after playback");

    return {
      initialSnapshot,
      prerecordedSnapshot,
      pausedSnapshot
    };
  `)
});
