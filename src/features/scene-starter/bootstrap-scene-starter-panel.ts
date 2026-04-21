import {
  formatSceneStarterSatelliteIds,
  type BootstrapSceneStarterState
} from "./scene-starter";

interface BootstrapSceneStarterReadable {
  getState(): BootstrapSceneStarterState;
  subscribe(listener: (state: BootstrapSceneStarterState) => void): () => void;
}

interface BootstrapSceneStarterPanelOptions {
  container: HTMLElement;
  controller: BootstrapSceneStarterReadable;
}

interface BootstrapSceneStarterPanelElements {
  root: HTMLDivElement;
  heading: HTMLSpanElement;
  note: HTMLSpanElement;
  path: HTMLSpanElement;
  source: HTMLSpanElement;
  truth: HTMLSpanElement;
  transition: HTMLSpanElement;
  focus: HTMLSpanElement;
  satellites: HTMLSpanElement;
}

function createField(
  label: string,
  field: keyof Omit<
    BootstrapSceneStarterPanelElements,
    "root" | "heading" | "note"
  >
) {
  return `
    <div class="scene-starter-panel__field">
      <span class="scene-starter-panel__label">${label}</span>
      <span class="scene-starter-panel__value" data-scene-starter-field="${field}"></span>
    </div>
  `;
}

function createElements(container: HTMLElement): BootstrapSceneStarterPanelElements {
  container.innerHTML = `
    <div class="scene-starter-panel" data-scene-starter-panel="bootstrap">
      <div class="scene-starter-panel__header">
        <span class="scene-starter-panel__eyebrow">Scene Starter</span>
        <span
          class="scene-starter-panel__heading"
          data-scene-starter-field="heading"
        ></span>
        <span
          class="scene-starter-panel__note"
          data-scene-starter-field="note"
        ></span>
      </div>
      <div class="scene-starter-panel__grid">
        ${createField("Path", "path")}
        ${createField("Source", "source")}
        ${createField("Truth", "truth")}
        ${createField("Transition", "transition")}
        ${createField("Focus", "focus")}
        ${createField("Satellites", "satellites")}
      </div>
    </div>
  `;

  const root = container.querySelector<HTMLDivElement>(
    "[data-scene-starter-panel='bootstrap']"
  );
  const heading = container.querySelector<HTMLSpanElement>(
    "[data-scene-starter-field='heading']"
  );
  const note = container.querySelector<HTMLSpanElement>(
    "[data-scene-starter-field='note']"
  );
  const path = container.querySelector<HTMLSpanElement>(
    "[data-scene-starter-field='path']"
  );
  const source = container.querySelector<HTMLSpanElement>(
    "[data-scene-starter-field='source']"
  );
  const truth = container.querySelector<HTMLSpanElement>(
    "[data-scene-starter-field='truth']"
  );
  const transition = container.querySelector<HTMLSpanElement>(
    "[data-scene-starter-field='transition']"
  );
  const focus = container.querySelector<HTMLSpanElement>(
    "[data-scene-starter-field='focus']"
  );
  const satellites = container.querySelector<HTMLSpanElement>(
    "[data-scene-starter-field='satellites']"
  );

  if (
    !root ||
    !heading ||
    !note ||
    !path ||
    !source ||
    !truth ||
    !transition ||
    !focus ||
    !satellites
  ) {
    throw new Error("Missing bootstrap scene-starter panel elements");
  }

  return {
    root,
    heading,
    note,
    path,
    source,
    truth,
    transition,
    focus,
    satellites
  };
}

function buildNote(state: BootstrapSceneStarterState): string {
  if (state.scenario.isScopeActive) {
    return "Site prerecorded framing is consuming the imported bundle-sample starter export while scenario/time/globe shell ownership stays local.";
  }

  return "Scoped to the repo-owned site prerecorded scenario; switch there to read the imported bundle-sample starter export.";
}

function renderState(
  elements: BootstrapSceneStarterPanelElements,
  state: BootstrapSceneStarterState
): void {
  const displaySatIds = formatSceneStarterSatelliteIds(
    state.presentation.displaySatIds
  );
  const beamSatIds = formatSceneStarterSatelliteIds(state.presentation.beamSatIds);
  const note = buildNote(state);

  elements.heading.textContent = "Starter Consumer";
  elements.note.textContent = note;
  elements.note.title = state.ownershipNote;
  elements.path.textContent = state.entry.deterministicPathId;
  elements.path.title = state.summary.sourceLine;
  elements.source.textContent = `${state.source.mode} / ${state.source.profileId} / ${state.source.truthSourceLabel}`;
  elements.source.title = state.summary.sourceLine;
  elements.truth.textContent = `scene=${state.truth.sceneServingSatId ?? "none"} / published=${state.truth.publishedServingSatId ?? "none"} / ${state.truth.snapshotRelationship}`;
  elements.truth.title = state.summary.truthLine;
  elements.transition.textContent = `native=${state.truth.nativeServingTransitionKind ?? "none"} / bundle=${state.truth.bundleProducerHandoverKind ?? "none"}`;
  elements.transition.title = state.summary.truthLine;
  elements.focus.textContent = `${state.presentation.focusMode ?? "none"} / ${state.presentation.narrativePhase ?? "none"}`;
  elements.focus.title = state.summary.presentationLine;
  elements.satellites.textContent = `display ${displaySatIds} / beam ${beamSatIds}`;
  elements.satellites.title = state.summary.presentationLine;

  elements.root.dataset.sceneStarterScenarioId = state.scenario.id;
  elements.root.dataset.sceneStarterScenePreset = state.scenario.presetKey;
  elements.root.dataset.sceneStarterReplayMode = state.scenario.replayMode;
  elements.root.dataset.sceneStarterScopeActive = state.scenario.isScopeActive
    ? "true"
    : "false";
  elements.root.dataset.sceneStarterDeterministicPathId =
    state.entry.deterministicPathId;
  elements.root.dataset.sceneStarterSourceMode = state.source.mode;
  elements.root.dataset.sceneStarterSourceProfileId = state.source.profileId;
  elements.root.dataset.sceneStarterTruthSourceLabel =
    state.source.truthSourceLabel;
  elements.root.dataset.sceneStarterSceneServingSatId =
    state.truth.sceneServingSatId ?? "";
  elements.root.dataset.sceneStarterPublishedServingSatId =
    state.truth.publishedServingSatId ?? "";
  elements.root.dataset.sceneStarterSnapshotRelationship =
    state.truth.snapshotRelationship;
  elements.root.dataset.sceneStarterNativeServingTransitionKind =
    state.truth.nativeServingTransitionKind ?? "";
  elements.root.dataset.sceneStarterBundleProducerHandoverKind =
    state.truth.bundleProducerHandoverKind ?? "";
  elements.root.dataset.sceneStarterPresentationFocusMode =
    state.presentation.focusMode ?? "";
  elements.root.dataset.sceneStarterPresentationNarrativePhase =
    state.presentation.narrativePhase ?? "";
  elements.root.dataset.sceneStarterDisplaySatIds = JSON.stringify(
    state.presentation.displaySatIds
  );
  elements.root.dataset.sceneStarterBeamSatIds = JSON.stringify(
    state.presentation.beamSatIds
  );
  elements.root.dataset.sceneStarterSourceLine = state.summary.sourceLine;
  elements.root.dataset.sceneStarterTruthLine = state.summary.truthLine;
  elements.root.dataset.sceneStarterPresentationLine =
    state.summary.presentationLine;
  elements.root.dataset.sceneStarterSchemaVersion = state.schemaVersion;
  elements.root.dataset.sceneStarterOwnershipNote = state.ownershipNote;

  document.documentElement.dataset.sceneStarterScenarioId = state.scenario.id;
  document.documentElement.dataset.sceneStarterScenePreset =
    state.scenario.presetKey;
  document.documentElement.dataset.sceneStarterReplayMode =
    state.scenario.replayMode;
  document.documentElement.dataset.sceneStarterScopeActive =
    state.scenario.isScopeActive ? "true" : "false";
  document.documentElement.dataset.sceneStarterDeterministicPathId =
    state.entry.deterministicPathId;
  document.documentElement.dataset.sceneStarterSourceMode = state.source.mode;
  document.documentElement.dataset.sceneStarterSourceProfileId =
    state.source.profileId;
  document.documentElement.dataset.sceneStarterTruthSourceLabel =
    state.source.truthSourceLabel;
  document.documentElement.dataset.sceneStarterSceneServingSatId =
    state.truth.sceneServingSatId ?? "";
  document.documentElement.dataset.sceneStarterPublishedServingSatId =
    state.truth.publishedServingSatId ?? "";
  document.documentElement.dataset.sceneStarterSnapshotRelationship =
    state.truth.snapshotRelationship;
  document.documentElement.dataset.sceneStarterNativeServingTransitionKind =
    state.truth.nativeServingTransitionKind ?? "";
  document.documentElement.dataset.sceneStarterBundleProducerHandoverKind =
    state.truth.bundleProducerHandoverKind ?? "";
  document.documentElement.dataset.sceneStarterPresentationFocusMode =
    state.presentation.focusMode ?? "";
  document.documentElement.dataset.sceneStarterPresentationNarrativePhase =
    state.presentation.narrativePhase ?? "";
  document.documentElement.dataset.sceneStarterDisplaySatIds = JSON.stringify(
    state.presentation.displaySatIds
  );
  document.documentElement.dataset.sceneStarterBeamSatIds = JSON.stringify(
    state.presentation.beamSatIds
  );
  document.documentElement.dataset.sceneStarterSourceLine =
    state.summary.sourceLine;
  document.documentElement.dataset.sceneStarterTruthLine = state.summary.truthLine;
  document.documentElement.dataset.sceneStarterPresentationLine =
    state.summary.presentationLine;
  document.documentElement.dataset.sceneStarterSchemaVersion = state.schemaVersion;
  document.documentElement.dataset.sceneStarterOwnershipNote =
    state.ownershipNote;
}

function clearDocumentState(): void {
  delete document.documentElement.dataset.sceneStarterScenarioId;
  delete document.documentElement.dataset.sceneStarterScenePreset;
  delete document.documentElement.dataset.sceneStarterReplayMode;
  delete document.documentElement.dataset.sceneStarterScopeActive;
  delete document.documentElement.dataset.sceneStarterDeterministicPathId;
  delete document.documentElement.dataset.sceneStarterSourceMode;
  delete document.documentElement.dataset.sceneStarterSourceProfileId;
  delete document.documentElement.dataset.sceneStarterTruthSourceLabel;
  delete document.documentElement.dataset.sceneStarterSceneServingSatId;
  delete document.documentElement.dataset.sceneStarterPublishedServingSatId;
  delete document.documentElement.dataset.sceneStarterSnapshotRelationship;
  delete document.documentElement.dataset.sceneStarterNativeServingTransitionKind;
  delete document.documentElement.dataset.sceneStarterBundleProducerHandoverKind;
  delete document.documentElement.dataset.sceneStarterPresentationFocusMode;
  delete document.documentElement.dataset.sceneStarterPresentationNarrativePhase;
  delete document.documentElement.dataset.sceneStarterDisplaySatIds;
  delete document.documentElement.dataset.sceneStarterBeamSatIds;
  delete document.documentElement.dataset.sceneStarterSourceLine;
  delete document.documentElement.dataset.sceneStarterTruthLine;
  delete document.documentElement.dataset.sceneStarterPresentationLine;
  delete document.documentElement.dataset.sceneStarterSchemaVersion;
  delete document.documentElement.dataset.sceneStarterOwnershipNote;
}

export function mountBootstrapSceneStarterPanel({
  container,
  controller
}: BootstrapSceneStarterPanelOptions): () => void {
  const elements = createElements(container);
  renderState(elements, controller.getState());

  const unsubscribe = controller.subscribe((state) => {
    renderState(elements, state);
  });

  return () => {
    unsubscribe();
    clearDocumentState();
    container.replaceChildren();
  };
}
