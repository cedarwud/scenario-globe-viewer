import {
  buildReplayClockEvaluation,
  runReplayClockValidation
} from "./verify-phase3.3-replay-clock-real-time.mjs";

await runReplayClockValidation({
  phaseLabel: "Phase 6.2 bootstrap operator controls",
  evaluationExpression: buildReplayClockEvaluation(`
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

    const readOperatorSnapshot = () => {
      const root = document.querySelector('[data-operator-hud="bootstrap"]');
      const scenarioSelect = document.querySelector('[data-operator-control="scenario"]');
      const readText = (selector) => {
        const element = document.querySelector(selector);
        return element instanceof HTMLElement ? element.innerText.trim() : "";
      };

      return {
        hudVisibility: document.documentElement.dataset.hudVisibility || null,
        bootstrapScenarioId: document.documentElement.dataset.bootstrapScenarioId || null,
        scenePreset: document.documentElement.dataset.scenePreset || null,
        replayMode: document.documentElement.dataset.replayMode || null,
        replaySpeed: document.documentElement.dataset.replaySpeed || null,
        controlError: document.documentElement.dataset.operatorControlError || null,
        rootPresent: root instanceof HTMLElement,
        operatorText: root instanceof HTMLElement ? root.innerText : "",
        rootBusy: root instanceof HTMLElement ? root.dataset.operatorBusy || "false" : null,
        rootScenarioId: root instanceof HTMLElement ? root.dataset.bootstrapScenarioId || null : null,
        rootReplayMode: root instanceof HTMLElement ? root.dataset.replayMode || null : null,
        rootReplaySpeed: root instanceof HTMLElement ? root.dataset.replaySpeed || null : null,
        leftPanel: readRect(".hud-panel--left"),
        rightPanel: readRect(".hud-panel--right"),
        statusPanel: readRect(".hud-panel--status"),
        toolbar: readRect(".cesium-viewer-toolbar"),
        timeline: readRect(".cesium-viewer-timelineContainer"),
        timePlaceholder: readRect('[data-time-placeholder="true"]'),
        scenarioOptions:
          scenarioSelect instanceof HTMLSelectElement
            ? Array.from(scenarioSelect.options, (option) => option.value)
            : [],
        selectedScenario:
          scenarioSelect instanceof HTMLSelectElement ? scenarioSelect.value : null,
        scenarioLabel: readText('[data-operator-field="scenario-label"]'),
        modeLabels: Array.from(
          document.querySelectorAll('[data-operator-control="mode"]'),
          (node) => node instanceof HTMLElement ? node.innerText.trim() : ""
        ),
        pressedMode: Array.from(
          document.querySelectorAll('[data-operator-control="mode"][aria-pressed="true"]'),
          (node) => node.getAttribute("data-operator-mode")
        ),
        speedLabels: Array.from(
          document.querySelectorAll('[data-operator-control="speed"]'),
          (node) => node instanceof HTMLElement ? node.innerText.trim() : ""
        ),
        pressedSpeed: Array.from(
          document.querySelectorAll('[data-operator-control="speed"][aria-pressed="true"]'),
          (node) => node.getAttribute("data-operator-speed")
        ),
        timeHeading: readText('[data-time-field="heading"]'),
        timeMode: readText('[data-time-field="mode"]'),
        playbackState: readText('[data-time-field="playbackState"]')
      };
    };

    const assertOperatorStateMatchesCapture = (label) => {
      const snapshot = readOperatorSnapshot();
      const runtimeState = capture.replayClock.getState();
      const selectedScenario = capture.scenarioSession.getCurrentScenario();

      assert(snapshot.rootPresent, label + ": operator HUD root must exist.");
      assert(snapshot.controlError === null, label + ": operator HUD must not report control errors.");
      assert(snapshot.rootBusy === "false", label + ": operator HUD must not stay busy.");
      assert(
        snapshot.leftPanel?.width === 0 && snapshot.rightPanel?.width === 0,
        label + ": left/right HUD panels must stay hidden."
      );
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
        snapshot.timePlaceholder && snapshot.timePlaceholder.width > 0 && snapshot.timePlaceholder.height > 0,
        label + ": time placeholder must stay visible below the operator controls."
      );
      assert(
        JSON.stringify(snapshot.scenarioOptions) === JSON.stringify(["global", "regional", "site"]),
        label + ": scenario control must stay bounded to bootstrap-safe preset options."
      );
      assert(
        JSON.stringify(snapshot.modeLabels) === JSON.stringify(["Real-time", "Prerecorded"]),
        label + ": replay mode control must stay bounded to real-time/prerecorded."
      );
      assert(
        JSON.stringify(snapshot.speedLabels) === JSON.stringify(["0.25x", "0.5x", "1x", "2x", "4x"]),
        label + ": replay speed control must stay bounded to preset values."
      );
      assert(
        !/policy|validation|satellite|siteDataset/i.test(
          snapshot.operatorText
        ),
        label + ": first Phase 6.2 slice must not surface 6.3+ or validation-family controls."
      );
      assert(
        snapshot.bootstrapScenarioId === selectedScenario.scenarioId &&
          snapshot.rootScenarioId === selectedScenario.scenarioId,
        label + ": operator HUD scenario id must stay aligned with the active scenario session."
      );
      assert(
        snapshot.scenePreset === selectedScenario.presentation.presetKey &&
          snapshot.selectedScenario === selectedScenario.presentation.presetKey,
        label + ": scenario selection control must stay aligned with the scenario presentation preset."
      );
      assert(
        snapshot.replayMode === runtimeState.mode && snapshot.rootReplayMode === runtimeState.mode,
        label + ": replay mode controls must stay aligned with the replay-clock state."
      );
      assert(
        snapshot.replaySpeed === String(runtimeState.multiplier) &&
          snapshot.rootReplaySpeed === String(runtimeState.multiplier),
        label + ": replay speed controls must stay aligned with the replay-clock multiplier."
      );
      assert(
        selectedScenario.satellite === undefined &&
          selectedScenario.siteDataset === undefined &&
          selectedScenario.validation === undefined,
        label + ": bootstrap-safe operator scenarios must not attach site/satellite/validation sources."
      );
      assert(snapshot.timeHeading === "Timeline", label + ": timeline heading must stay repo-owned.");
      assert(
        snapshot.timeMode === (runtimeState.mode === "real-time" ? "Real-time" : "Prerecorded"),
        label + ": read-only timeline mode must stay aligned with replay-clock state."
      );
      assert(
        snapshot.playbackState.includes(String(runtimeState.multiplier)),
        label + ": read-only playback state must reflect the active replay speed."
      );

      return snapshot;
    };

    const click = async (selector) => {
      const element = document.querySelector(selector);
      assert(element instanceof HTMLElement, "Missing operator control: " + selector);
      element.click();
      await sleep(180);
    };

    const setScenario = async (value) => {
      const select = document.querySelector('[data-operator-control="scenario"]');
      assert(select instanceof HTMLSelectElement, "Missing scenario select.");
      select.value = value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      await sleep(200);
    };

    const initialSnapshot = assertOperatorStateMatchesCapture("initial");

    await click('[data-operator-control="mode"][data-operator-mode="prerecorded"]');
    const prerecordedSnapshot = assertOperatorStateMatchesCapture("after prerecorded mode");
    assert(
      prerecordedSnapshot.pressedMode.length === 1 &&
        prerecordedSnapshot.pressedMode[0] === "prerecorded",
      "Replay mode buttons must reflect prerecorded selection."
    );

    await setScenario("site");
    const siteSnapshot = assertOperatorStateMatchesCapture("after site scenario select");
    assert(
      siteSnapshot.scenarioLabel.toLowerCase().includes("site"),
      "Scenario label must update after scenario selection."
    );

    await click('[data-operator-control="speed"][data-operator-speed="4"]');
    const fastSnapshot = assertOperatorStateMatchesCapture("after 4x replay speed");
    assert(
      fastSnapshot.pressedSpeed.length === 1 && fastSnapshot.pressedSpeed[0] === "4",
      "Replay speed buttons must reflect the selected multiplier."
    );

    await click('[data-operator-control="mode"][data-operator-mode="real-time"]');
    const finalSnapshot = assertOperatorStateMatchesCapture("after return to real-time");
    assert(
      finalSnapshot.pressedMode.length === 1 && finalSnapshot.pressedMode[0] === "real-time",
      "Replay mode buttons must reflect the return to real-time."
    );

    return {
      initialSnapshot,
      prerecordedSnapshot,
      siteSnapshot,
      fastSnapshot,
      finalSnapshot
    };
  `)
});
