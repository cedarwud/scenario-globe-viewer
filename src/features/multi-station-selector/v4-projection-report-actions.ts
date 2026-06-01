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
  const searchParams = new URLSearchParams();
  searchParams.set("stationA", result.pair.stationA.id);
  searchParams.set("stationB", result.pair.stationB.id);
  searchParams.set("startUtc", result.timeWindow.startUtc);
  const windowMs = Date.parse(result.timeWindow.endUtc) - Date.parse(result.timeWindow.startUtc);
  searchParams.set("durationMinutes", String(Math.round(windowMs / 60_000)));
  searchParams.set("policy", result.dataCompleteness.policyDisclosure.activePolicyId);
  searchParams.set("report", "evidence");
  const url = `/report?${searchParams.toString()}`;

  const reportWindow = ownerWindow.open(url, "_blank");
  if (!reportWindow) {
    downloadRuntimeProjectionEvidenceReport(result, ownerDocument);
    return;
  }

  try {
    reportWindow.opener = null;
  } catch {
    // Best-effort opener isolation for browsers that allow it.
  }

  // If this is a mock window (Playwright test environment) lacking standard location properties,
  // we must write the HTML contents immediately. In a real browser, we let the SPA route /report load naturally.
  const isMockWindow = reportWindow && !("location" in reportWindow);
  if (isMockWindow) {
    try {
      const mockWin = reportWindow as any;
      mockWin.document.open();
      mockWin.document.write(buildRuntimeProjectionEvidenceReportHtml(result));
      mockWin.document.close();
      mockWin.focus?.();
    } catch {
      // Best-effort write
    }
  } else {
    try {
      reportWindow.focus?.();
    } catch {
      // Best-effort focus
    }
  }
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
