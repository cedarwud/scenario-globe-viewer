import {
  HANDOVER_DECISION_PROXY_PROVENANCE,
  type HandoverCandidateMetrics,
  type HandoverDecisionSnapshot
} from "../features/handover-decision/handover-decision";
import {
  createBootstrapPhysicalInputSourceCatalog,
  resolveBootstrapPhysicalProjectedMetrics,
  type BootstrapPhysicalInputSourceCatalog,
} from "./bootstrap-physical-input-source";
import type { BootstrapScenarioDefinition } from "./scenario-bootstrap-session";

export const BOOTSTRAP_HANDOVER_POLICY_ID = "bootstrap-balanced-v1";
export const BOOTSTRAP_HANDOVER_UNSUPPORTED_POLICY_ID =
  "bootstrap-unsupported-scenario-noop-v1";
const INTERNAL_PHYSICAL_CATALOG_KEY = "__physicalInputCatalog";

export interface BootstrapProxyHandoverDecisionSourceEntry {
  scenarioId: string;
  policyId: string;
  initialServingCandidateId?: string;
}

export interface BootstrapProxyHandoverDecisionSourceCatalog {
  entries: ReadonlyArray<BootstrapProxyHandoverDecisionSourceEntry>;
}

interface InternalBootstrapProxyHandoverDecisionSourceCatalog
  extends BootstrapProxyHandoverDecisionSourceCatalog {
  [INTERNAL_PHYSICAL_CATALOG_KEY]: BootstrapPhysicalInputSourceCatalog;
}

function findBootstrapProxyHandoverDecisionSourceEntry(
  catalog: BootstrapProxyHandoverDecisionSourceCatalog,
  scenarioId: string
): BootstrapProxyHandoverDecisionSourceEntry | undefined {
  return catalog.entries.find((candidate) => candidate.scenarioId === scenarioId);
}

function toHandoverCandidateMetrics(
  projectedMetrics: ReturnType<typeof resolveBootstrapPhysicalProjectedMetrics>
): HandoverCandidateMetrics[] {
  return projectedMetrics.map((candidate) => ({
    candidateId: candidate.candidateId,
    orbitClass: candidate.orbitClass,
    latencyMs: candidate.latencyMs,
    jitterMs: candidate.jitterMs,
    networkSpeedMbps: candidate.networkSpeedMbps,
    provenance: HANDOVER_DECISION_PROXY_PROVENANCE
  }));
}

function assertInternalPhysicalCatalog(
  catalog: BootstrapProxyHandoverDecisionSourceCatalog
): BootstrapPhysicalInputSourceCatalog {
  const internalCatalog = catalog as InternalBootstrapProxyHandoverDecisionSourceCatalog;
  const physicalCatalog = internalCatalog[INTERNAL_PHYSICAL_CATALOG_KEY];

  if (!physicalCatalog) {
    throw new Error(
      "Bootstrap handover decision source catalog is missing its internal physical-input catalog."
    );
  }

  return physicalCatalog;
}

export function createBootstrapProxyHandoverDecisionSourceCatalog(
  definitions: ReadonlyArray<BootstrapScenarioDefinition>
): BootstrapProxyHandoverDecisionSourceCatalog {
  const physicalCatalog = createBootstrapPhysicalInputSourceCatalog(definitions);

  return {
    entries: physicalCatalog.entries.map((entry) => ({
      scenarioId: entry.scenarioId,
      policyId: BOOTSTRAP_HANDOVER_POLICY_ID,
      initialServingCandidateId: entry.windows[0]?.candidates[0]?.candidateId
    })),
    [INTERNAL_PHYSICAL_CATALOG_KEY]: physicalCatalog
  } as InternalBootstrapProxyHandoverDecisionSourceCatalog;
}

export function resolveBootstrapProxyHandoverDecisionSourceEntry(
  catalog: BootstrapProxyHandoverDecisionSourceCatalog,
  scenarioId: string
): BootstrapProxyHandoverDecisionSourceEntry {
  const entry = findBootstrapProxyHandoverDecisionSourceEntry(catalog, scenarioId);

  if (!entry) {
    throw new Error(
      `Missing bootstrap handover decision source for scenario: ${scenarioId}`
    );
  }

  return {
    scenarioId: entry.scenarioId,
    policyId: entry.policyId,
    ...(entry.initialServingCandidateId
      ? { initialServingCandidateId: entry.initialServingCandidateId }
      : {})
  };
}

function createUnsupportedBootstrapProxyHandoverDecisionSnapshot(options: {
  scenarioId: string;
  evaluatedAt: string;
  activeRange: {
    start: string;
    stop: string;
  };
}): HandoverDecisionSnapshot {
  // Keep non-bootstrap scenario ids explicit and empty rather than pretending
  // they belong to the bootstrap handover policy/catalog.
  return {
    scenarioId: options.scenarioId,
    evaluatedAt: options.evaluatedAt,
    activeRange: {
      start: options.activeRange.start,
      stop: options.activeRange.stop
    },
    policyId: BOOTSTRAP_HANDOVER_UNSUPPORTED_POLICY_ID,
    candidates: []
  };
}

export function resolveBootstrapProxyHandoverDecisionSnapshot(
  catalog: BootstrapProxyHandoverDecisionSourceCatalog,
  options: {
    scenarioId: string;
    evaluatedAt: string;
    activeRange: {
      start: string;
      stop: string;
    };
    currentServingCandidateId?: string;
  }
): HandoverDecisionSnapshot {
  const entry = findBootstrapProxyHandoverDecisionSourceEntry(
    catalog,
    options.scenarioId
  );

  if (!entry) {
    return createUnsupportedBootstrapProxyHandoverDecisionSnapshot(options);
  }

  const projectedMetrics = resolveBootstrapPhysicalProjectedMetrics(
    assertInternalPhysicalCatalog(catalog),
    {
      scenarioId: entry.scenarioId,
      scenarioLabel: entry.scenarioId,
      evaluatedAt: options.evaluatedAt,
      activeRange: {
        start: options.activeRange.start,
        stop: options.activeRange.stop
      }
    }
  );

  return {
    scenarioId: entry.scenarioId,
    evaluatedAt: options.evaluatedAt,
    activeRange: {
      start: options.activeRange.start,
      stop: options.activeRange.stop
    },
    ...(options.currentServingCandidateId ?? entry.initialServingCandidateId
      ? {
          currentServingCandidateId:
            options.currentServingCandidateId ?? entry.initialServingCandidateId
        }
      : {}),
    policyId: entry.policyId,
    candidates: toHandoverCandidateMetrics(projectedMetrics)
  };
}
