import type { ScenePresetKey } from "../globe/scene-preset";
import type { ReplayClock, ReplayClockState } from "../time";
import { mountTimelineHudPlaceholder } from "../time/timeline-hud-placeholder";
import type {
  BootstrapOperatorController,
  BootstrapOperatorControllerState,
  BootstrapReplaySpeedPreset
} from "../../runtime/bootstrap-operator-controller";
import type { BootstrapScenarioMode } from "../../runtime/resolve-bootstrap-scenario";

interface BootstrapOperatorHudOptions {
  hudFrame: HTMLElement;
  statusPanel: HTMLElement;
  controller: BootstrapOperatorController;
}

interface BootstrapOperatorHudElements {
  root: HTMLDivElement;
  scenarioLabel: HTMLSpanElement;
  scenarioSelect: HTMLSelectElement;
  modeButtons: Record<BootstrapScenarioMode, HTMLButtonElement>;
  speedButtons: ReadonlyArray<HTMLButtonElement>;
  timeSlot: HTMLDivElement;
}

function formatReplaySpeedLabel(multiplier: BootstrapReplaySpeedPreset): string {
  return Number.isInteger(multiplier)
    ? `${multiplier.toFixed(0)}x`
    : `${multiplier.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}x`;
}

function serializeControlError(reason: unknown): string {
  if (reason instanceof Error) {
    return reason.message;
  }

  if (typeof reason === "string") {
    return reason;
  }

  try {
    return JSON.stringify(reason);
  } catch {
    return "Unknown operator control error";
  }
}

function createElements(
  statusPanel: HTMLElement,
  controller: BootstrapOperatorController
): BootstrapOperatorHudElements {
  const scenarioOptionsMarkup = controller
    .getScenarioOptions()
    .map(
      (option) =>
        `<option value="${option.presetKey}">${option.label}</option>`
    )
    .join("");
  const speedControlsMarkup = controller
    .getReplaySpeedPresets()
    .map(
      (multiplier) => `
        <button
          type="button"
          class="operator-control-chip"
          data-operator-control="speed"
          data-operator-speed="${multiplier}"
        >
          ${formatReplaySpeedLabel(multiplier)}
        </button>
      `
    )
    .join("");

  statusPanel.innerHTML = `
    <div class="operator-status-hud" data-operator-hud="bootstrap">
      <div class="operator-status-hud__controls">
        <div class="operator-status-hud__meta">
          <span class="operator-status-hud__eyebrow">Operator Controls</span>
          <span
            class="operator-status-hud__heading"
            data-operator-field="scenario-label"
          ></span>
        </div>
        <label class="operator-control-group">
          <span class="operator-control-label">Scenario</span>
          <select
            class="operator-control-select"
            data-operator-control="scenario"
            aria-label="Bootstrap scenario selection"
          >
            ${scenarioOptionsMarkup}
          </select>
        </label>
        <div class="operator-control-group">
          <span class="operator-control-label">Replay Mode</span>
          <div class="operator-control-chipset" role="group" aria-label="Replay mode">
            <button
              type="button"
              class="operator-control-chip"
              data-operator-control="mode"
              data-operator-mode="real-time"
            >
              Real-time
            </button>
            <button
              type="button"
              class="operator-control-chip"
              data-operator-control="mode"
              data-operator-mode="prerecorded"
            >
              Prerecorded
            </button>
          </div>
        </div>
        <div class="operator-control-group">
          <span class="operator-control-label">Replay Speed</span>
          <div class="operator-control-chipset" role="group" aria-label="Replay speed">
            ${speedControlsMarkup}
          </div>
        </div>
      </div>
      <div class="operator-status-hud__timeline" data-operator-time-slot="true"></div>
    </div>
  `;

  const root = statusPanel.querySelector<HTMLDivElement>(
    "[data-operator-hud='bootstrap']"
  );
  const scenarioLabel = statusPanel.querySelector<HTMLSpanElement>(
    "[data-operator-field='scenario-label']"
  );
  const scenarioSelect = statusPanel.querySelector<HTMLSelectElement>(
    "[data-operator-control='scenario']"
  );
  const realTimeButton = statusPanel.querySelector<HTMLButtonElement>(
    "[data-operator-control='mode'][data-operator-mode='real-time']"
  );
  const prerecordedButton = statusPanel.querySelector<HTMLButtonElement>(
    "[data-operator-control='mode'][data-operator-mode='prerecorded']"
  );
  const speedButtons = Array.from(
    statusPanel.querySelectorAll<HTMLButtonElement>(
      "[data-operator-control='speed']"
    )
  );
  const timeSlot = statusPanel.querySelector<HTMLDivElement>(
    "[data-operator-time-slot='true']"
  );

  if (
    !root ||
    !scenarioLabel ||
    !scenarioSelect ||
    !realTimeButton ||
    !prerecordedButton ||
    speedButtons.length === 0 ||
    !timeSlot
  ) {
    throw new Error("Missing bootstrap operator HUD elements");
  }

  return {
    root,
    scenarioLabel,
    scenarioSelect,
    modeButtons: {
      "real-time": realTimeButton,
      prerecorded: prerecordedButton
    },
    speedButtons,
    timeSlot
  };
}

function renderState(
  elements: BootstrapOperatorHudElements,
  state: BootstrapOperatorControllerState
): void {
  const replaySpeed = String(state.replayMultiplier);

  elements.scenarioLabel.textContent = state.scenarioLabel;
  elements.scenarioSelect.value = state.scenePresetKey;
  elements.root.dataset.bootstrapScenarioId = state.scenarioId;
  elements.root.dataset.scenePreset = state.scenePresetKey;
  elements.root.dataset.replayMode = state.replayMode;
  elements.root.dataset.replaySpeed = replaySpeed;
  elements.root.dataset.playbackState = state.isPlaying ? "playing" : "paused";

  elements.modeButtons["real-time"].setAttribute(
    "aria-pressed",
    state.replayMode === "real-time" ? "true" : "false"
  );
  elements.modeButtons.prerecorded.setAttribute(
    "aria-pressed",
    state.replayMode === "prerecorded" ? "true" : "false"
  );

  for (const button of elements.speedButtons) {
    const multiplier = button.dataset.operatorSpeed;
    button.setAttribute("aria-pressed", multiplier === replaySpeed ? "true" : "false");
  }

  document.documentElement.dataset.bootstrapScenarioId = state.scenarioId;
  document.documentElement.dataset.scenePreset = state.scenePresetKey;
  document.documentElement.dataset.replayMode = state.replayMode;
  document.documentElement.dataset.replaySpeed = replaySpeed;
}

export function mountBootstrapOperatorHud({
  hudFrame,
  statusPanel,
  controller
}: BootstrapOperatorHudOptions): () => void {
  hudFrame.dataset.hudVisibility = "status-only";
  hudFrame.setAttribute("aria-hidden", "false");

  const elements = createElements(statusPanel, controller);
  const operatorTimelineClock: ReplayClock = {
    getState(): ReplayClockState {
      const state = controller.getState();

      return {
        mode: state.replayMode,
        currentTime: state.currentTime,
        startTime: state.startTime,
        stopTime: state.stopTime,
        multiplier: state.replayMultiplier,
        isPlaying: state.isPlaying
      };
    },
    play(): void {},
    pause(): void {},
    setMultiplier(_multiplier): void {},
    seek(_time): void {},
    setMode(_mode, _range): void {},
    onTick(listener): () => void {
      return controller.subscribe((state) => {
        listener({
          mode: state.replayMode,
          currentTime: state.currentTime,
          startTime: state.startTime,
          stopTime: state.stopTime,
          multiplier: state.replayMultiplier,
          isPlaying: state.isPlaying
        });
      });
    }
  };
  const unmountTimelineHudPlaceholder = mountTimelineHudPlaceholder({
    container: elements.timeSlot,
    replayClock: operatorTimelineClock
  });

  const updateBusyState = (busy: boolean): void => {
    elements.root.dataset.operatorBusy = busy ? "true" : "false";
    elements.scenarioSelect.disabled = busy;
    elements.modeButtons["real-time"].disabled = busy;
    elements.modeButtons.prerecorded.disabled = busy;

    for (const button of elements.speedButtons) {
      button.disabled = busy;
    }
  };

  const clearControlError = (): void => {
    delete elements.root.dataset.controlError;
    delete document.documentElement.dataset.operatorControlError;
  };

  const reportControlError = (reason: unknown): void => {
    const message = serializeControlError(reason);
    elements.root.dataset.controlError = message;
    document.documentElement.dataset.operatorControlError = message;
    console.error(reason);
  };

  const runSelection = async (
    action: () => Promise<BootstrapOperatorControllerState>
  ): Promise<void> => {
    updateBusyState(true);

    try {
      clearControlError();
      renderState(elements, await action());
    } catch (error) {
      reportControlError(error);
    } finally {
      updateBusyState(false);
    }
  };

  const handleScenarioChange = (): void => {
    const selectedPreset = elements.scenarioSelect.value as ScenePresetKey;
    void runSelection(() => controller.selectScenarioPreset(selectedPreset));
  };

  const handleRealTimeClick = (): void => {
    void runSelection(() => controller.selectReplayMode("real-time"));
  };

  const handlePrerecordedClick = (): void => {
    void runSelection(() => controller.selectReplayMode("prerecorded"));
  };

  const handleSpeedClick = (event: Event): void => {
    const button = event.currentTarget;

    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    try {
      clearControlError();
      renderState(
        elements,
        controller.selectReplaySpeed(
          Number(button.dataset.operatorSpeed) as BootstrapReplaySpeedPreset
        )
      );
    } catch (error) {
      reportControlError(error);
    }
  };

  renderState(elements, controller.getState());
  updateBusyState(false);
  clearControlError();

  const unsubscribe = controller.subscribe((state) => {
    renderState(elements, state);
  });

  elements.scenarioSelect.addEventListener("change", handleScenarioChange);
  elements.modeButtons["real-time"].addEventListener("click", handleRealTimeClick);
  elements.modeButtons.prerecorded.addEventListener(
    "click",
    handlePrerecordedClick
  );

  for (const button of elements.speedButtons) {
    button.addEventListener("click", handleSpeedClick);
  }

  return () => {
    unsubscribe();
    unmountTimelineHudPlaceholder();
    elements.scenarioSelect.removeEventListener("change", handleScenarioChange);
    elements.modeButtons["real-time"].removeEventListener("click", handleRealTimeClick);
    elements.modeButtons.prerecorded.removeEventListener(
      "click",
      handlePrerecordedClick
    );

    for (const button of elements.speedButtons) {
      button.removeEventListener("click", handleSpeedClick);
    }

    statusPanel.replaceChildren();
    hudFrame.dataset.hudVisibility = "hidden";
    hudFrame.setAttribute("aria-hidden", "true");
  };
}
