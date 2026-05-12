import {
  createHandoverDecisionPanelViewModel,
  type HandoverDecisionPanelViewModel
} from "./handover-decision-view-model";
import {
  clearDocumentTelemetry,
  syncDocumentTelemetry
} from "../telemetry/document-telemetry";
import type { HandoverDecisionState } from "./handover-decision";

interface HandoverDecisionReadable {
  getState(): HandoverDecisionState;
  subscribe(listener: (state: HandoverDecisionState) => void): () => void;
}

interface BootstrapHandoverDecisionPanelOptions {
  container: HTMLElement;
  controller: HandoverDecisionReadable;
}

interface BootstrapHandoverDecisionPanelElements {
  root: HTMLDivElement;
  heading: HTMLSpanElement;
  note: HTMLSpanElement;
  decisionKind: HTMLSpanElement;
  servingCandidate: HTMLSpanElement;
  servingOrbitClass: HTMLSpanElement;
  previousCandidate: HTMLSpanElement;
  reasons: HTMLSpanElement;
  policy: HTMLSpanElement;
  provenance: HTMLSpanElement;
}

const HANDOVER_TELEMETRY_KEYS = [
  "handoverScenarioId",
  "handoverEvaluatedAt",
  "handoverDecisionKind",
  "handoverServingCandidateId",
  "handoverTruthState",
  "handoverPolicyId",
  "handoverProvenance",
  "handoverReasonSignals",
  "handoverSchemaVersion",
  "handoverPolicyLabel",
  "handoverPolicySummary",
  "handoverPolicyTieBreak",
  "handoverProvenanceDetail"
] as const;

function createField(
  label: string,
  field: keyof Omit<BootstrapHandoverDecisionPanelElements, "root" | "heading" | "note">
) {
  return `
    <div class="handover-decision-panel__field">
      <span class="handover-decision-panel__label">${label}</span>
      <span class="handover-decision-panel__value" data-handover-field="${field}"></span>
    </div>
  `;
}

function createElements(
  container: HTMLElement
): BootstrapHandoverDecisionPanelElements {
  container.innerHTML = `
    <div class="handover-decision-panel" data-handover-decision-panel="bootstrap">
      <div class="handover-decision-panel__header">
        <span class="handover-decision-panel__eyebrow">Handover Decision</span>
        <span
          class="handover-decision-panel__heading"
          data-handover-field="heading"
        ></span>
        <span
          class="handover-decision-panel__note"
          data-handover-field="note"
        ></span>
      </div>
      <div class="handover-decision-panel__grid">
        ${createField("Kind", "decisionKind")}
        ${createField("Serving", "servingCandidate")}
        ${createField("Orbit", "servingOrbitClass")}
        ${createField("Previous", "previousCandidate")}
        ${createField("Reasons", "reasons")}
        ${createField("Policy", "policy")}
        ${createField("Provenance", "provenance")}
      </div>
    </div>
  `;

  const root = container.querySelector<HTMLDivElement>(
    "[data-handover-decision-panel='bootstrap']"
  );
  const heading = container.querySelector<HTMLSpanElement>(
    "[data-handover-field='heading']"
  );
  const note = container.querySelector<HTMLSpanElement>(
    "[data-handover-field='note']"
  );
  const decisionKind = container.querySelector<HTMLSpanElement>(
    "[data-handover-field='decisionKind']"
  );
  const servingCandidate = container.querySelector<HTMLSpanElement>(
    "[data-handover-field='servingCandidate']"
  );
  const servingOrbitClass = container.querySelector<HTMLSpanElement>(
    "[data-handover-field='servingOrbitClass']"
  );
  const previousCandidate = container.querySelector<HTMLSpanElement>(
    "[data-handover-field='previousCandidate']"
  );
  const reasons = container.querySelector<HTMLSpanElement>(
    "[data-handover-field='reasons']"
  );
  const policy = container.querySelector<HTMLSpanElement>(
    "[data-handover-field='policy']"
  );
  const provenance = container.querySelector<HTMLSpanElement>(
    "[data-handover-field='provenance']"
  );

  if (
    !root ||
    !heading ||
    !note ||
    !decisionKind ||
    !servingCandidate ||
    !servingOrbitClass ||
    !previousCandidate ||
    !reasons ||
    !policy ||
    !provenance
  ) {
    throw new Error("Missing bootstrap handover decision panel elements");
  }

  return {
    root,
    heading,
    note,
    decisionKind,
    servingCandidate,
    servingOrbitClass,
    previousCandidate,
    reasons,
    policy,
    provenance
  };
}

function renderViewModel(
  elements: BootstrapHandoverDecisionPanelElements,
  viewModel: HandoverDecisionPanelViewModel
): void {
  elements.heading.textContent = viewModel.heading;
  elements.note.textContent = viewModel.note;
  elements.decisionKind.textContent = viewModel.decisionKind;
  elements.servingCandidate.textContent = viewModel.servingCandidate;
  elements.servingOrbitClass.textContent = viewModel.servingOrbitClass;
  elements.previousCandidate.textContent = viewModel.previousCandidate;
  elements.reasons.textContent = viewModel.reasons;
  elements.policy.textContent = viewModel.policy;
  elements.policy.title = viewModel.policyDetail;
  elements.provenance.textContent = viewModel.provenance;
  elements.provenance.title = viewModel.provenanceDetail;
}

function renderState(
  elements: BootstrapHandoverDecisionPanelElements,
  state: HandoverDecisionState
): void {
  renderViewModel(elements, createHandoverDecisionPanelViewModel(state));

  elements.root.dataset.handoverScenarioId = state.snapshot.scenarioId;
  elements.root.dataset.handoverEvaluatedAt = state.snapshot.evaluatedAt;
  elements.root.dataset.handoverDecisionKind = state.result.decisionKind;
  elements.root.dataset.handoverServingCandidateId =
    state.result.servingCandidateId ?? "";
  elements.root.dataset.handoverTruthState = state.result.semanticsBridge.truthState;
  elements.root.dataset.handoverPolicyId = state.snapshot.policyId;
  elements.root.dataset.handoverPolicyLabel = state.report.policyLabel;
  elements.root.dataset.handoverPolicySummary = state.report.policySummary;
  elements.root.dataset.handoverPolicyTieBreak =
    state.report.policyTieBreak.join(",");
  elements.root.dataset.handoverProvenance = state.provenance.inputKind;
  elements.root.dataset.handoverReasonSignals = state.result.reasonSignals
    .map((signal) => signal.code)
    .join(",");
  elements.root.dataset.handoverSchemaVersion = state.report.schemaVersion;
  elements.root.dataset.handoverProvenanceDetail = state.provenance.detail;

  syncDocumentTelemetry({
    handoverScenarioId: state.snapshot.scenarioId,
    handoverEvaluatedAt: state.snapshot.evaluatedAt,
    handoverDecisionKind: state.result.decisionKind,
    handoverServingCandidateId: state.result.servingCandidateId ?? "",
    handoverTruthState: state.result.semanticsBridge.truthState,
    handoverPolicyId: state.snapshot.policyId,
    handoverPolicyLabel: state.report.policyLabel,
    handoverPolicySummary: state.report.policySummary,
    handoverPolicyTieBreak: state.report.policyTieBreak.join(","),
    handoverProvenance: state.provenance.inputKind,
    handoverReasonSignals: state.result.reasonSignals.map((signal) => signal.code).join(","),
    handoverSchemaVersion: state.report.schemaVersion,
    handoverProvenanceDetail: state.provenance.detail
  });
}

function clearDocumentState(): void {
  clearDocumentTelemetry(HANDOVER_TELEMETRY_KEYS);
}

export function mountBootstrapHandoverDecisionPanel({
  container,
  controller
}: BootstrapHandoverDecisionPanelOptions): () => void {
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
