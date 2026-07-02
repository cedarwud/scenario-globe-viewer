import { isEstnetTraceDisplayEnabled } from "./estnet-display-mode";
import type { RuntimeProjectionResult } from "./runtime-projection";
import {
  buildRuntimeProjectionCsv,
  buildRuntimeProjectionCsvFilename
} from "./runtime-projection-csv";
import {
  buildRuntimeProjectionEvidenceReportFilename,
  buildRuntimeProjectionEvidenceReportHtml
} from "./runtime-projection-evidence-report";
import {
  loadEstnetReportAppendixData,
  type EstnetReportAppendixData
} from "./runtime-projection-evidence-report-estnet";

// The report carries the ESTNeT appendix exactly when the surface it was
// opened from had the ESTNeT display mode on (panel-density rule: the panel's
// honesty one-liner points at "Report → ESTNeT appendix", so every report
// entry path — the /report route, the popup-blocked download fallback, and
// the mock-window test path — must honor the same opt-in, or that pointer
// would overclaim). loadEstnetReportAppendixData never throws.
function resolveEstnetAppendix(): Promise<EstnetReportAppendixData | null> {
  return isEstnetTraceDisplayEnabled()
    ? loadEstnetReportAppendixData()
    : Promise.resolve(null);
}

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

function durationMinutesForReportUrl(
  result: RuntimeProjectionResult
): number | null {
  const startMs = Date.parse(result.timeWindow.startUtc);
  const endMs = Date.parse(result.timeWindow.endUtc);
  if (
    !Number.isFinite(startMs) ||
    !Number.isFinite(endMs) ||
    endMs <= startMs
  ) {
    return null;
  }
  return Math.round((endMs - startMs) / 60_000);
}

function rainRateForReportUrl(result: RuntimeProjectionResult): number | null {
  for (const output of result.dataCompleteness.modeledOutputs) {
    const value = output.inputSummary.rainRateMmPerHour;
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }
  return null;
}

export async function downloadRuntimeProjectionEvidenceReport(
  result: RuntimeProjectionResult,
  ownerDocument: Document = document
): Promise<void> {
  const estnetAppendix = await resolveEstnetAppendix();
  downloadTextArtifact(
    ownerDocument,
    buildRuntimeProjectionEvidenceReportHtml(result, undefined, {
      estnetAppendix
    }),
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
  const durationMinutes = durationMinutesForReportUrl(result);
  if (durationMinutes !== null) {
    searchParams.set("durationMinutes", String(durationMinutes));
  }
  const policyId = result.dataCompleteness.policyDisclosure.activePolicyId;
  if (policyId) {
    searchParams.set("policy", policyId);
  }
  const rainRateMmPerHour = rainRateForReportUrl(result);
  if (rainRateMmPerHour !== null) {
    searchParams.set("rainRateMmPerHour", String(rainRateMmPerHour));
  }
  // Carry the ESTNeT opt-in across the tab boundary: a `?estnet=1` deep link
  // seeds the mode in-memory only (nothing persisted), so the /report route
  // cannot read it back from storage — the URL param is the contract.
  if (isEstnetTraceDisplayEnabled()) {
    searchParams.set("estnet", "1");
  }
  const url = `/report?${searchParams.toString()}`;

  const reportWindow = ownerWindow.open(url, "_blank");
  if (!reportWindow) {
    void downloadRuntimeProjectionEvidenceReport(result, ownerDocument);
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
    void (async () => {
      try {
        const estnetAppendix = await resolveEstnetAppendix();
        const mockWin = reportWindow as any;
        mockWin.document.open();
        mockWin.document.write(
          buildRuntimeProjectionEvidenceReportHtml(result, undefined, {
            estnetAppendix
          })
        );
        mockWin.document.close();
        mockWin.focus?.();
      } catch {
        // Best-effort write
      }
    })();
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
