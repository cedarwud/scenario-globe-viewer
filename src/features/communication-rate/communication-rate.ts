import type {
  PhysicalInputActiveWindow,
  PhysicalInputOrbitClass,
  PhysicalInputState,
  ProjectedPhysicalDecisionMetrics
} from "../physical-input/physical-input";

export type CommunicationRateClass =
  | "candidate-capacity-context-class"
  | "continuity-context-class"
  | "guard-context-class";

export type CommunicationRateSourceModule = "physical-input";
export type CommunicationRateSourceField = "networkSpeedMbps";
export type CommunicationRateTruthState =
  "modeled-bounded-class-not-measured";

export type CommunicationRateClassLabel =
  | "Candidate capacity context"
  | "Continuity context"
  | "Guard context";

export interface CommunicationRateWindowRef {
  startRatio: number;
  stopRatio: number;
  contextLabel: string;
}

export interface CommunicationRateClassPoint {
  window: CommunicationRateWindowRef;
  orbitClass: PhysicalInputOrbitClass;
  candidateContextIds: ReadonlyArray<string>;
  classId: CommunicationRateClass;
  label: CommunicationRateClassLabel;
  provenanceKind: "bounded-proxy";
}

export interface CommunicationRateSnapshot {
  scenarioId: string;
  evaluatedAt: string;
  sourceModule: CommunicationRateSourceModule;
  sourceField: CommunicationRateSourceField;
  truthState: CommunicationRateTruthState;
  activeWindow: CommunicationRateWindowRef;
  currentClass: CommunicationRateClass | "unavailable";
  points: ReadonlyArray<CommunicationRateClassPoint>;
  footnote: "Modeled, not measured.";
  numericThroughputDisplayAllowed: false;
}

export const COMMUNICATION_RATE_SOURCE_MODULE: CommunicationRateSourceModule =
  "physical-input";
export const COMMUNICATION_RATE_SOURCE_FIELD: CommunicationRateSourceField =
  "networkSpeedMbps";
export const COMMUNICATION_RATE_TRUTH_STATE: CommunicationRateTruthState =
  "modeled-bounded-class-not-measured";
export const COMMUNICATION_RATE_FOOTNOTE = "Modeled, not measured." as const;
export const COMMUNICATION_RATE_SOURCE_LABEL =
  "Physical-input bounded proxy" as const;

export const COMMUNICATION_RATE_CLASS_LABELS: Record<
  CommunicationRateClass,
  CommunicationRateClassLabel
> = {
  "candidate-capacity-context-class": "Candidate capacity context",
  "continuity-context-class": "Continuity context",
  "guard-context-class": "Guard context"
};

export const COMMUNICATION_RATE_CLASS_ORDER: ReadonlyArray<CommunicationRateClass> = [
  "candidate-capacity-context-class",
  "continuity-context-class",
  "guard-context-class"
];

export const COMMUNICATION_RATE_ORBIT_ORDER: ReadonlyArray<PhysicalInputOrbitClass> = [
  "leo",
  "meo",
  "geo"
];

interface OrbitGroup {
  orbitClass: PhysicalInputOrbitClass;
  bestSourceRank: number;
  candidateContextIds: ReadonlyArray<string>;
  provenanceKind: "bounded-proxy";
}

function cloneWindowRef(
  activeWindow: PhysicalInputActiveWindow
): CommunicationRateWindowRef {
  return {
    startRatio: activeWindow.startRatio,
    stopRatio: activeWindow.stopRatio,
    contextLabel: activeWindow.contextLabel
  };
}

function resolveOrbitSortIndex(orbitClass: PhysicalInputOrbitClass): number {
  const index = COMMUNICATION_RATE_ORBIT_ORDER.indexOf(orbitClass);
  return index === -1 ? COMMUNICATION_RATE_ORBIT_ORDER.length : index;
}

function groupProjectedMetricsByOrbit(
  projectedMetrics: ReadonlyArray<ProjectedPhysicalDecisionMetrics>
): OrbitGroup[] {
  const grouped = new Map<PhysicalInputOrbitClass, ProjectedPhysicalDecisionMetrics[]>();

  for (const candidate of projectedMetrics) {
    if (candidate.provenanceKind !== "bounded-proxy") {
      throw new Error(
        `Communication-rate adapter requires bounded-proxy physical input provenance: ${candidate.candidateId}`
      );
    }

    const existing = grouped.get(candidate.orbitClass) ?? [];
    existing.push(candidate);
    grouped.set(candidate.orbitClass, existing);
  }

  return Array.from(grouped.entries())
    .map(([orbitClass, candidates]) => {
      const bestSourceRank = Math.max(
        ...candidates.map((candidate) => candidate.networkSpeedMbps)
      );

      return {
        orbitClass,
        bestSourceRank,
        candidateContextIds: candidates
          .map((candidate) => candidate.candidateId)
          .sort((left, right) => left.localeCompare(right)),
        provenanceKind: "bounded-proxy" as const
      };
    })
    .sort(
      (left, right) =>
        resolveOrbitSortIndex(left.orbitClass) - resolveOrbitSortIndex(right.orbitClass)
    );
}

function resolveClassByRank(
  rankedGroups: ReadonlyArray<OrbitGroup>,
  group: OrbitGroup
): CommunicationRateClass {
  const index = rankedGroups.findIndex(
    (candidate) => candidate.orbitClass === group.orbitClass
  );

  if (index === 0) {
    return "candidate-capacity-context-class";
  }

  if (index === rankedGroups.length - 1) {
    return "guard-context-class";
  }

  return "continuity-context-class";
}

export function formatCommunicationRateClassLabel(
  classId: CommunicationRateClass
): CommunicationRateClassLabel {
  return COMMUNICATION_RATE_CLASS_LABELS[classId];
}

export function formatCommunicationRateOrbitLabel(
  orbitClass: PhysicalInputOrbitClass
): "LEO" | "MEO" | "GEO" {
  switch (orbitClass) {
    case "leo":
      return "LEO";
    case "meo":
      return "MEO";
    case "geo":
      return "GEO";
  }
}

export function createCommunicationRateSnapshot(
  state: PhysicalInputState
): CommunicationRateSnapshot {
  const activeWindow = cloneWindowRef(state.activeWindow);
  const orbitGroups = groupProjectedMetricsByOrbit(state.projectedMetrics);
  const rankedGroups = [...orbitGroups].sort((left, right) => {
    if (left.bestSourceRank !== right.bestSourceRank) {
      return right.bestSourceRank - left.bestSourceRank;
    }

    return (
      resolveOrbitSortIndex(left.orbitClass) - resolveOrbitSortIndex(right.orbitClass)
    );
  });
  const points = orbitGroups.map((group) => {
    const classId = resolveClassByRank(rankedGroups, group);

    return {
      window: {
        startRatio: activeWindow.startRatio,
        stopRatio: activeWindow.stopRatio,
        contextLabel: activeWindow.contextLabel
      },
      orbitClass: group.orbitClass,
      candidateContextIds: [...group.candidateContextIds],
      classId,
      label: formatCommunicationRateClassLabel(classId),
      provenanceKind: group.provenanceKind
    };
  });
  const leadingGroup = rankedGroups[0];
  const currentClass = leadingGroup
    ? resolveClassByRank(rankedGroups, leadingGroup)
    : "unavailable";

  return {
    scenarioId: state.scenario.id,
    evaluatedAt: state.evaluatedAt,
    sourceModule: COMMUNICATION_RATE_SOURCE_MODULE,
    sourceField: COMMUNICATION_RATE_SOURCE_FIELD,
    truthState: COMMUNICATION_RATE_TRUTH_STATE,
    activeWindow,
    currentClass,
    points,
    footnote: COMMUNICATION_RATE_FOOTNOTE,
    numericThroughputDisplayAllowed: false
  };
}
