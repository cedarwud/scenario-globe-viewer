import {
  createCommunicationTimePanelViewModel,
  type CommunicationTimePanelViewModel
} from "./communication-time-view-model";
import type { CommunicationTimeState } from "./communication-time";

interface CommunicationTimeReadable {
  getState(): CommunicationTimeState;
  subscribe(listener: (state: CommunicationTimeState) => void): () => void;
}

interface BootstrapCommunicationTimePanelOptions {
  container: HTMLElement;
  controller: CommunicationTimeReadable;
}

interface BootstrapCommunicationTimePanelElements {
  root: HTMLDivElement;
  heading: HTMLSpanElement;
  status: HTMLSpanElement;
  available: HTMLSpanElement;
  unavailable: HTMLSpanElement;
  remaining: HTMLSpanElement;
  provenance: HTMLSpanElement;
}

function createField(
  label: string,
  field: keyof Omit<BootstrapCommunicationTimePanelElements, "root" | "heading">
) {
  return `
    <div class="communication-time-panel__field">
      <span class="communication-time-panel__label">${label}</span>
      <span class="communication-time-panel__value" data-communication-field="${field}"></span>
    </div>
  `;
}

function createElements(
  container: HTMLElement
): BootstrapCommunicationTimePanelElements {
  container.innerHTML = `
    <div class="communication-time-panel" data-communication-panel="bootstrap">
      <div class="communication-time-panel__header">
        <span class="communication-time-panel__eyebrow">Communication Time</span>
        <span
          class="communication-time-panel__heading"
          data-communication-field="heading"
        ></span>
      </div>
      <div class="communication-time-panel__grid">
        ${createField("Status", "status")}
        ${createField("Available", "available")}
        ${createField("Unavailable", "unavailable")}
        ${createField("Remaining", "remaining")}
        ${createField("Provenance", "provenance")}
      </div>
    </div>
  `;

  const root = container.querySelector<HTMLDivElement>(
    "[data-communication-panel='bootstrap']"
  );
  const heading = container.querySelector<HTMLSpanElement>(
    "[data-communication-field='heading']"
  );
  const status = container.querySelector<HTMLSpanElement>(
    "[data-communication-field='status']"
  );
  const available = container.querySelector<HTMLSpanElement>(
    "[data-communication-field='available']"
  );
  const unavailable = container.querySelector<HTMLSpanElement>(
    "[data-communication-field='unavailable']"
  );
  const remaining = container.querySelector<HTMLSpanElement>(
    "[data-communication-field='remaining']"
  );
  const provenance = container.querySelector<HTMLSpanElement>(
    "[data-communication-field='provenance']"
  );

  if (
    !root ||
    !heading ||
    !status ||
    !available ||
    !unavailable ||
    !remaining ||
    !provenance
  ) {
    throw new Error("Missing bootstrap communication-time panel elements");
  }

  return {
    root,
    heading,
    status,
    available,
    unavailable,
    remaining,
    provenance
  };
}

function renderViewModel(
  elements: BootstrapCommunicationTimePanelElements,
  viewModel: CommunicationTimePanelViewModel
): void {
  elements.heading.textContent = viewModel.heading;
  elements.status.textContent = viewModel.status;
  elements.available.textContent = viewModel.available;
  elements.unavailable.textContent = viewModel.unavailable;
  elements.remaining.textContent = viewModel.remaining;
  elements.provenance.textContent = viewModel.provenance;
}

function renderState(
  elements: BootstrapCommunicationTimePanelElements,
  state: CommunicationTimeState
): void {
  renderViewModel(elements, createCommunicationTimePanelViewModel(state));

  elements.root.dataset.communicationScenarioId = state.scenario.id;
  elements.root.dataset.communicationStatus = state.currentStatus.kind;
  elements.root.dataset.communicationSourceKind = state.provenance.sourceKind;
  elements.root.dataset.communicationSchemaVersion = state.report.schemaVersion;
  document.documentElement.dataset.communicationScenarioId = state.scenario.id;
  document.documentElement.dataset.communicationStatus = state.currentStatus.kind;
  document.documentElement.dataset.communicationSourceKind =
    state.provenance.sourceKind;
  document.documentElement.dataset.communicationReportSchemaVersion =
    state.report.schemaVersion;
}

function clearDocumentState(): void {
  delete document.documentElement.dataset.communicationScenarioId;
  delete document.documentElement.dataset.communicationStatus;
  delete document.documentElement.dataset.communicationSourceKind;
  delete document.documentElement.dataset.communicationReportSchemaVersion;
}

export function mountBootstrapCommunicationTimePanel({
  container,
  controller
}: BootstrapCommunicationTimePanelOptions): () => void {
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
