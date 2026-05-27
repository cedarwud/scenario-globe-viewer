import {
  evaluateHandoverPolicy,
  type HandoverCandidate,
  type HandoverDecision,
  type HandoverPolicyConfig
} from "../../runtime/link-budget/handover-policy";
import type { OrbitClass } from "./orbit-types";

export type RuntimeHandoverPolicyId = HandoverPolicyConfig["policyId"];
export type {
  HandoverCandidate,
  HandoverDecision as RuntimeHandoverDecision,
  HandoverPolicyConfig
};

export const SELECTED_PAIR_DEMO_HANDOVER_POLICY_ID: RuntimeHandoverPolicyId =
  "demo-balanced-v1";

type RuntimeHandoverPolicyProfile = Omit<
  HandoverPolicyConfig,
  "elevationThresholdDeg"
>;

const DEFAULT_RUNTIME_HANDOVER_POLICY_ID: RuntimeHandoverPolicyId =
  "cross-orbit-live";
const DEMO_BALANCED_MIN_ORBIT_DWELL_MS = 10 * 60_000;
const DEMO_BALANCED_UNUSED_ORBIT_DWELL_MS = 5 * 60_000;
const DEMO_BALANCED_ROTATION_DWELL_MS = 45 * 60_000;

const HANDOVER_POLICY_PROFILES: Readonly<
  Record<RuntimeHandoverPolicyId, RuntimeHandoverPolicyProfile>
> = {
  "cross-orbit-live": {
    policyId: "cross-orbit-live",
    hysteresisDb: 2,
    minVisibilityWindowMs: 60_000,
    latencyBudgetMs: 600
  },
  "leo-first": {
    policyId: "leo-first",
    hysteresisDb: 2,
    minVisibilityWindowMs: 60_000,
    latencyBudgetMs: 600
  },
  "bootstrap-balanced-v1": {
    policyId: "bootstrap-balanced-v1",
    hysteresisDb: 2,
    minVisibilityWindowMs: 60_000,
    latencyBudgetMs: 600
  },
  "demo-balanced-v1": {
    policyId: "demo-balanced-v1",
    hysteresisDb: 2,
    minVisibilityWindowMs: 60_000,
    latencyBudgetMs: 600
  }
};

export function resolveRuntimeHandoverPolicyId(
  value: string | null | undefined
): RuntimeHandoverPolicyId {
  if (
    value === "cross-orbit-live" ||
    value === "leo-first" ||
    value === "bootstrap-balanced-v1" ||
    value === "demo-balanced-v1"
  ) {
    return value;
  }
  return DEFAULT_RUNTIME_HANDOVER_POLICY_ID;
}

export function buildRuntimeHandoverPolicyConfig(
  policyId: RuntimeHandoverPolicyId,
  elevationThresholdDeg: number,
  sampleStepSeconds: number
): HandoverPolicyConfig {
  const profile = HANDOVER_POLICY_PROFILES[policyId];
  return {
    ...profile,
    elevationThresholdDeg,
    minVisibilityWindowMs: Math.max(
      profile.minVisibilityWindowMs,
      sampleStepSeconds * 1000
    )
  };
}

function candidateRemainsVisibleForDemoHold(
  candidate: HandoverCandidate,
  policy: HandoverPolicyConfig
): boolean {
  return (
    candidate.elevationDeg >= policy.elevationThresholdDeg &&
    candidate.predictedVisibilityRemainingMs > 0
  );
}

function selectBestPolicyCandidateForOrbit(
  candidates: ReadonlyArray<HandoverCandidate>,
  orbitClass: OrbitClass,
  currentServingId: string | undefined,
  policy: HandoverPolicyConfig,
  nowUtc: string
): HandoverDecision | null {
  const orbitCandidates = candidates.filter(
    (candidate) =>
      candidate.orbitClass === orbitClass &&
      candidateRemainsVisibleForDemoHold(candidate, policy)
  );
  if (orbitCandidates.length === 0) {
    return null;
  }
  return evaluateHandoverPolicy({
    candidates: orbitCandidates,
    currentServingId,
    policy,
    nowUtc
  });
}

function selectBestPolicyCandidateForOrbitPriority(
  candidates: ReadonlyArray<HandoverCandidate>,
  orbitPriority: ReadonlyArray<OrbitClass>,
  currentServingId: string | undefined,
  policy: HandoverPolicyConfig,
  nowUtc: string
): HandoverDecision | null {
  for (const orbitClass of orbitPriority) {
    const decision = selectBestPolicyCandidateForOrbit(
      candidates,
      orbitClass,
      currentServingId,
      policy,
      nowUtc
    );
    if (decision !== null) {
      return decision;
    }
  }
  return null;
}

function rotateOrbitPriorityAfter(
  availableOrbits: ReadonlyArray<OrbitClass>,
  currentServingOrbit: OrbitClass | undefined
): ReadonlyArray<OrbitClass> {
  if (!currentServingOrbit) {
    return availableOrbits;
  }
  const index = availableOrbits.indexOf(currentServingOrbit);
  if (index === -1) {
    return availableOrbits.filter((orbitClass) => orbitClass !== currentServingOrbit);
  }
  return [
    ...availableOrbits.slice(index + 1),
    ...availableOrbits.slice(0, index)
  ].filter((orbitClass) => orbitClass !== currentServingOrbit);
}

function selectDemoBalancedHandoverDecision(input: {
  readonly candidates: ReadonlyArray<HandoverCandidate>;
  readonly currentServingId: string | undefined;
  readonly currentServingOrbit: OrbitClass | undefined;
  readonly currentOrbitSinceMs: number | null;
  readonly usedActiveOrbits: ReadonlySet<OrbitClass>;
  readonly availableOrbits: ReadonlyArray<OrbitClass>;
  readonly policy: HandoverPolicyConfig;
  readonly sampleTimeMs: number;
  readonly nowUtc: string;
}): HandoverDecision {
  const current = input.currentServingId
    ? input.candidates.find((candidate) => candidate.id === input.currentServingId)
    : undefined;
  const currentDwellMs =
    input.currentOrbitSinceMs === null
      ? Number.POSITIVE_INFINITY
      : input.sampleTimeMs - input.currentOrbitSinceMs;
  const currentIsViable =
    current !== undefined &&
    candidateRemainsVisibleForDemoHold(current, input.policy);

  if (
    !currentIsViable ||
    currentDwellMs >= DEMO_BALANCED_UNUSED_ORBIT_DWELL_MS
  ) {
    for (const orbitClass of input.availableOrbits) {
      if (input.usedActiveOrbits.has(orbitClass)) {
        continue;
      }
      const decision = selectBestPolicyCandidateForOrbit(
        input.candidates,
        orbitClass,
        input.currentServingId,
        input.policy,
        input.nowUtc
      );
      if (decision !== null) {
        return {
          ...decision,
          reasonKind:
            input.currentServingId && orbitClass !== input.currentServingOrbit
              ? "cross-orbit-migration"
              : decision.reasonKind
        };
      }
    }
  }

  if (
    current &&
    currentIsViable &&
    currentDwellMs < DEMO_BALANCED_MIN_ORBIT_DWELL_MS
  ) {
    return {
      selectedId: current.id,
      reasonKind: "policy-tie-break",
      scoreBreakdown: input.candidates.map((candidate) => ({
        candidateId: candidate.id,
        score: candidate.id === current.id ? 1 : 0,
        components: { dwellGuard: candidate.id === current.id ? 1 : 0 }
      }))
    };
  }

  if (
    current &&
    currentIsViable &&
    currentDwellMs >= DEMO_BALANCED_ROTATION_DWELL_MS
  ) {
    const targetOrbitPriority = rotateOrbitPriorityAfter(
      input.availableOrbits,
      input.currentServingOrbit
    );
    const decision = selectBestPolicyCandidateForOrbitPriority(
      input.candidates,
      targetOrbitPriority,
      input.currentServingId,
      input.policy,
      input.nowUtc
    );
    if (decision !== null) {
      const selected = input.candidates.find(
        (candidate) => candidate.id === decision.selectedId
      );
      return {
        ...decision,
        reasonKind:
          input.currentServingId &&
          selected &&
          selected.orbitClass !== input.currentServingOrbit
            ? "cross-orbit-migration"
            : decision.reasonKind
      };
    }
  }

  if (current && currentIsViable) {
    return {
      selectedId: current.id,
      reasonKind: "policy-tie-break",
      scoreBreakdown: input.candidates.map((candidate) => ({
        candidateId: candidate.id,
        score: candidate.id === current.id ? 1 : 0,
        components: { stableServing: candidate.id === current.id ? 1 : 0 }
      }))
    };
  }

  return evaluateHandoverPolicy({
    candidates: input.candidates,
    currentServingId: input.currentServingId,
    policy: input.policy,
    nowUtc: input.nowUtc
  });
}

export function selectRuntimeHandoverDecision(input: {
  readonly candidates: ReadonlyArray<HandoverCandidate>;
  readonly currentServingId: string | undefined;
  readonly currentServingOrbit: OrbitClass | undefined;
  readonly currentOrbitSinceMs: number | null;
  readonly usedActiveOrbits: ReadonlySet<OrbitClass>;
  readonly availableOrbits: ReadonlyArray<OrbitClass>;
  readonly policy: HandoverPolicyConfig;
  readonly sampleTimeMs: number;
  readonly nowUtc: string;
}): HandoverDecision {
  if (input.policy.policyId === SELECTED_PAIR_DEMO_HANDOVER_POLICY_ID) {
    return selectDemoBalancedHandoverDecision(input);
  }

  return evaluateHandoverPolicy({
    candidates: input.candidates,
    currentServingId: input.currentServingId,
    policy: input.policy,
    nowUtc: input.nowUtc
  });
}
