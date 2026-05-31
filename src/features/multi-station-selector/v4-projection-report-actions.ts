import type { RuntimeProjectionResult } from "./runtime-projection";
import {
  buildRuntimeProjectionCsv,
  buildRuntimeProjectionCsvFilename
} from "./runtime-projection-csv";
import {
  buildRuntimeProjectionEvidenceReportFilename,
  buildRuntimeProjectionEvidenceReportHtml
} from "./runtime-projection-evidence-report";

function downloadTextArtifact(
  ownerDocument: Document,
  text: string,
  mimeType: string,
  filename: string
): void {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = ownerDocument.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  ownerDocument.body.appendChild(link);
  try {
    link.click();
  } finally {
    link.remove();
    URL.revokeObjectURL(url);
  }
}

export function downloadRuntimeProjectionEvidenceReport(
  result: RuntimeProjectionResult,
  ownerDocument: Document = document
): void {
  downloadTextArtifact(
    ownerDocument,
    buildRuntimeProjectionEvidenceReportHtml(result),
    "text/html;charset=utf-8",
    buildRuntimeProjectionEvidenceReportFilename(result)
  );
}

export function openRuntimeProjectionEvidenceReport(
  result: RuntimeProjectionResult,
  ownerDocument: Document = document
): void {
  const ownerWindow = ownerDocument.defaultView ?? window;
  const reportWindow = ownerWindow.open("", "_blank");
  if (!reportWindow) {
    downloadRuntimeProjectionEvidenceReport(result, ownerDocument);
    return;
  }

  try {
    reportWindow.opener = null;
  } catch {
    // Best-effort opener isolation for browsers that allow it.
  }

  reportWindow.document.open();
  reportWindow.document.write(buildRuntimeProjectionEvidenceReportHtml(result));
  reportWindow.document.close();
  reportWindow.focus?.();
}

export function downloadRuntimeProjectionCsv(
  result: RuntimeProjectionResult,
  ownerDocument: Document = document
): void {
  downloadTextArtifact(
    ownerDocument,
    buildRuntimeProjectionCsv(result),
    "text/csv;charset=utf-8",
    buildRuntimeProjectionCsvFilename(result)
  );
}

export function buildOpenEvidenceReportButton(
  result: RuntimeProjectionResult,
  label = "Open evidence report"
): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "v4-projection-side-panel__download-report";
  button.textContent = label;
  button.dataset.reportAction = "open-html";
  button.setAttribute("aria-label", "Open evidence report in a new tab");
  button.addEventListener("click", () => {
    openRuntimeProjectionEvidenceReport(result, button.ownerDocument);
  });
  return button;
}

export function buildDownloadCsvButton(
  result: RuntimeProjectionResult,
  label = "Download CSV"
): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "v4-projection-side-panel__download-report";
  button.textContent = label;
  button.dataset.reportAction = "download-csv";
  button.dataset.variant = "secondary";
  button.setAttribute("aria-label", "Download projection data as CSV");
  button.addEventListener("click", () => {
    downloadRuntimeProjectionCsv(result, button.ownerDocument);
  });
  return button;
}
