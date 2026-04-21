import {
  createCommunicationTimePanelViewModel,
  type CommunicationTimePanelViewModel
} from "./communication-time-view-model";
import {
  clearDocumentTelemetry,
  syncDocumentTelemetry
} from "../telemetry/document-telemetry";
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
  note: HTMLSpanElement;
  status: HTMLSpanElement;
  available: HTMLSpanElement;
  unavailable: HTMLSpanElement;
  remaining: HTMLSpanElement;
  provenance: HTMLSpanElement;
}

const COMMUNICATION_TELEMETRY_KEYS = [
  "communicationScenarioId",
  "communicationStatus",
  "communicationSourceKind",
  "communicationReportSchemaVersion",
  "communicationProvenanceDetail"
] as const;

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
        <span
          class="communication-time-panel__note"
          data-communication-field="note"
        ></span>
      </div>
      <div class="communication-time-panel__grid">
        ${createField("Status", "status")}
        ${createField("Available", "available")}
        ${createField("Unavailable", "unavailable")}
        ${createField("Remaining Available", "remaining")}
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
  const note = container.querySelector<HTMLSpanElement>(
    "[data-communication-field='note']"
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
    !note ||
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
    note,
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
  elements.note.textContent = viewModel.provenanceNote;
  elements.status.textContent = viewModel.status;
  elements.available.textContent = viewModel.available;
  elements.unavailable.textContent = viewModel.unavailable;
  elements.remaining.textContent = viewModel.remaining;
  elements.provenance.textContent = viewModel.provenance;
  elements.provenance.title = viewModel.provenanceDetail;
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
  elements.root.dataset.communicationProvenanceDetail = state.provenance.detail;
  syncDocumentTelemetry({
    communicationScenarioId: state.scenario.id,
    communicationStatus: state.currentStatus.kind,
    communicationSourceKind: state.provenance.sourceKind,
    communicationReportSchemaVersion: state.report.schemaVersion,
    communicationProvenanceDetail: state.provenance.detail
  });
}

function clearDocumentState(): void {
  clearDocumentTelemetry(COMMUNICATION_TELEMETRY_KEYS);
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
