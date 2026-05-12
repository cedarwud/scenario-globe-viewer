import {
  createHandoverDecisionPanelViewModel,
  type HandoverDecisionPanelViewModel
} from "./handover-decision-view-model";
import {
  clearDocumentTelemetry,
  syncDocumentTelemetry
} from "../telemetry/document-telemetry";
import {
  HANDOVER_DECISION_PROXY_PROVENANCE,
  HANDOVER_RULE_CONFIG_HYSTERESIS_RANGE,
  HANDOVER_RULE_CONFIG_MIN_DWELL_TICK_RANGE,
  HANDOVER_RULE_CONFIG_TIE_BREAK_ORDER,
  HANDOVER_RULE_CONFIG_WEIGHT_RANGE,
  validateHandoverRuleConfig,
  type HandoverDecisionState,
  type HandoverPolicyId,
  type HandoverPolicyTieBreak,
  type HandoverRuleConfig
} from "./handover-decision";

interface HandoverDecisionReadable {
  getState(): HandoverDecisionState;
  subscribe(listener: (state: HandoverDecisionState) => void): () => void;
}

interface HandoverRuleConfigWritableState {
  handoverPolicyId: HandoverPolicyId;
  handoverPolicyLabel: string;
  handoverRuleConfig: HandoverRuleConfig;
}

interface HandoverRuleConfigWritable {
  getState(): HandoverRuleConfigWritableState;
  applyHandoverRuleConfig(config: HandoverRuleConfig): HandoverRuleConfigWritableState;
  resetHandoverRuleConfig(): HandoverRuleConfigWritableState;
  subscribe(listener: (state: HandoverRuleConfigWritableState) => void): () => void;
}

interface BootstrapHandoverDecisionPanelOptions {
  container: HTMLElement;
  controller: HandoverDecisionReadable;
  ruleConfigController?: HandoverRuleConfigWritable;
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
  ruleConfig: HTMLSpanElement;
  provenance: HTMLSpanElement;
  ruleEditor: HTMLDetailsElement;
  ruleForm: HTMLFormElement;
  ruleInputs: {
    latencyWeight: HTMLInputElement;
    jitterWeight: HTMLInputElement;
    speedWeight: HTMLInputElement;
    minDwellTicks: HTMLInputElement;
    hysteresisMargin: HTMLInputElement;
  };
  tieBreakSelects: ReadonlyArray<HTMLSelectElement>;
  applyButton: HTMLButtonElement;
  resetButton: HTMLButtonElement;
  cancelButton: HTMLButtonElement;
  ruleStatus: HTMLSpanElement;
  ruleErrors: ReadonlyArray<HTMLElement>;
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
  "handoverRulePolicyId",
  "handoverRuleAppliedAt",
  "handoverRuleWeights",
  "handoverRuleTieBreakOrder",
  "handoverRuleMinDwellTicks",
  "handoverRuleHysteresisMargin",
  "handoverProvenanceDetail"
] as const;

const RULE_ERROR_FIELD_SELECTOR: Record<string, string> = {
  "weights.latencyMs": "weights.latencyMs",
  "weights.jitterMs": "weights.jitterMs",
  "weights.networkSpeedMbps": "weights.networkSpeedMbps",
  weights: "weights.latencyMs",
  tieBreakOrder: "tieBreakOrder.0",
  minDwellTicks: "minDwellTicks",
  hysteresisMargin: "hysteresisMargin",
  policyId: "weights.latencyMs",
  provenanceKind: "weights.latencyMs",
  appliedAt: "weights.latencyMs"
};

function createField(
  label: string,
  field: keyof Omit<
    BootstrapHandoverDecisionPanelElements,
    | "root"
    | "heading"
    | "note"
    | "ruleEditor"
    | "ruleForm"
    | "ruleInputs"
    | "tieBreakSelects"
    | "applyButton"
    | "resetButton"
    | "cancelButton"
    | "ruleStatus"
    | "ruleErrors"
  >
) {
  return `
    <div class="handover-decision-panel__field">
      <span class="handover-decision-panel__label">${label}</span>
      <span class="handover-decision-panel__value" data-handover-field="${field}"></span>
    </div>
  `;
}

function createTieBreakOptions(): string {
  return HANDOVER_RULE_CONFIG_TIE_BREAK_ORDER.map(
    (option) => `<option value="${option}">${option}</option>`
  ).join("");
}

function createNumericRuleField(options: {
  id: string;
  name: string;
  label: string;
  helper: string;
  min: number;
  max: number;
  step: number;
}): string {
  return `
    <label class="handover-rule-config__field" for="${options.id}">
      <span class="handover-rule-config__label">${options.label}</span>
      <input
        id="${options.id}"
        class="handover-rule-config__input"
        data-handover-rule-input="${options.name}"
        type="number"
        min="${options.min}"
        max="${options.max}"
        step="${options.step}"
        inputmode="decimal"
        aria-describedby="${options.id}-helper ${options.id}-error"
      />
      <span class="handover-rule-config__helper" id="${options.id}-helper">${options.helper}</span>
      <span
        class="handover-rule-config__error"
        id="${options.id}-error"
        data-handover-rule-error="${options.name}"
      ></span>
    </label>
  `;
}

function createTieBreakField(index: number): string {
  const name = `tieBreakOrder.${index}`;
  const id = `handover-rule-tie-break-${index + 1}`;

  return `
    <label class="handover-rule-config__field" for="${id}">
      <span class="handover-rule-config__label">Tie-break ${index + 1}</span>
      <select
        id="${id}"
        class="handover-rule-config__input"
        data-handover-rule-input="${name}"
        aria-describedby="${id}-helper ${id}-error"
      >
        ${createTieBreakOptions()}
      </select>
      <span class="handover-rule-config__helper" id="${id}-helper">Use each tie-break once.</span>
      <span
        class="handover-rule-config__error"
        id="${id}-error"
        data-handover-rule-error="${name}"
      ></span>
    </label>
  `;
}

function createRuleEditorMarkup(): string {
  return `
    <details
      class="handover-rule-config"
      data-handover-rule-config-editor="true"
      open
    >
      <summary class="handover-rule-config__summary">Handover Rule Config</summary>
      <form class="handover-rule-config__form" data-handover-rule-form="true" novalidate>
        <div class="handover-rule-config__grid">
          ${createNumericRuleField({
            id: "handover-rule-latency-weight",
            name: "weights.latencyMs",
            label: "Latency weight",
            helper: "0-10, one decimal place.",
            min: HANDOVER_RULE_CONFIG_WEIGHT_RANGE.min,
            max: HANDOVER_RULE_CONFIG_WEIGHT_RANGE.max,
            step: HANDOVER_RULE_CONFIG_WEIGHT_RANGE.step
          })}
          ${createNumericRuleField({
            id: "handover-rule-jitter-weight",
            name: "weights.jitterMs",
            label: "Jitter weight",
            helper: "0-10, one decimal place.",
            min: HANDOVER_RULE_CONFIG_WEIGHT_RANGE.min,
            max: HANDOVER_RULE_CONFIG_WEIGHT_RANGE.max,
            step: HANDOVER_RULE_CONFIG_WEIGHT_RANGE.step
          })}
          ${createNumericRuleField({
            id: "handover-rule-speed-weight",
            name: "weights.networkSpeedMbps",
            label: "Modeled speed weight",
            helper: "0-10, one decimal place.",
            min: HANDOVER_RULE_CONFIG_WEIGHT_RANGE.min,
            max: HANDOVER_RULE_CONFIG_WEIGHT_RANGE.max,
            step: HANDOVER_RULE_CONFIG_WEIGHT_RANGE.step
          })}
          ${createNumericRuleField({
            id: "handover-rule-min-dwell",
            name: "minDwellTicks",
            label: "Minimum dwell ticks",
            helper: "0-60 modeled ticks.",
            min: HANDOVER_RULE_CONFIG_MIN_DWELL_TICK_RANGE.min,
            max: HANDOVER_RULE_CONFIG_MIN_DWELL_TICK_RANGE.max,
            step: HANDOVER_RULE_CONFIG_MIN_DWELL_TICK_RANGE.step
          })}
          ${createNumericRuleField({
            id: "handover-rule-hysteresis",
            name: "hysteresisMargin",
            label: "Hysteresis margin",
            helper: "0-10 modeled bounded units.",
            min: HANDOVER_RULE_CONFIG_HYSTERESIS_RANGE.min,
            max: HANDOVER_RULE_CONFIG_HYSTERESIS_RANGE.max,
            step: HANDOVER_RULE_CONFIG_HYSTERESIS_RANGE.step
          })}
          ${[0, 1, 2, 3].map((index) => createTieBreakField(index)).join("")}
        </div>
        <div class="handover-rule-config__actions">
          <button class="handover-rule-config__button" type="submit" data-handover-rule-action="apply">
            Apply
          </button>
          <button class="handover-rule-config__button" type="button" data-handover-rule-action="reset">
            Reset
          </button>
          <button class="handover-rule-config__button" type="button" data-handover-rule-action="cancel">
            Cancel
          </button>
          <span
            class="handover-rule-config__status"
            data-handover-rule-status="true"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          ></span>
        </div>
      </form>
    </details>
  `;
}

function queryRequired<T extends Element>(
  container: HTMLElement,
  selector: string,
  label: string
): T {
  const element = container.querySelector<T>(selector);

  if (!element) {
    throw new Error(`Missing bootstrap handover decision panel element: ${label}`);
  }

  return element;
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
      <div class="handover-decision-panel__content">
        <div class="handover-decision-panel__grid">
          ${createField("Kind", "decisionKind")}
          ${createField("Serving", "servingCandidate")}
          ${createField("Orbit", "servingOrbitClass")}
          ${createField("Previous", "previousCandidate")}
          ${createField("Reasons", "reasons")}
          ${createField("Policy", "policy")}
          ${createField("Rule config", "ruleConfig")}
          ${createField("Provenance", "provenance")}
        </div>
        ${createRuleEditorMarkup()}
      </div>
    </div>
  `;

  const tieBreakSelects = [0, 1, 2, 3].map((index) =>
    queryRequired<HTMLSelectElement>(
      container,
      `[data-handover-rule-input='tieBreakOrder.${index}']`,
      `tieBreakOrder.${index}`
    )
  );

  return {
    root: queryRequired<HTMLDivElement>(
      container,
      "[data-handover-decision-panel='bootstrap']",
      "root"
    ),
    heading: queryRequired<HTMLSpanElement>(
      container,
      "[data-handover-field='heading']",
      "heading"
    ),
    note: queryRequired<HTMLSpanElement>(
      container,
      "[data-handover-field='note']",
      "note"
    ),
    decisionKind: queryRequired<HTMLSpanElement>(
      container,
      "[data-handover-field='decisionKind']",
      "decisionKind"
    ),
    servingCandidate: queryRequired<HTMLSpanElement>(
      container,
      "[data-handover-field='servingCandidate']",
      "servingCandidate"
    ),
    servingOrbitClass: queryRequired<HTMLSpanElement>(
      container,
      "[data-handover-field='servingOrbitClass']",
      "servingOrbitClass"
    ),
    previousCandidate: queryRequired<HTMLSpanElement>(
      container,
      "[data-handover-field='previousCandidate']",
      "previousCandidate"
    ),
    reasons: queryRequired<HTMLSpanElement>(
      container,
      "[data-handover-field='reasons']",
      "reasons"
    ),
    policy: queryRequired<HTMLSpanElement>(
      container,
      "[data-handover-field='policy']",
      "policy"
    ),
    ruleConfig: queryRequired<HTMLSpanElement>(
      container,
      "[data-handover-field='ruleConfig']",
      "ruleConfig"
    ),
    provenance: queryRequired<HTMLSpanElement>(
      container,
      "[data-handover-field='provenance']",
      "provenance"
    ),
    ruleEditor: queryRequired<HTMLDetailsElement>(
      container,
      "[data-handover-rule-config-editor='true']",
      "ruleEditor"
    ),
    ruleForm: queryRequired<HTMLFormElement>(
      container,
      "[data-handover-rule-form='true']",
      "ruleForm"
    ),
    ruleInputs: {
      latencyWeight: queryRequired<HTMLInputElement>(
        container,
        "[data-handover-rule-input='weights.latencyMs']",
        "latencyWeight"
      ),
      jitterWeight: queryRequired<HTMLInputElement>(
        container,
        "[data-handover-rule-input='weights.jitterMs']",
        "jitterWeight"
      ),
      speedWeight: queryRequired<HTMLInputElement>(
        container,
        "[data-handover-rule-input='weights.networkSpeedMbps']",
        "speedWeight"
      ),
      minDwellTicks: queryRequired<HTMLInputElement>(
        container,
        "[data-handover-rule-input='minDwellTicks']",
        "minDwellTicks"
      ),
      hysteresisMargin: queryRequired<HTMLInputElement>(
        container,
        "[data-handover-rule-input='hysteresisMargin']",
        "hysteresisMargin"
      )
    },
    tieBreakSelects,
    applyButton: queryRequired<HTMLButtonElement>(
      container,
      "[data-handover-rule-action='apply']",
      "applyButton"
    ),
    resetButton: queryRequired<HTMLButtonElement>(
      container,
      "[data-handover-rule-action='reset']",
      "resetButton"
    ),
    cancelButton: queryRequired<HTMLButtonElement>(
      container,
      "[data-handover-rule-action='cancel']",
      "cancelButton"
    ),
    ruleStatus: queryRequired<HTMLSpanElement>(
      container,
      "[data-handover-rule-status='true']",
      "ruleStatus"
    ),
    ruleErrors: Array.from(
      container.querySelectorAll<HTMLElement>("[data-handover-rule-error]")
    )
  };
}

function formatRuleWeights(config: HandoverRuleConfig): string {
  return [
    `latencyMs:${config.weights.latencyMs}`,
    `jitterMs:${config.weights.jitterMs}`,
    `networkSpeedMbps:${config.weights.networkSpeedMbps}`
  ].join(",");
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
  elements.ruleConfig.textContent = viewModel.ruleConfig;
  elements.ruleConfig.title = viewModel.ruleConfigDetail;
  elements.provenance.textContent = viewModel.provenance;
  elements.provenance.title = viewModel.provenanceDetail;
}

function renderState(
  elements: BootstrapHandoverDecisionPanelElements,
  state: HandoverDecisionState
): void {
  const ruleConfig = state.report.appliedRuleConfig;
  const ruleWeights = formatRuleWeights(ruleConfig);
  const ruleTieBreakOrder = ruleConfig.tieBreakOrder.join(",");

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
  elements.root.dataset.handoverRulePolicyId = ruleConfig.policyId;
  elements.root.dataset.handoverRuleAppliedAt = ruleConfig.appliedAt;
  elements.root.dataset.handoverRuleWeights = ruleWeights;
  elements.root.dataset.handoverRuleTieBreakOrder = ruleTieBreakOrder;
  elements.root.dataset.handoverRuleMinDwellTicks =
    String(ruleConfig.minDwellTicks);
  elements.root.dataset.handoverRuleHysteresisMargin =
    String(ruleConfig.hysteresisMargin);
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
    handoverRulePolicyId: ruleConfig.policyId,
    handoverRuleAppliedAt: ruleConfig.appliedAt,
    handoverRuleWeights: ruleWeights,
    handoverRuleTieBreakOrder: ruleTieBreakOrder,
    handoverRuleMinDwellTicks: String(ruleConfig.minDwellTicks),
    handoverRuleHysteresisMargin: String(ruleConfig.hysteresisMargin),
    handoverProvenance: state.provenance.inputKind,
    handoverReasonSignals: state.result.reasonSignals.map((signal) => signal.code).join(","),
    handoverSchemaVersion: state.report.schemaVersion,
    handoverProvenanceDetail: state.provenance.detail
  });
}

function clearDocumentState(): void {
  clearDocumentTelemetry(HANDOVER_TELEMETRY_KEYS);
}

function setInputValue(input: HTMLInputElement, value: number): void {
  input.value = String(value);
}

function clearRuleErrors(elements: BootstrapHandoverDecisionPanelElements): void {
  delete elements.ruleForm.dataset.handoverRuleValidationIssues;

  for (const error of elements.ruleErrors) {
    error.textContent = "";
  }

  for (const input of [
    elements.ruleInputs.latencyWeight,
    elements.ruleInputs.jitterWeight,
    elements.ruleInputs.speedWeight,
    elements.ruleInputs.minDwellTicks,
    elements.ruleInputs.hysteresisMargin,
    ...elements.tieBreakSelects
  ]) {
    input.removeAttribute("aria-invalid");
  }
}

function setRuleError(
  elements: BootstrapHandoverDecisionPanelElements,
  field: string,
  message: string
): void {
  const targetField = RULE_ERROR_FIELD_SELECTOR[field] ?? field;
  const error = elements.ruleForm.querySelector<HTMLElement>(
    `[data-handover-rule-error='${targetField}']`
  );
  const input = elements.ruleForm.querySelector<HTMLElement>(
    `[data-handover-rule-input='${targetField}']`
  );

  if (error) {
    error.textContent = message;
  }

  if (input) {
    input.setAttribute("aria-invalid", "true");
  }
}

function renderRuleDraft(
  elements: BootstrapHandoverDecisionPanelElements,
  config: HandoverRuleConfig
): void {
  setInputValue(elements.ruleInputs.latencyWeight, config.weights.latencyMs);
  setInputValue(elements.ruleInputs.jitterWeight, config.weights.jitterMs);
  setInputValue(elements.ruleInputs.speedWeight, config.weights.networkSpeedMbps);
  setInputValue(elements.ruleInputs.minDwellTicks, config.minDwellTicks);
  setInputValue(elements.ruleInputs.hysteresisMargin, config.hysteresisMargin);

  config.tieBreakOrder.forEach((value, index) => {
    const select = elements.tieBreakSelects[index];

    if (select) {
      select.value = value;
    }
  });
}

function readRuleDraft(
  elements: BootstrapHandoverDecisionPanelElements,
  policyId: HandoverPolicyId,
  appliedAt: string
): HandoverRuleConfig {
  return {
    policyId,
    weights: {
      latencyMs: Number(elements.ruleInputs.latencyWeight.value),
      jitterMs: Number(elements.ruleInputs.jitterWeight.value),
      networkSpeedMbps: Number(elements.ruleInputs.speedWeight.value)
    },
    tieBreakOrder: elements.tieBreakSelects.map(
      (select) => select.value as HandoverPolicyTieBreak
    ),
    minDwellTicks: Number(elements.ruleInputs.minDwellTicks.value),
    hysteresisMargin: Number(elements.ruleInputs.hysteresisMargin.value),
    appliedAt,
    provenanceKind: HANDOVER_DECISION_PROXY_PROVENANCE
  };
}

function validateRuleDraft(
  elements: BootstrapHandoverDecisionPanelElements,
  config: HandoverRuleConfig
): boolean {
  const issues = validateHandoverRuleConfig(config);

  clearRuleErrors(elements);
  elements.ruleForm.dataset.handoverRuleValidationIssues = issues
    .map((issue) => `${issue.field}:${issue.message}`)
    .join("|");

  for (const issue of issues) {
    setRuleError(elements, issue.field, issue.message);
  }

  return issues.length === 0;
}

function setRuleEditorEnabled(
  elements: BootstrapHandoverDecisionPanelElements,
  enabled: boolean
): void {
  for (const input of [
    elements.ruleInputs.latencyWeight,
    elements.ruleInputs.jitterWeight,
    elements.ruleInputs.speedWeight,
    elements.ruleInputs.minDwellTicks,
    elements.ruleInputs.hysteresisMargin,
    ...elements.tieBreakSelects,
    elements.applyButton,
    elements.resetButton,
    elements.cancelButton
  ]) {
    input.disabled = !enabled;
  }
}

export function mountBootstrapHandoverDecisionPanel({
  container,
  controller,
  ruleConfigController
}: BootstrapHandoverDecisionPanelOptions): () => void {
  const elements = createElements(container);
  let activeRuleState = ruleConfigController?.getState();
  let renderedRuleKey = "";

  const renderRuleControllerState = (
    state: HandoverRuleConfigWritableState | undefined,
    statusText = ""
  ): void => {
    if (!state) {
      setRuleEditorEnabled(elements, false);
      elements.ruleStatus.textContent =
        "Rule editor unavailable for this handover source.";
      return;
    }

    activeRuleState = state;
    setRuleEditorEnabled(elements, true);

    const nextRuleKey =
      `${state.handoverRuleConfig.policyId}:${state.handoverRuleConfig.appliedAt}`;

    if (nextRuleKey !== renderedRuleKey) {
      renderRuleDraft(elements, state.handoverRuleConfig);
      clearRuleErrors(elements);
      renderedRuleKey = nextRuleKey;
    }

    elements.ruleEditor.dataset.handoverRulePolicyId =
      state.handoverRuleConfig.policyId;
    elements.ruleEditor.dataset.handoverRuleAppliedAt =
      state.handoverRuleConfig.appliedAt;
    elements.ruleEditor.dataset.handoverRuleActivePolicyLabel =
      state.handoverPolicyLabel;
    elements.ruleStatus.textContent = statusText;
  };

  const handleRuleBlur = (): void => {
    if (!activeRuleState) {
      return;
    }

    const draft = readRuleDraft(
      elements,
      activeRuleState.handoverPolicyId,
      activeRuleState.handoverRuleConfig.appliedAt
    );

    validateRuleDraft(elements, draft);
  };

  const handleRuleApply = (event: SubmitEvent): void => {
    event.preventDefault();

    if (!ruleConfigController || !activeRuleState) {
      return;
    }

    const draft = readRuleDraft(
      elements,
      activeRuleState.handoverPolicyId,
      new Date().toISOString()
    );

    if (!validateRuleDraft(elements, draft)) {
      elements.ruleStatus.textContent =
        "Fix highlighted rule fields before applying.";
      return;
    }

    renderRuleControllerState(
      ruleConfigController.applyHandoverRuleConfig(draft),
      `Rule config applied to ${activeRuleState.handoverPolicyLabel}.`
    );
  };

  const handleRuleReset = (): void => {
    if (!ruleConfigController || !activeRuleState) {
      return;
    }

    renderRuleControllerState(
      ruleConfigController.resetHandoverRuleConfig(),
      `Rule config reset for ${activeRuleState.handoverPolicyLabel}.`
    );
  };

  const handleRuleCancel = (): void => {
    if (!activeRuleState) {
      return;
    }

    renderRuleDraft(elements, activeRuleState.handoverRuleConfig);
    clearRuleErrors(elements);
    elements.ruleStatus.textContent = "Rule edits canceled.";
  };

  renderState(elements, controller.getState());
  renderRuleControllerState(activeRuleState);

  const unsubscribeDecision = controller.subscribe((state) => {
    renderState(elements, state);
  });
  const unsubscribeRule = ruleConfigController
    ? ruleConfigController.subscribe((state) => {
        renderRuleControllerState(state);
      })
    : () => {};

  elements.ruleForm.addEventListener("submit", handleRuleApply);
  elements.resetButton.addEventListener("click", handleRuleReset);
  elements.cancelButton.addEventListener("click", handleRuleCancel);

  for (const input of [
    elements.ruleInputs.latencyWeight,
    elements.ruleInputs.jitterWeight,
    elements.ruleInputs.speedWeight,
    elements.ruleInputs.minDwellTicks,
    elements.ruleInputs.hysteresisMargin,
    ...elements.tieBreakSelects
  ]) {
    input.addEventListener("blur", handleRuleBlur);
  }

  return () => {
    unsubscribeDecision();
    unsubscribeRule();
    elements.ruleForm.removeEventListener("submit", handleRuleApply);
    elements.resetButton.removeEventListener("click", handleRuleReset);
    elements.cancelButton.removeEventListener("click", handleRuleCancel);

    for (const input of [
      elements.ruleInputs.latencyWeight,
      elements.ruleInputs.jitterWeight,
      elements.ruleInputs.speedWeight,
      elements.ruleInputs.minDwellTicks,
      elements.ruleInputs.hysteresisMargin,
      ...elements.tieBreakSelects
    ]) {
      input.removeEventListener("blur", handleRuleBlur);
    }

    clearDocumentState();
    container.replaceChildren();
  };
}
