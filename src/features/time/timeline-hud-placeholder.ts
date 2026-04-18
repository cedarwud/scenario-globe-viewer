import type { ReplayClock, ReplayClockState } from "./replay-clock";
import { createTimelineHudPlaceholderViewModel } from "./timeline-hud";

interface TimelineHudPlaceholderElements {
  root: HTMLDivElement;
  heading: HTMLSpanElement;
  mode: HTMLSpanElement;
  currentTime: HTMLSpanElement;
  activeRange: HTMLSpanElement;
  playbackState: HTMLSpanElement;
}

interface TimelineHudPlaceholderMountOptions {
  container: HTMLElement;
  replayClock: ReplayClock;
}

function createField(label: string, field: keyof TimelineHudPlaceholderElements) {
  return `
    <div class="timeline-hud-placeholder__field">
      <span class="timeline-hud-placeholder__label">${label}</span>
      <span class="timeline-hud-placeholder__value" data-time-field="${field}"></span>
    </div>
  `;
}

function createElements(container: HTMLElement): TimelineHudPlaceholderElements {
  container.innerHTML = `
    <div class="timeline-hud-placeholder" data-time-placeholder="true">
      <div class="timeline-hud-placeholder__header">
        <span class="timeline-hud-placeholder__eyebrow">Read-only</span>
        <span class="timeline-hud-placeholder__heading" data-time-field="heading"></span>
      </div>
      <div class="timeline-hud-placeholder__grid">
        ${createField("Mode", "mode")}
        ${createField("Current", "currentTime")}
        ${createField("Range", "activeRange")}
        ${createField("State", "playbackState")}
      </div>
    </div>
  `;

  const root = container.querySelector<HTMLDivElement>("[data-time-placeholder='true']");
  const heading = container.querySelector<HTMLSpanElement>(
    "[data-time-field='heading']"
  );
  const mode = container.querySelector<HTMLSpanElement>("[data-time-field='mode']");
  const currentTime = container.querySelector<HTMLSpanElement>(
    "[data-time-field='currentTime']"
  );
  const activeRange = container.querySelector<HTMLSpanElement>(
    "[data-time-field='activeRange']"
  );
  const playbackState = container.querySelector<HTMLSpanElement>(
    "[data-time-field='playbackState']"
  );

  if (!root || !heading || !mode || !currentTime || !activeRange || !playbackState) {
    throw new Error("Missing timeline HUD placeholder elements");
  }

  return {
    root,
    heading,
    mode,
    currentTime,
    activeRange,
    playbackState
  };
}

function renderState(
  elements: TimelineHudPlaceholderElements,
  state: ReplayClockState
): void {
  const viewModel = createTimelineHudPlaceholderViewModel(state);

  elements.heading.textContent = viewModel.heading;
  elements.mode.textContent = viewModel.mode;
  elements.currentTime.textContent = viewModel.currentTime;
  elements.activeRange.textContent = viewModel.activeRange;
  elements.playbackState.textContent = viewModel.playbackState;
  elements.root.dataset.clockMode = state.mode;
  elements.root.dataset.playbackState = state.isPlaying ? "playing" : "paused";
}

export function mountTimelineHudPlaceholder({
  container,
  replayClock
}: TimelineHudPlaceholderMountOptions): () => void {
  const elements = createElements(container);
  renderState(elements, replayClock.getState());

  const unsubscribe = replayClock.onTick((state) => {
    renderState(elements, state);
  });

  return () => {
    unsubscribe();
    container.replaceChildren();
  };
}
