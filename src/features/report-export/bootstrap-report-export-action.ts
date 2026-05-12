import type { BootstrapOperatorController } from "../../runtime/bootstrap-operator-controller";
import type { CommunicationTimeReport } from "../communication-time";
import type { HandoverDecisionReport } from "../handover-decision";
import type { PhysicalInputReport } from "../physical-input";
import type { ValidationStateReport } from "../validation-state";
import {
  REPORT_EXPORT_BUNDLE_DISCLAIMER,
  REPORT_EXPORT_FAMILY_DISCLAIMERS,
  REPORT_EXPORT_FAMILY_IDS,
  REPORT_EXPORT_FAMILY_LABELS,
  createReportBundle,
  createReportExportCsvRows,
  createReportExportFiles,
  resolveReportExportAvailability,
  type ReportExportContext,
  type ReportExportFile,
  type ReportExportFormat,
  type ReportExportSourceHandles,
  type ReportFamilyId,
  type ReportSourceHandle
} from "./report-export";

interface BootstrapReportExportActionOptions {
  container: HTMLElement;
  operatorController: BootstrapOperatorController;
}

interface ReportExportCapture {
  communicationTime?: ReportSourceHandle<CommunicationTimeReport>;
  handoverDecision?: ReportSourceHandle<HandoverDecisionReport>;
  physicalInput?: ReportSourceHandle<PhysicalInputReport>;
  validationState?: ReportSourceHandle<ValidationStateReport>;
}

interface ReportExportElements {
  root: HTMLDivElement;
  heading: HTMLHeadingElement;
  primaryButton: HTMLButtonElement;
  disclosureButton: HTMLButtonElement;
  optionsPanel: HTMLDivElement;
  checkboxes: ReadonlyArray<HTMLInputElement>;
  radios: ReadonlyArray<HTMLInputElement>;
  status: HTMLParagraphElement;
  successRegion: HTMLDivElement;
  failureRegion: HTMLDivElement;
  successDisclaimers: HTMLParagraphElement;
}

let nextReportExportInstanceId = 0;

function toIsoTimestamp(value: string | number): string | null {
  const epochMs = typeof value === "number" ? value : Date.parse(value);

  return Number.isFinite(epochMs) ? new Date(epochMs).toISOString() : null;
}

function readCapture(): ReportExportCapture | undefined {
  return window.__SCENARIO_GLOBE_VIEWER_CAPTURE__ as
    | ReportExportCapture
    | undefined;
}

function readSourceHandles(): ReportExportSourceHandles {
  const capture = readCapture();

  return {
    communicationTime: capture?.communicationTime,
    handoverDecision: capture?.handoverDecision,
    physicalInput: capture?.physicalInput,
    validationState: capture?.validationState
  };
}

function formatFamilyOption(family: ReportFamilyId): string {
  return `
    <label class="report-export-action__choice">
      <input
        type="checkbox"
        data-report-export-family="${family}"
        value="${family}"
        checked
      />
      <span>${REPORT_EXPORT_FAMILY_LABELS[family]}</span>
    </label>
  `;
}

function formatRadioOption(
  format: ReportExportFormat,
  label: string,
  checked = false
): string {
  return `
    <label class="report-export-action__choice">
      <input
        type="radio"
        name="report-export-format"
        data-report-export-format="${format}"
        value="${format}"
        ${checked ? "checked" : ""}
      />
      <span>${label}</span>
    </label>
  `;
}

function createElements(container: HTMLElement): ReportExportElements {
  const instanceId = nextReportExportInstanceId;
  nextReportExportInstanceId += 1;

  const headingId = `report-export-heading-${instanceId}`;
  const optionsId = `report-export-options-${instanceId}`;
  const statusId = `report-export-status-${instanceId}`;
  const successId = `report-export-success-${instanceId}`;
  const failureId = `report-export-failure-${instanceId}`;

  container.innerHTML = `
    <section
      class="report-export-action"
      data-report-export-action-group="true"
      role="group"
      aria-labelledby="${headingId}"
      aria-describedby="${statusId} ${successId} ${failureId}"
      aria-busy="false"
    >
      <div class="report-export-action__header">
        <div class="report-export-action__title">
          <span class="operator-status-hud__eyebrow">Report Export</span>
          <h2 id="${headingId}" class="report-export-action__heading">
            Bounded Statistics Report
          </h2>
        </div>
        <div class="report-export-action__buttons">
          <button
            type="button"
            class="operator-control-chip report-export-action__primary"
            data-report-export-primary="true"
            aria-busy="false"
          >
            <span data-report-export-primary-label="true">Export Statistics Report</span>
            <span
              class="report-export-action__spinner"
              data-report-export-spinner="true"
              aria-hidden="true"
            ></span>
          </button>
          <button
            type="button"
            class="operator-control-chip report-export-action__disclosure"
            data-report-export-disclosure="true"
            aria-expanded="false"
            aria-controls="${optionsId}"
          >
            Options
          </button>
        </div>
      </div>
      <p
        id="${statusId}"
        class="report-export-action__status"
        data-report-export-status="true"
      >
        Preparing report availability.
      </p>
      <div
        id="${optionsId}"
        class="report-export-action__options"
        data-report-export-options-panel="true"
        hidden
      >
        <fieldset class="report-export-action__fieldset">
          <legend>Report families</legend>
          <div class="report-export-action__choices">
            ${REPORT_EXPORT_FAMILY_IDS.map(formatFamilyOption).join("")}
          </div>
        </fieldset>
        <fieldset class="report-export-action__fieldset">
          <legend>Format</legend>
          <div class="report-export-action__choices">
            ${formatRadioOption("json", "JSON")}
            ${formatRadioOption("csv", "CSV")}
            ${formatRadioOption("both", "Both", true)}
          </div>
        </fieldset>
      </div>
      <div
        id="${successId}"
        class="operator-control-live-region"
        data-report-export-success-live="true"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      ></div>
      <div
        id="${failureId}"
        class="operator-control-live-region"
        data-report-export-failure-live="true"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
      ></div>
      <p
        class="report-export-action__success"
        data-report-export-success-message="true"
      ></p>
    </section>
  `;

  const root = container.querySelector<HTMLDivElement>(
    "[data-report-export-action-group='true']"
  );
  const heading = container.querySelector<HTMLHeadingElement>(`#${headingId}`);
  const primaryButton = container.querySelector<HTMLButtonElement>(
    "[data-report-export-primary='true']"
  );
  const disclosureButton = container.querySelector<HTMLButtonElement>(
    "[data-report-export-disclosure='true']"
  );
  const optionsPanel = container.querySelector<HTMLDivElement>(
    "[data-report-export-options-panel='true']"
  );
  const checkboxes = Array.from(
    container.querySelectorAll<HTMLInputElement>("[data-report-export-family]")
  );
  const radios = Array.from(
    container.querySelectorAll<HTMLInputElement>("[data-report-export-format]")
  );
  const status = container.querySelector<HTMLParagraphElement>(
    "[data-report-export-status='true']"
  );
  const successRegion = container.querySelector<HTMLDivElement>(
    "[data-report-export-success-live='true']"
  );
  const failureRegion = container.querySelector<HTMLDivElement>(
    "[data-report-export-failure-live='true']"
  );
  const successDisclaimers = container.querySelector<HTMLParagraphElement>(
    "[data-report-export-success-message='true']"
  );

  if (
    !root ||
    !heading ||
    !primaryButton ||
    !disclosureButton ||
    !optionsPanel ||
    checkboxes.length !== REPORT_EXPORT_FAMILY_IDS.length ||
    radios.length !== 3 ||
    !status ||
    !successRegion ||
    !failureRegion ||
    !successDisclaimers
  ) {
    throw new Error("Missing report export action elements");
  }

  return {
    root,
    heading,
    primaryButton,
    disclosureButton,
    optionsPanel,
    checkboxes,
    radios,
    status,
    successRegion,
    failureRegion,
    successDisclaimers
  };
}

function selectedFamilies(elements: ReportExportElements): ReadonlyArray<ReportFamilyId> {
  return elements.checkboxes
    .filter((checkbox) => checkbox.checked)
    .map((checkbox) => checkbox.value as ReportFamilyId);
}

function selectedFormat(elements: ReportExportElements): ReportExportFormat {
  const checked = elements.radios.find((radio) => radio.checked);

  return (checked?.value as ReportExportFormat | undefined) ?? "both";
}

function contextFromOperator(
  operatorController: BootstrapOperatorController
): ReportExportContext {
  const state = operatorController.getState();

  return {
    scenarioId: state.scenarioId,
    scenarioLabel: state.scenarioLabel,
    replayMode: state.replayMode,
    replayTimeIso: toIsoTimestamp(state.currentTime)
  };
}

function downloadFile(file: ReportExportFile): void {
  const blob = new Blob([file.contents], { type: file.mimeType });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = objectUrl;
  anchor.download = file.filename;
  anchor.hidden = true;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 1000);
}

function nextPreparationFrame(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      window.setTimeout(resolve, 120);
    });
  });
}

function selectedDisclaimers(families: ReadonlyArray<ReportFamilyId>): string {
  return [
    REPORT_EXPORT_BUNDLE_DISCLAIMER,
    ...families.map((family) => REPORT_EXPORT_FAMILY_DISCLAIMERS[family])
  ].join(" ");
}

export function mountBootstrapReportExportAction({
  container,
  operatorController
}: BootstrapReportExportActionOptions): () => void {
  const elements = createElements(container);
  let expanded = false;
  let preparing = false;
  let lastOutcome: "success" | "failed" | null = null;

  const renderExpanded = (): void => {
    elements.disclosureButton.setAttribute(
      "aria-expanded",
      expanded ? "true" : "false"
    );
    elements.optionsPanel.hidden = !expanded;
    elements.root.dataset.reportExportExpanded = expanded ? "true" : "false";
  };

  const renderAvailability = (): void => {
    const selected = selectedFamilies(elements);
    const availability = resolveReportExportAvailability(readSourceHandles());
    const availableFamilies = new Set(
      availability
        .filter((entry) => entry.available)
        .map((entry) => entry.family)
    );
    const selectedAvailableCount = selected.filter((family) =>
      availableFamilies.has(family)
    ).length;
    const hasSelectedFamily = selected.length > 0;
    const canExport = hasSelectedFamily && selectedAvailableCount > 0;

    elements.root.dataset.reportExportSelectedFamilies = selected.join("|");
    elements.root.dataset.reportExportFormat = selectedFormat(elements);
    elements.root.dataset.reportExportAvailableFamilies = [...availableFamilies].join("|");
    elements.root.dataset.reportExportState = preparing
      ? "preparing"
      : lastOutcome ?? (canExport ? "idle" : "unavailable");
    elements.root.setAttribute("aria-busy", preparing ? "true" : "false");
    elements.primaryButton.setAttribute(
      "aria-busy",
      preparing ? "true" : "false"
    );
    elements.primaryButton.disabled = preparing ? false : !canExport;

    const label = elements.primaryButton.querySelector<HTMLSpanElement>(
      "[data-report-export-primary-label='true']"
    );

    if (label) {
      label.textContent = preparing
        ? "Preparing…"
        : canExport
          ? "Export Statistics Report"
          : "No report state available.";
    }

    if (preparing) {
      elements.status.textContent = "Preparing report files.";
      return;
    }

    if (lastOutcome === "success" || lastOutcome === "failed") {
      return;
    }

    if (!hasSelectedFamily) {
      elements.status.textContent = "Select at least one report family.";
      return;
    }

    elements.status.textContent = canExport
      ? `Ready. ${selectedAvailableCount} selected report families available.`
      : "No report state available.";
  };

  const handleDisclosureClick = (): void => {
    expanded = !expanded;
    renderExpanded();
  };

  const handleSelectionChange = (): void => {
    lastOutcome = null;
    elements.successRegion.textContent = "";
    elements.failureRegion.textContent = "";
    elements.successDisclaimers.textContent = "";
    renderAvailability();
  };

  const reportFailure = (reason: unknown): void => {
    const message = reason instanceof Error ? reason.message : String(reason);

    elements.failureRegion.textContent = `Export failed. ${message}.`;
    elements.successRegion.textContent = "";
    elements.successDisclaimers.textContent = "";
    lastOutcome = "failed";
    elements.root.dataset.reportExportState = "failed";
    elements.root.dataset.reportExportFailure = message;
    elements.status.textContent = `Export failed. ${message}.`;
  };

  const handleExportClick = async (): Promise<void> => {
    if (preparing) {
      return;
    }

    const families = selectedFamilies(elements);

    if (families.length === 0) {
      reportFailure("Select at least one report family");
      return;
    }

    preparing = true;
    lastOutcome = null;
    elements.failureRegion.textContent = "";
    elements.successRegion.textContent = "";
    elements.successDisclaimers.textContent = "";
    renderAvailability();

    try {
      await nextPreparationFrame();

      const bundle = createReportBundle({
        sources: readSourceHandles(),
        selectedFamilies: families,
        context: contextFromOperator(operatorController)
      });
      const availableFamilies = REPORT_EXPORT_FAMILY_IDS.filter((family) => {
        const familyKey = {
          "communication-time": "communicationTime",
          "handover-decision": "handoverDecision",
          "physical-input": "physicalInput",
          "validation-state": "validationState"
        }[family] as keyof typeof bundle.families;

        return bundle.families[familyKey].available;
      });

      if (availableFamilies.length === 0) {
        throw new Error("No report state available");
      }

      const files = createReportExportFiles(bundle, selectedFormat(elements));

      for (const file of files) {
        downloadFile(file);
      }

      const csvRows = createReportExportCsvRows(bundle);

      elements.successRegion.textContent =
        `Report exported. ${files.length} files downloaded.`;
      elements.successDisclaimers.textContent = selectedDisclaimers(families);
      lastOutcome = "success";
      elements.root.dataset.reportExportState = "success";
      elements.root.dataset.reportExportLastGeneratedAt = bundle.metadata.generatedAt;
      elements.root.dataset.reportExportLastFilenames = files
        .map((file) => file.filename)
        .join("|");
      elements.root.dataset.reportExportLastCsvRows = String(csvRows.length);
      elements.status.textContent =
        `Report exported. ${files.length} files downloaded.`;
    } catch (error) {
      reportFailure(error);
    } finally {
      preparing = false;
      renderAvailability();
    }
  };
  const handlePrimaryClick = (): void => {
    void handleExportClick();
  };

  renderExpanded();
  renderAvailability();

  const deferredAvailability = window.setTimeout(renderAvailability, 0);
  const unsubscribeOperator = operatorController.subscribe(() => {
    renderAvailability();
  });

  elements.disclosureButton.addEventListener("click", handleDisclosureClick);
  elements.primaryButton.addEventListener("click", handlePrimaryClick);

  for (const checkbox of elements.checkboxes) {
    checkbox.addEventListener("change", handleSelectionChange);
  }

  for (const radio of elements.radios) {
    radio.addEventListener("change", handleSelectionChange);
  }

  return () => {
    window.clearTimeout(deferredAvailability);
    unsubscribeOperator();
    elements.disclosureButton.removeEventListener("click", handleDisclosureClick);
    elements.primaryButton.removeEventListener("click", handlePrimaryClick);

    for (const checkbox of elements.checkboxes) {
      checkbox.removeEventListener("change", handleSelectionChange);
    }

    for (const radio of elements.radios) {
      radio.removeEventListener("change", handleSelectionChange);
    }

    container.replaceChildren();
  };
}
