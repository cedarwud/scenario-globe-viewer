export const VALIDATION_STATE_REPORT_SCHEMA_VERSION =
  "phase6.6-bootstrap-validation-state-report.v1";
export const VALIDATION_STATE_PROVENANCE_NOTE =
  "Bounded proxy validation-state source; not a live external validation dependency.";
export const VALIDATION_STATE_PROVENANCE_DETAIL =
  "Scenario-bounded validation state materialized from repo-owned mode definitions plus evaluated time and serving-candidate context; external NAT/tunnel/bridge behavior remains outside this repo.";

export type ValidationEnvironmentMode =
  | "linux-direct"
  | "windows-wsl-tunnel"
  | "inet-nat-bridge";
export type ValidationTransportKind = "direct" | "tunnel" | "nat-bridge";
export type ValidationDutKind = "virtual" | "physical";
export type ValidationAttachState = "detached" | "attached" | "bridged";
export type ValidationProvenanceKind = "bounded-proxy";

export interface ValidationProvenance {
  kind: ValidationProvenanceKind;
  label: string;
  detail: string;
}

export interface ValidationStateInput {
  scenarioId: string;
  evaluatedAt: string;
  environmentMode: ValidationEnvironmentMode;
  transportKind: ValidationTransportKind;
  dutKind: ValidationDutKind;
  attachState: ValidationAttachState;
  servingCandidateId?: string;
  provenance: ValidationProvenance;
}

export interface ValidationStateReport {
  schemaVersion: typeof VALIDATION_STATE_REPORT_SCHEMA_VERSION;
  scenarioId: string;
  evaluatedAt: string;
  environmentMode: ValidationEnvironmentMode;
  transportKind: ValidationTransportKind;
  dutKind: ValidationDutKind;
  attachState: ValidationAttachState;
  servingCandidateId?: string;
  ownershipNote: string;
  provenance: ValidationProvenance;
}

export interface ValidationState extends ValidationStateReport {
  report: ValidationStateReport;
}

export interface ValidationStateOptions extends ValidationStateInput {
  ownershipNote?: string;
}

const ENVIRONMENT_TRANSPORT_MAP: Record<
  ValidationEnvironmentMode,
  ValidationTransportKind
> = {
  "linux-direct": "direct",
  "windows-wsl-tunnel": "tunnel",
  "inet-nat-bridge": "nat-bridge"
};

const ENVIRONMENT_MODE_LABELS: Record<ValidationEnvironmentMode, string> = {
  "linux-direct": "Linux direct",
  "windows-wsl-tunnel": "Windows / WSL tunnel",
  "inet-nat-bridge": "INET NAT bridge"
};

const TRANSPORT_KIND_LABELS: Record<ValidationTransportKind, string> = {
  direct: "Direct",
  tunnel: "Tunnel",
  "nat-bridge": "NAT bridge"
};

const DUT_KIND_LABELS: Record<ValidationDutKind, string> = {
  virtual: "Virtual DUT",
  physical: "Physical DUT"
};

const ATTACH_STATE_LABELS: Record<ValidationAttachState, string> = {
  detached: "Detached",
  attached: "Attached",
  bridged: "Bridged"
};

function cloneValidationProvenance(
  provenance: ValidationProvenance
): ValidationProvenance {
  return {
    kind: provenance.kind,
    label: provenance.label,
    detail: provenance.detail
  };
}

function assertValidationTimestamp(value: string): void {
  const epochMs = Date.parse(value);

  if (!Number.isFinite(epochMs)) {
    throw new Error(`Validation-state timestamp must parse: ${value}`);
  }
}

function assertEnvironmentTransportPair(
  environmentMode: ValidationEnvironmentMode,
  transportKind: ValidationTransportKind
): void {
  const expectedTransport = ENVIRONMENT_TRANSPORT_MAP[environmentMode];

  if (transportKind !== expectedTransport) {
    throw new Error(
      `Validation environment ${environmentMode} must use transport ${expectedTransport}, received ${transportKind}.`
    );
  }
}

export function resolveValidationOwnershipNote(
  environmentMode: ValidationEnvironmentMode
): string {
  switch (environmentMode) {
    case "linux-direct":
      return "Viewer repo owns the linux-direct mode name, validation boundary state/report projection, and HUD readout; external validation stack owns Linux interface setup, namespace/process lifecycle, and real traffic.";
    case "windows-wsl-tunnel":
      return "Viewer repo owns the windows-wsl-tunnel mode name, validation boundary state/report projection, and HUD readout; external validation stack owns tunnel establishment, Windows/WSL routing, interface/IP config, and real traffic.";
    case "inet-nat-bridge":
      return "Viewer repo owns the inet-nat-bridge mode name, validation boundary state/report projection, and HUD readout; external validation stack owns INET/ESTNeT bridge topology, NAT rules, process lifecycle, interface/IP config, and real traffic.";
  }
}

export function createValidationState({
  scenarioId,
  evaluatedAt,
  environmentMode,
  transportKind,
  dutKind,
  attachState,
  servingCandidateId,
  provenance,
  ownershipNote = resolveValidationOwnershipNote(environmentMode)
}: ValidationStateOptions): ValidationState {
  if (!scenarioId) {
    throw new Error("Validation-state input must include a scenarioId.");
  }

  assertValidationTimestamp(evaluatedAt);
  assertEnvironmentTransportPair(environmentMode, transportKind);

  if (servingCandidateId !== undefined && servingCandidateId.length === 0) {
    throw new Error(
      "Validation-state servingCandidateId must be omitted or non-empty."
    );
  }

  if (attachState === "detached" && servingCandidateId) {
    throw new Error(
      "Validation-state detached mode must not claim an active serving candidate."
    );
  }

  const report: ValidationStateReport = {
    schemaVersion: VALIDATION_STATE_REPORT_SCHEMA_VERSION,
    scenarioId,
    evaluatedAt,
    environmentMode,
    transportKind,
    dutKind,
    attachState,
    ...(servingCandidateId ? { servingCandidateId } : {}),
    ownershipNote,
    provenance: cloneValidationProvenance(provenance)
  };

  return {
    ...report,
    report: {
      ...report,
      provenance: cloneValidationProvenance(report.provenance)
    }
  };
}

export function formatValidationEnvironmentModeLabel(
  environmentMode: ValidationEnvironmentMode
): string {
  return ENVIRONMENT_MODE_LABELS[environmentMode];
}

export function formatValidationTransportKindLabel(
  transportKind: ValidationTransportKind
): string {
  return TRANSPORT_KIND_LABELS[transportKind];
}

export function formatValidationDutKindLabel(dutKind: ValidationDutKind): string {
  return DUT_KIND_LABELS[dutKind];
}

export function formatValidationAttachStateLabel(
  attachState: ValidationAttachState
): string {
  return ATTACH_STATE_LABELS[attachState];
}

