import {
  createPhysicalInputPanelViewModel,
  type PhysicalInputPanelViewModel
} from "./physical-input-view-model";
import type { PhysicalInputState } from "./physical-input";

interface PhysicalInputReadable {
  getState(): PhysicalInputState;
  subscribe(listener: (state: PhysicalInputState) => void): () => void;
}

interface BootstrapPhysicalInputPanelOptions {
  container: HTMLElement;
  controller: PhysicalInputReadable;
}

interface BootstrapPhysicalInputPanelElements {
  root: HTMLDivElement;
  heading: HTMLSpanElement;
  note: HTMLSpanElement;
  context: HTMLSpanElement;
  families: HTMLSpanElement;
  projection: HTMLSpanElement;
  provenance: HTMLSpanElement;
}

function createField(
  label: string,
  field: keyof Omit<BootstrapPhysicalInputPanelElements, "root" | "heading" | "note">
) {
  return `
    <div class="physical-input-panel__field">
      <span class="physical-input-panel__label">${label}</span>
      <span class="physical-input-panel__value" data-physical-field="${field}"></span>
    </div>
  `;
}

function createElements(container: HTMLElement): BootstrapPhysicalInputPanelElements {
  container.innerHTML = `
    <div class="physical-input-panel" data-physical-input-panel="bootstrap">
      <div class="physical-input-panel__header">
        <span class="physical-input-panel__eyebrow">Physical Inputs</span>
        <span class="physical-input-panel__heading" data-physical-field="heading"></span>
        <span class="physical-input-panel__note" data-physical-field="note"></span>
      </div>
      <div class="physical-input-panel__grid">
        ${createField("Context", "context")}
        ${createField("Families", "families")}
        ${createField("Projection", "projection")}
        ${createField("Provenance", "provenance")}
      </div>
    </div>
  `;

  const root = container.querySelector<HTMLDivElement>(
    "[data-physical-input-panel='bootstrap']"
  );
  const heading = container.querySelector<HTMLSpanElement>(
    "[data-physical-field='heading']"
  );
  const note = container.querySelector<HTMLSpanElement>("[data-physical-field='note']");
  const context = container.querySelector<HTMLSpanElement>(
    "[data-physical-field='context']"
  );
  const families = container.querySelector<HTMLSpanElement>(
    "[data-physical-field='families']"
  );
  const projection = container.querySelector<HTMLSpanElement>(
    "[data-physical-field='projection']"
  );
  const provenance = container.querySelector<HTMLSpanElement>(
    "[data-physical-field='provenance']"
  );

  if (!root || !heading || !note || !context || !families || !projection || !provenance) {
    throw new Error("Missing bootstrap physical-input panel elements");
  }

  return {
    root,
    heading,
    note,
    context,
    families,
    projection,
    provenance
  };
}

function renderViewModel(
  elements: BootstrapPhysicalInputPanelElements,
  viewModel: PhysicalInputPanelViewModel
): void {
  elements.heading.textContent = viewModel.heading;
  elements.note.textContent = viewModel.note;
  elements.context.textContent = viewModel.context;
  elements.families.textContent = viewModel.families;
  elements.projection.textContent = viewModel.projection;
  elements.provenance.textContent = viewModel.provenance;
  elements.provenance.title = viewModel.provenanceDetail;
}

function renderState(
  elements: BootstrapPhysicalInputPanelElements,
  state: PhysicalInputState
): void {
  renderViewModel(elements, createPhysicalInputPanelViewModel(state));

  elements.root.dataset.physicalScenarioId = state.scenario.id;
  elements.root.dataset.physicalEvaluatedAt = state.evaluatedAt;
  elements.root.dataset.physicalContextLabel = state.activeWindow.contextLabel;
  elements.root.dataset.physicalFamilies = state.provenance
    .map((entry) => entry.family)
    .join(",");
  elements.root.dataset.physicalSchemaVersion = state.report.schemaVersion;
  elements.root.dataset.physicalProjectionTarget = state.projectionTarget;
  elements.root.dataset.physicalDisclaimer = state.disclaimer;

  document.documentElement.dataset.physicalScenarioId = state.scenario.id;
  document.documentElement.dataset.physicalEvaluatedAt = state.evaluatedAt;
  document.documentElement.dataset.physicalContextLabel = state.activeWindow.contextLabel;
  document.documentElement.dataset.physicalFamilies = state.provenance
    .map((entry) => entry.family)
    .join(",");
  document.documentElement.dataset.physicalSchemaVersion = state.report.schemaVersion;
  document.documentElement.dataset.physicalProjectionTarget = state.projectionTarget;
  document.documentElement.dataset.physicalDisclaimer = state.disclaimer;
}

function clearDocumentState(): void {
  delete document.documentElement.dataset.physicalScenarioId;
  delete document.documentElement.dataset.physicalEvaluatedAt;
  delete document.documentElement.dataset.physicalContextLabel;
  delete document.documentElement.dataset.physicalFamilies;
  delete document.documentElement.dataset.physicalSchemaVersion;
  delete document.documentElement.dataset.physicalProjectionTarget;
  delete document.documentElement.dataset.physicalDisclaimer;
}

export function mountBootstrapPhysicalInputPanel({
  container,
  controller
}: BootstrapPhysicalInputPanelOptions): () => void {
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
