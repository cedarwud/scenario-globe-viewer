export type DocumentTelemetryValue = string | undefined;
export type DocumentTelemetryPatch = Record<string, DocumentTelemetryValue>;

const DOCUMENT_TELEMETRY_DETAIL_LIMIT = 240;

export function syncDocumentTelemetry(
  patch: DocumentTelemetryPatch
): void {
  const { dataset } = document.documentElement;

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) {
      delete dataset[key];
    } else {
      dataset[key] = value;
    }
  }
}

export function clearDocumentTelemetry(
  keys: ReadonlyArray<string>
): void {
  const { dataset } = document.documentElement;

  for (const key of keys) {
    delete dataset[key];
  }
}

export function truncateDocumentTelemetryDetail(
  detail?: string
): string | undefined {
  return detail ? detail.slice(0, DOCUMENT_TELEMETRY_DETAIL_LIMIT) : undefined;
}
