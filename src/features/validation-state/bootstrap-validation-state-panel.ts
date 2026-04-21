import {
  createValidationStatePanelViewModel,
  type ValidationStatePanelViewModel
} from "./validation-state-view-model";
import {
  clearDocumentTelemetry,
  syncDocumentTelemetry
} from "../telemetry/document-telemetry";
import type { ValidationState } from "./validation-state";

interface ValidationStateReadable {
  getState(): ValidationState;
  subscribe(listener: (state: ValidationState) => void): () => void;
}

interface BootstrapValidationStatePanelOptions {
  container: HTMLElement;
  controller: ValidationStateReadable;
}

interface BootstrapValidationStatePanelElements {
  root: HTMLDivElement;
  heading: HTMLSpanElement;
  note: HTMLSpanElement;
  environmentMode: HTMLSpanElement;
  transportKind: HTMLSpanElement;
  dutKind: HTMLSpanElement;
  attachState: HTMLSpanElement;
  servingCandidate: HTMLSpanElement;
  provenance: HTMLSpanElement;
}

const VALIDATION_TELEMETRY_KEYS = [
  "validationScenarioId",
  "validationEvaluatedAt",
  "validationEnvironmentMode",
  "validationTransportKind",
  "validationDutKind",
  "validationAttachState",
  "validationServingCandidateId",
  "validationSchemaVersion",
  "validationOwnershipNote",
  "validationProvenanceKind",
  "validationProvenanceDetail"
] as const;

function createField(
  label: string,
  field: keyof Omit<BootstrapValidationStatePanelElements, "root" | "heading" | "note">
) {
  return `
    <div class="validation-state-panel__field">
      <span class="validation-state-panel__label">${label}</span>
      <span class="validation-state-panel__value" data-validation-field="${field}"></span>
    </div>
  `;
}

function createElements(
  container: HTMLElement
): BootstrapValidationStatePanelElements {
  container.innerHTML = `
    <div class="validation-state-panel" data-validation-state-panel="bootstrap">
      <div class="validation-state-panel__header">
        <span class="validation-state-panel__eyebrow">Validation State</span>
        <span
          class="validation-state-panel__heading"
          data-validation-field="heading"
        ></span>
        <span
          class="validation-state-panel__note"
          data-validation-field="note"
        ></span>
      </div>
      <div class="validation-state-panel__grid">
        ${createField("Environment", "environmentMode")}
        ${createField("Transport", "transportKind")}
        ${createField("DUT", "dutKind")}
        ${createField("Attach", "attachState")}
        ${createField("Serving", "servingCandidate")}
        ${createField("Provenance", "provenance")}
      </div>
    </div>
  `;

  const root = container.querySelector<HTMLDivElement>(
    "[data-validation-state-panel='bootstrap']"
  );
  const heading = container.querySelector<HTMLSpanElement>(
    "[data-validation-field='heading']"
  );
  const note = container.querySelector<HTMLSpanElement>(
    "[data-validation-field='note']"
  );
  const environmentMode = container.querySelector<HTMLSpanElement>(
    "[data-validation-field='environmentMode']"
  );
  const transportKind = container.querySelector<HTMLSpanElement>(
    "[data-validation-field='transportKind']"
  );
  const dutKind = container.querySelector<HTMLSpanElement>(
    "[data-validation-field='dutKind']"
  );
  const attachState = container.querySelector<HTMLSpanElement>(
    "[data-validation-field='attachState']"
  );
  const servingCandidate = container.querySelector<HTMLSpanElement>(
    "[data-validation-field='servingCandidate']"
  );
  const provenance = container.querySelector<HTMLSpanElement>(
    "[data-validation-field='provenance']"
  );

  if (
    !root ||
    !heading ||
    !note ||
    !environmentMode ||
    !transportKind ||
    !dutKind ||
    !attachState ||
    !servingCandidate ||
    !provenance
  ) {
    throw new Error("Missing bootstrap validation-state panel elements");
  }

  return {
    root,
    heading,
    note,
    environmentMode,
    transportKind,
    dutKind,
    attachState,
    servingCandidate,
    provenance
  };
}

function renderViewModel(
  elements: BootstrapValidationStatePanelElements,
  viewModel: ValidationStatePanelViewModel
): void {
  elements.heading.textContent = viewModel.heading;
  elements.note.textContent = viewModel.note;
  elements.environmentMode.textContent = viewModel.environmentMode;
  elements.transportKind.textContent = viewModel.transportKind;
  elements.dutKind.textContent = viewModel.dutKind;
  elements.attachState.textContent = viewModel.attachState;
  elements.servingCandidate.textContent = viewModel.servingCandidate;
  elements.provenance.textContent = viewModel.provenance;
  elements.provenance.title = viewModel.provenanceDetail;
}

function renderState(
  elements: BootstrapValidationStatePanelElements,
  state: ValidationState
): void {
  renderViewModel(elements, createValidationStatePanelViewModel(state));

  elements.root.dataset.validationScenarioId = state.scenarioId;
  elements.root.dataset.validationEvaluatedAt = state.evaluatedAt;
  elements.root.dataset.validationEnvironmentMode = state.environmentMode;
  elements.root.dataset.validationTransportKind = state.transportKind;
  elements.root.dataset.validationDutKind = state.dutKind;
  elements.root.dataset.validationAttachState = state.attachState;
  elements.root.dataset.validationServingCandidateId =
    state.servingCandidateId ?? "";
  elements.root.dataset.validationSchemaVersion = state.report.schemaVersion;
  elements.root.dataset.validationOwnershipNote = state.ownershipNote;
  elements.root.dataset.validationProvenanceKind = state.provenance.kind;
  elements.root.dataset.validationProvenanceDetail = state.provenance.detail;

  syncDocumentTelemetry({
    validationScenarioId: state.scenarioId,
    validationEvaluatedAt: state.evaluatedAt,
    validationEnvironmentMode: state.environmentMode,
    validationTransportKind: state.transportKind,
    validationDutKind: state.dutKind,
    validationAttachState: state.attachState,
    validationServingCandidateId: state.servingCandidateId ?? "",
    validationSchemaVersion: state.report.schemaVersion,
    validationOwnershipNote: state.ownershipNote,
    validationProvenanceKind: state.provenance.kind,
    validationProvenanceDetail: state.provenance.detail
  });
}

function clearDocumentState(): void {
  clearDocumentTelemetry(VALIDATION_TELEMETRY_KEYS);
}

export function mountBootstrapValidationStatePanel({
  container,
  controller
}: BootstrapValidationStatePanelOptions): () => void {
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
