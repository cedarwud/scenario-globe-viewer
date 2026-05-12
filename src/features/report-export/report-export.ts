import type { CommunicationTimeReport } from "../communication-time";
import type { HandoverDecisionReport } from "../handover-decision";
import type { PhysicalInputReport } from "../physical-input";
import type { ValidationStateReport } from "../validation-state";

export const REPORT_EXPORT_BUNDLE_SCHEMA_VERSION =
  "m8a-v4.12-f16-bundle-v1" as const;
export const REPORT_EXPORT_BUNDLE_DISCLAIMER =
  "Modeled, not measured. Repo-owned bounded report export; external network and physical-layer truth remain outside this artifact.";

export const REPORT_EXPORT_FAMILY_IDS = [
  "communication-time",
  "handover-decision",
  "physical-input",
  "validation-state"
] as const;

export type ReportFamilyId = (typeof REPORT_EXPORT_FAMILY_IDS)[number];
export type ReportExportFormat = "json" | "csv" | "both";
export type ReportExportProvenanceKind =
  | "bounded-proxy"
  | "modeled-bounded-class-not-measured"
  | "repo-owned-readout";

export interface ReportBundleMetadata {
  schemaVersion: typeof REPORT_EXPORT_BUNDLE_SCHEMA_VERSION;
  generatedAt: string;
  scenarioId: string;
  scenarioLabel: string;
  replayMode: "real-time" | "prerecorded";
  replayTimeIso: string | null;
  includedFamilies: ReadonlyArray<ReportFamilyId>;
  bundleDisclaimer: string;
  familyDisclaimers: Record<ReportFamilyId, string>;
}

export interface ReportBundleFamilyEntry<TPayload> {
  family: ReportFamilyId;
  available: boolean;
  unavailableReason: string | null;
  payload: TPayload | null;
}

export interface ReportBundle {
  metadata: ReportBundleMetadata;
  families: {
    communicationTime: ReportBundleFamilyEntry<CommunicationTimeReport>;
    handoverDecision: ReportBundleFamilyEntry<HandoverDecisionReport>;
    physicalInput: ReportBundleFamilyEntry<PhysicalInputReport>;
    validationState: ReportBundleFamilyEntry<ValidationStateReport>;
  };
}

export interface ReportExportContext {
  scenarioId?: string;
  scenarioLabel?: string;
  replayMode?: "real-time" | "prerecorded";
  replayTimeIso?: string | null;
}

export interface ReportSourceHandle<TReport> {
  getState(): {
    report?: TReport | null;
  };
}

export interface ReportExportSourceHandles {
  communicationTime?: ReportSourceHandle<CommunicationTimeReport>;
  handoverDecision?: ReportSourceHandle<HandoverDecisionReport>;
  physicalInput?: ReportSourceHandle<PhysicalInputReport>;
  validationState?: ReportSourceHandle<ValidationStateReport>;
}

export interface CreateReportBundleOptions {
  sources: ReportExportSourceHandles;
  selectedFamilies?: ReadonlyArray<ReportFamilyId>;
  context?: ReportExportContext;
  generatedAt?: Date;
}

export interface ReportFamilyAvailability {
  family: ReportFamilyId;
  available: boolean;
  unavailableReason: string | null;
}

export interface ReportExportFile {
  filename: string;
  mimeType: string;
  contents: string;
}

interface ReportFamilyConfig {
  id: ReportFamilyId;
  key: keyof ReportBundle["families"];
  label: string;
  provenanceKind: ReportExportProvenanceKind;
  unavailableReason: string;
  notSelectedReason: string;
}

interface ResolvedFamily<TReport> {
  report: TReport | null;
  unavailableReason: string | null;
}

interface CsvRow {
  reportFamily: ReportFamilyId;
  recordId: string;
  field: string;
  value: string;
  unit: string;
  provenanceKind: ReportExportProvenanceKind;
  disclaimer: string;
  generatedAt: string;
  schemaVersion: string;
  scenarioId: string;
  replayMode: "real-time" | "prerecorded";
}

type JsonScalar = string | number | boolean | null;

const REPORT_FAMILY_CONFIGS: ReadonlyArray<ReportFamilyConfig> = [
  {
    id: "communication-time",
    key: "communicationTime",
    label: "Communication time",
    provenanceKind: "repo-owned-readout",
    unavailableReason: "Communication time controller not mounted on this route.",
    notSelectedReason: "Communication time family not selected for this export."
  },
  {
    id: "handover-decision",
    key: "handoverDecision",
    label: "Handover decision",
    provenanceKind: "bounded-proxy",
    unavailableReason: "Handover decision controller not mounted on this route.",
    notSelectedReason: "Handover decision family not selected for this export."
  },
  {
    id: "physical-input",
    key: "physicalInput",
    label: "Physical input",
    provenanceKind: "bounded-proxy",
    unavailableReason: "Physical input controller not mounted on this route.",
    notSelectedReason: "Physical input family not selected for this export."
  },
  {
    id: "validation-state",
    key: "validationState",
    label: "Validation state",
    provenanceKind: "repo-owned-readout",
    unavailableReason: "Validation state controller not mounted on this route.",
    notSelectedReason: "Validation state family not selected for this export."
  }
];

export const REPORT_EXPORT_FAMILY_LABELS: Record<ReportFamilyId, string> =
  Object.fromEntries(
    REPORT_FAMILY_CONFIGS.map((config) => [config.id, config.label])
  ) as Record<ReportFamilyId, string>;

export const REPORT_EXPORT_FAMILY_DISCLAIMERS: Record<ReportFamilyId, string> = {
  "communication-time":
    "Repo-owned readout from bounded scenario windows; not iperf/ping measured availability.",
  "handover-decision":
    "Bounded-proxy decision over deterministic candidate metrics; not measured latency, jitter, or throughput truth.",
  "physical-input":
    "Bounded proxy physical inputs projected into latencyMs / jitterMs / networkSpeedMbps; not final physical-layer truth.",
  "validation-state":
    "Repo-owned validation boundary readout; external NAT / tunnel / DUT / iperf / ping truth lives outside this repo."
};

const CSV_HEADER = [
  "reportFamily",
  "recordId",
  "field",
  "value",
  "unit",
  "provenanceKind",
  "disclaimer",
  "generatedAt",
  "schemaVersion",
  "scenarioId",
  "replayMode"
] as const;

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function readReport<TReport>(
  handle: ReportSourceHandle<TReport> | undefined,
  unavailableReason: string
): ResolvedFamily<TReport> {
  if (!handle) {
    return {
      report: null,
      unavailableReason
    };
  }

  try {
    const report = handle.getState().report ?? null;

    return report
      ? {
          report,
          unavailableReason: null
        }
      : {
          report: null,
          unavailableReason: unavailableReason.replace(
            "controller not mounted",
            "report state not available"
          )
        };
  } catch {
    return {
      report: null,
      unavailableReason: unavailableReason.replace(
        "not mounted on this route",
        "could not be read"
      )
    };
  }
}

function selectedFamilySet(
  selectedFamilies: ReadonlyArray<ReportFamilyId> | undefined
): ReadonlySet<ReportFamilyId> {
  return new Set(selectedFamilies ?? REPORT_EXPORT_FAMILY_IDS);
}

function familyEntry<TReport>(
  config: ReportFamilyConfig,
  selectedFamilies: ReadonlySet<ReportFamilyId>,
  resolved: ResolvedFamily<TReport>
): ReportBundleFamilyEntry<TReport> {
  if (!selectedFamilies.has(config.id)) {
    return {
      family: config.id,
      available: false,
      unavailableReason: config.notSelectedReason,
      payload: null
    };
  }

  return {
    family: config.id,
    available: Boolean(resolved.report),
    unavailableReason: resolved.unavailableReason,
    payload: resolved.report
  };
}

function normalizeIsoTimestamp(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const epochMs = typeof value === "number" ? value : Date.parse(value);

  return Number.isFinite(epochMs) ? new Date(epochMs).toISOString() : null;
}

function resolveContext(
  context: ReportExportContext | undefined,
  families: ReportBundle["families"]
): Required<ReportExportContext> {
  const communicationReport = families.communicationTime.payload;
  const handoverReport = families.handoverDecision.payload;
  const physicalReport = families.physicalInput.payload;
  const validationReport = families.validationState.payload;
  const scenarioId =
    context?.scenarioId ??
    communicationReport?.scenario.id ??
    physicalReport?.scenario.id ??
    handoverReport?.snapshot.scenarioId ??
    validationReport?.scenarioId ??
    "unknown-scenario";
  const scenarioLabel =
    context?.scenarioLabel ??
    communicationReport?.scenario.label ??
    physicalReport?.scenario.label ??
    scenarioId;
  const replayTimeIso =
    normalizeIsoTimestamp(context?.replayTimeIso) ??
    normalizeIsoTimestamp(communicationReport?.currentTime) ??
    normalizeIsoTimestamp(physicalReport?.evaluatedAt) ??
    normalizeIsoTimestamp(handoverReport?.snapshot.evaluatedAt) ??
    normalizeIsoTimestamp(validationReport?.evaluatedAt);

  return {
    scenarioId,
    scenarioLabel,
    replayMode:
      context?.replayMode ??
      communicationReport?.scenario.mode ??
      "real-time",
    replayTimeIso
  };
}

export function resolveReportExportAvailability(
  sources: ReportExportSourceHandles
): ReadonlyArray<ReportFamilyAvailability> {
  return REPORT_FAMILY_CONFIGS.map((config) => {
    const resolved = readFamilyReport(config, sources);

    return {
      family: config.id,
      available: Boolean(resolved.report),
      unavailableReason: resolved.unavailableReason
    };
  });
}

function readFamilyReport(
  config: ReportFamilyConfig,
  sources: ReportExportSourceHandles
): ResolvedFamily<CommunicationTimeReport | HandoverDecisionReport | PhysicalInputReport | ValidationStateReport> {
  switch (config.id) {
    case "communication-time":
      return readReport(sources.communicationTime, config.unavailableReason);
    case "handover-decision":
      return readReport(sources.handoverDecision, config.unavailableReason);
    case "physical-input":
      return readReport(sources.physicalInput, config.unavailableReason);
    case "validation-state":
      return readReport(sources.validationState, config.unavailableReason);
  }
}

export function createReportBundle({
  sources,
  selectedFamilies,
  context,
  generatedAt = new Date()
}: CreateReportBundleOptions): ReportBundle {
  const selected = selectedFamilySet(selectedFamilies);
  const communicationTime = familyEntry(
    REPORT_FAMILY_CONFIGS[0],
    selected,
    readReport(sources.communicationTime, REPORT_FAMILY_CONFIGS[0].unavailableReason)
  );
  const handoverDecision = familyEntry(
    REPORT_FAMILY_CONFIGS[1],
    selected,
    readReport(sources.handoverDecision, REPORT_FAMILY_CONFIGS[1].unavailableReason)
  );
  const physicalInput = familyEntry(
    REPORT_FAMILY_CONFIGS[2],
    selected,
    readReport(sources.physicalInput, REPORT_FAMILY_CONFIGS[2].unavailableReason)
  );
  const validationState = familyEntry(
    REPORT_FAMILY_CONFIGS[3],
    selected,
    readReport(sources.validationState, REPORT_FAMILY_CONFIGS[3].unavailableReason)
  );
  const families: ReportBundle["families"] = {
    communicationTime,
    handoverDecision,
    physicalInput,
    validationState
  };
  const resolvedContext = resolveContext(context, families);

  return {
    metadata: {
      schemaVersion: REPORT_EXPORT_BUNDLE_SCHEMA_VERSION,
      generatedAt: generatedAt.toISOString(),
      scenarioId: resolvedContext.scenarioId,
      scenarioLabel: resolvedContext.scenarioLabel,
      replayMode: resolvedContext.replayMode,
      replayTimeIso: resolvedContext.replayTimeIso,
      includedFamilies: REPORT_EXPORT_FAMILY_IDS.filter((family) =>
        selected.has(family)
      ),
      bundleDisclaimer: REPORT_EXPORT_BUNDLE_DISCLAIMER,
      familyDisclaimers: {
        "communication-time": REPORT_EXPORT_FAMILY_DISCLAIMERS["communication-time"],
        "handover-decision": REPORT_EXPORT_FAMILY_DISCLAIMERS["handover-decision"],
        "physical-input": REPORT_EXPORT_FAMILY_DISCLAIMERS["physical-input"],
        "validation-state": REPORT_EXPORT_FAMILY_DISCLAIMERS["validation-state"]
      }
    },
    families
  };
}

function orderedFamilyEntry<TPayload>(
  entry: ReportBundleFamilyEntry<TPayload>
): Record<string, unknown> {
  return {
    family: entry.family,
    available: entry.available,
    unavailableReason: entry.unavailableReason,
    payload: sortJsonValue(entry.payload)
  };
}

function orderedBundle(bundle: ReportBundle): Record<string, unknown> {
  return {
    metadata: {
      schemaVersion: bundle.metadata.schemaVersion,
      generatedAt: bundle.metadata.generatedAt,
      scenarioId: bundle.metadata.scenarioId,
      scenarioLabel: bundle.metadata.scenarioLabel,
      replayMode: bundle.metadata.replayMode,
      replayTimeIso: bundle.metadata.replayTimeIso,
      includedFamilies: [...bundle.metadata.includedFamilies],
      bundleDisclaimer: bundle.metadata.bundleDisclaimer,
      familyDisclaimers: {
        "communication-time":
          bundle.metadata.familyDisclaimers["communication-time"],
        "handover-decision":
          bundle.metadata.familyDisclaimers["handover-decision"],
        "physical-input": bundle.metadata.familyDisclaimers["physical-input"],
        "validation-state": bundle.metadata.familyDisclaimers["validation-state"]
      }
    },
    families: {
      communicationTime: orderedFamilyEntry(bundle.families.communicationTime),
      handoverDecision: orderedFamilyEntry(bundle.families.handoverDecision),
      physicalInput: orderedFamilyEntry(bundle.families.physicalInput),
      validationState: orderedFamilyEntry(bundle.families.validationState)
    }
  };
}

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJsonValue);
  }

  if (!isPlainRecord(value)) {
    return value;
  }

  return Object.keys(value)
    .sort()
    .reduce<Record<string, unknown>>((nextValue, key) => {
      nextValue[key] = sortJsonValue(value[key]);
      return nextValue;
    }, {});
}

export function serializeReportBundleJson(bundle: ReportBundle): string {
  return `${JSON.stringify(orderedBundle(bundle), null, 2)}\n`;
}

function compactUtcIso(value: string): string {
  const epochMs = Date.parse(value);

  if (!Number.isFinite(epochMs)) {
    throw new Error(`Report export generatedAt must parse: ${value}`);
  }

  const date = new Date(epochMs);
  const pad = (part: number): string => part.toString().padStart(2, "0");

  return [
    date.getUTCFullYear().toString().padStart(4, "0"),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
    "T",
    pad(date.getUTCHours()),
    pad(date.getUTCMinutes()),
    pad(date.getUTCSeconds()),
    "Z"
  ].join("");
}

export function slugifyReportExportScenarioId(scenarioId: string): string {
  const slug = scenarioId
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug.length > 0 ? slug : "unknown-scenario";
}

export function formatReportExportFilename(
  bundle: ReportBundle,
  extension: "json" | "csv"
): string {
  return [
    "m8a-v4.12-f16-report",
    slugifyReportExportScenarioId(bundle.metadata.scenarioId),
    compactUtcIso(bundle.metadata.generatedAt)
  ].join("-") + `.${extension}`;
}

function scalarToString(value: JsonScalar): string {
  if (value === null) {
    return "null";
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return String(value);
}

function fieldUnit(field: string): string {
  if (field.endsWith("Ms")) {
    return "ms";
  }

  if (field.endsWith("Mbps")) {
    return "Mbps";
  }

  if (field.endsWith("GHz")) {
    return "GHz";
  }

  if (field.endsWith("Deg")) {
    return "deg";
  }

  if (field.endsWith("Db")) {
    return "dB";
  }

  if (field.endsWith("MmPerHr")) {
    return "mm/hr";
  }

  if (field.endsWith("Percent")) {
    return "percent";
  }

  if (field.endsWith("Ratio")) {
    return "ratio";
  }

  if (field.toLowerCase().endsWith("count")) {
    return "count";
  }

  return "";
}

function recordIdForObject(
  family: ReportFamilyId,
  path: ReadonlyArray<string>,
  value: Record<string, unknown>,
  index: number | null
): string | null {
  const explicitId =
    typeof value.candidateId === "string"
      ? value.candidateId
      : typeof value.windowId === "string"
        ? value.windowId
        : typeof value.scenarioId === "string"
          ? value.scenarioId
          : null;

  if (explicitId) {
    return explicitId;
  }

  const lastPath = path.at(-1);

  if (family === "communication-time" && lastPath === "windows" && index !== null) {
    return `window-${index + 1}`;
  }

  if (lastPath) {
    return index === null ? lastPath : `${lastPath}-${index + 1}`;
  }

  return null;
}

function flattenScalarRows(
  family: ReportFamilyId,
  value: unknown,
  path: ReadonlyArray<string>,
  recordId: string,
  rows: Array<{ recordId: string; field: string; value: string; unit: string }>,
  index: number | null = null
): void {
  if (value === undefined) {
    return;
  }

  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    const field = path.at(-1) ?? "value";

    rows.push({
      recordId,
      field,
      value: scalarToString(value),
      unit: typeof value === "number" ? fieldUnit(field) : ""
    });
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, itemIndex) => {
      flattenScalarRows(family, item, path, recordId, rows, itemIndex);
    });
    return;
  }

  if (!isPlainRecord(value)) {
    return;
  }

  const nextRecordId =
    recordIdForObject(family, path, value, index) ?? recordId;

  Object.keys(value)
    .sort()
    .forEach((key) => {
      flattenScalarRows(
        family,
        value[key],
        [...path, key],
        nextRecordId,
        rows
      );
    });
}

function reportRows(
  family: ReportFamilyId,
  payload: unknown
): Array<{ recordId: string; field: string; value: string; unit: string }> {
  const rows: Array<{
    recordId: string;
    field: string;
    value: string;
    unit: string;
  }> = [];

  flattenScalarRows(family, payload, [], "root", rows);

  return rows;
}

function familyConfig(family: ReportFamilyId): ReportFamilyConfig {
  const config = REPORT_FAMILY_CONFIGS.find((entry) => entry.id === family);

  if (!config) {
    throw new Error(`Unknown report family: ${family}`);
  }

  return config;
}

export function createReportExportCsvRows(bundle: ReportBundle): ReadonlyArray<CsvRow> {
  const rows: CsvRow[] = [];

  for (const familyId of REPORT_EXPORT_FAMILY_IDS) {
    const config = familyConfig(familyId);
    const entry = bundle.families[config.key];

    if (!entry.available || entry.payload === null) {
      continue;
    }

    for (const scalarRow of reportRows(familyId, entry.payload)) {
      rows.push({
        reportFamily: familyId,
        recordId: scalarRow.recordId,
        field: scalarRow.field,
        value: scalarRow.value,
        unit: scalarRow.unit,
        provenanceKind: config.provenanceKind,
        disclaimer: REPORT_EXPORT_FAMILY_DISCLAIMERS[familyId],
        generatedAt: bundle.metadata.generatedAt,
        schemaVersion: bundle.metadata.schemaVersion,
        scenarioId: bundle.metadata.scenarioId,
        replayMode: bundle.metadata.replayMode
      });
    }
  }

  return rows;
}

function quoteCsvCell(value: string): string {
  return `"${value.replace(/"/g, "\"\"")}"`;
}

export function serializeReportBundleCsv(bundle: ReportBundle): string {
  const header = CSV_HEADER.map(quoteCsvCell).join(",");
  const body = createReportExportCsvRows(bundle)
    .map((row) =>
      [
        row.reportFamily,
        row.recordId,
        row.field,
        row.value,
        row.unit,
        row.provenanceKind,
        row.disclaimer,
        row.generatedAt,
        row.schemaVersion,
        row.scenarioId,
        row.replayMode
      ].map(quoteCsvCell).join(",")
    )
    .join("\r\n");

  return body.length > 0 ? `${header}\r\n${body}\r\n` : `${header}\r\n`;
}

export function createReportExportFiles(
  bundle: ReportBundle,
  format: ReportExportFormat
): ReadonlyArray<ReportExportFile> {
  const files: ReportExportFile[] = [];

  if (format === "json" || format === "both") {
    files.push({
      filename: formatReportExportFilename(bundle, "json"),
      mimeType: "application/json;charset=utf-8",
      contents: serializeReportBundleJson(bundle)
    });
  }

  if (format === "csv" || format === "both") {
    files.push({
      filename: formatReportExportFilename(bundle, "csv"),
      mimeType: "text/csv;charset=utf-8",
      contents: serializeReportBundleCsv(bundle)
    });
  }

  return files;
}
