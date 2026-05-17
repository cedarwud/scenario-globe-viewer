// 3GPP TR 38.821 section 7.3 handover trigger metrics
// User verbal addendum V-MO1 cross-orbit LIVE handover
// Local PDF: paper-catalog/3gpp/38821-g20.pdf
// Refines requirement K-A1
// Pure TypeScript policy evaluation for deterministic candidate selection.

export interface HandoverCandidate {
  id: string; orbitClass: 'LEO' | 'MEO' | 'GEO'; elevationDeg: number; rsrpDbm: number;
  predictedVisibilityRemainingMs: number; latencyMs: number; jitterMs: number;
}

export interface HandoverPolicyConfig {
  policyId: 'bootstrap-balanced-v1' | 'leo-first' | 'cross-orbit-live';
  elevationThresholdDeg: number; hysteresisDb: number; minVisibilityWindowMs: number;
  latencyBudgetMs?: number;
}

export interface HandoverDecision {
  selectedId: string;
  reasonKind: 'current-link-unavailable' | 'better-candidate-available' | 'policy-tie-break' | 'cross-orbit-migration';
  scoreBreakdown: ReadonlyArray<{ candidateId: string; score: number; components: Readonly<Record<string, number>> }>;
}

type Orbit = HandoverCandidate['orbitClass'];
type Scored = Readonly<{ candidate: HandoverCandidate; score: number; components: Readonly<Record<string, number>>; clearsThresholds: boolean }>;
type Selection = Readonly<{ selected: Scored; reasonKind: HandoverDecision['reasonKind'] }>;

const ORBITS: ReadonlyArray<Orbit> = ['LEO', 'MEO', 'GEO'];
const POLICIES: ReadonlyArray<HandoverPolicyConfig['policyId']> = ['bootstrap-balanced-v1', 'leo-first', 'cross-orbit-live'];
const DEFAULT_VISIBILITY_SCALE_MS = 60_000;
const DEFAULT_LATENCY_SCALE_MS = 600;
const DEFAULT_JITTER_SCALE_MS = 100;
const EPSILON = 0.000_001;

export function evaluateHandoverPolicy(input: {
  candidates: ReadonlyArray<HandoverCandidate>;
  currentServingId?: string;
  policy: HandoverPolicyConfig;
  nowUtc?: string;
}): HandoverDecision {
  validateInput(input);
  const scored = input.candidates.map((candidate) => scoreCandidate(candidate, input.policy));
  const current = input.currentServingId === undefined
    ? undefined
    : scored.find((entry) => entry.candidate.id === input.currentServingId);
  const { selected, reasonKind } = selectCandidate(scored, current, input.policy);

  return {
    selectedId: selected.candidate.id,
    reasonKind,
    scoreBreakdown: scored.map((entry) => ({
      candidateId: entry.candidate.id,
      score: entry.score,
      components: entry.components,
    })),
  };
}

function selectCandidate(scored: ReadonlyArray<Scored>, current: Scored | undefined, policy: HandoverPolicyConfig): Selection {
  if (policy.policyId === 'leo-first') return selectLeoFirst(scored, current, policy);
  if (policy.policyId === 'cross-orbit-live') return selectCrossOrbitLive(scored, current, policy);
  return selectWithCurrentGate(bestFrom(thresholdPool(scored)), current, policy);
}

function selectLeoFirst(scored: ReadonlyArray<Scored>, current: Scored | undefined, policy: HandoverPolicyConfig): Selection {
  return selectWithCurrentGate(bestByOrbitPriority(thresholdPool(scored), ORBITS) ?? bestFrom(scored), current, policy);
}

function selectCrossOrbitLive(scored: ReadonlyArray<Scored>, current: Scored | undefined, policy: HandoverPolicyConfig): Selection {
  const leoClears = scored.some((entry) => entry.candidate.orbitClass === 'LEO' && entry.clearsThresholds);

  if (current?.candidate.orbitClass === 'LEO' && current.candidate.elevationDeg < policy.elevationThresholdDeg && !leoClears) {
    const target = bestByOrbitPriority(thresholdPool(scored), ['MEO', 'GEO']);
    if (target !== undefined && passesHysteresis(current, target, policy.hysteresisDb)) {
      return { selected: target, reasonKind: 'cross-orbit-migration' };
    }
    if (target !== undefined) return { selected: current, reasonKind: 'policy-tie-break' };
  }

  return selectWithCurrentGate(bestFrom(thresholdPool(scored)), current, policy);
}

function selectWithCurrentGate(target: Scored, current: Scored | undefined, policy: HandoverPolicyConfig): Selection {
  if (current === undefined || !current.clearsThresholds) return { selected: target, reasonKind: 'current-link-unavailable' };
  if (target.candidate.id === current.candidate.id) return { selected: current, reasonKind: 'policy-tie-break' };
  return passesHysteresis(current, target, policy.hysteresisDb)
    ? { selected: target, reasonKind: 'better-candidate-available' }
    : { selected: current, reasonKind: 'policy-tie-break' };
}

function scoreCandidate(candidate: HandoverCandidate, policy: HandoverPolicyConfig): Scored {
  // Sanity: LEO 25 deg current vs LEO 60 deg candidate switches when the RSRP gate clears.
  const visibilityScale = Math.max(policy.minVisibilityWindowMs * 2, DEFAULT_VISIBILITY_SCALE_MS);
  const latencyScale = policy.latencyBudgetMs !== undefined && policy.latencyBudgetMs > 0
    ? policy.latencyBudgetMs
    : DEFAULT_LATENCY_SCALE_MS;
  const components = {
    elevation: round(clamp(candidate.elevationDeg / 90)),
    visibility: round(clamp(candidate.predictedVisibilityRemainingMs / visibilityScale)),
    latency: round(clamp(1 - candidate.latencyMs / latencyScale)),
    jitter: round(clamp(1 - candidate.jitterMs / DEFAULT_JITTER_SCALE_MS)),
  };
  const score = round(components.elevation * 0.38 + components.visibility * 0.28 + components.latency * 0.24 + components.jitter * 0.1);
  return { candidate, score, components, clearsThresholds: clearsThresholds(candidate, policy) };
}

function clearsThresholds(candidate: HandoverCandidate, policy: HandoverPolicyConfig): boolean {
  // Sanity: all LEO below 10 deg with MEO at 30 deg can produce cross-orbit-migration.
  return candidate.elevationDeg >= policy.elevationThresholdDeg &&
    candidate.predictedVisibilityRemainingMs >= policy.minVisibilityWindowMs &&
    (policy.latencyBudgetMs === undefined || candidate.latencyMs <= policy.latencyBudgetMs);
}

function thresholdPool(scored: ReadonlyArray<Scored>): ReadonlyArray<Scored> {
  const passing = scored.filter((entry) => entry.clearsThresholds);
  return passing.length > 0 ? passing : scored;
}

function bestByOrbitPriority(scored: ReadonlyArray<Scored>, orbitPriority: ReadonlyArray<Orbit>): Scored | undefined {
  for (const orbitClass of orbitPriority) {
    const pool = scored.filter((entry) => entry.candidate.orbitClass === orbitClass);
    if (pool.length > 0) return bestFrom(pool);
  }
  return undefined;
}

function bestFrom(scored: ReadonlyArray<Scored>): Scored {
  return scored.reduce((best, entry) => (isBetterCandidate(entry, best) ? entry : best));
}

function isBetterCandidate(a: Scored, b: Scored): boolean {
  const deltas = [
    a.score - b.score,
    a.candidate.rsrpDbm - b.candidate.rsrpDbm,
    a.candidate.elevationDeg - b.candidate.elevationDeg,
    a.candidate.predictedVisibilityRemainingMs - b.candidate.predictedVisibilityRemainingMs,
    b.candidate.latencyMs - a.candidate.latencyMs,
    b.candidate.jitterMs - a.candidate.jitterMs,
  ];
  const first = deltas.find((delta) => Math.abs(delta) > EPSILON);
  return first === undefined ? a.candidate.id < b.candidate.id : first > 0;
}

function passesHysteresis(current: Scored, target: Scored, hysteresisDb: number): boolean {
  return target.candidate.rsrpDbm >= current.candidate.rsrpDbm + hysteresisDb;
}

function validateInput(input: Parameters<typeof evaluateHandoverPolicy>[0]): void {
  if (!Array.isArray(input.candidates) || input.candidates.length === 0) {
    throw new RangeError('candidates must contain at least one entry.');
  }
  input.candidates.forEach(validateCandidate);
  validatePolicy(input.policy);
  if (input.currentServingId !== undefined && input.currentServingId.trim() === '') {
    throw new RangeError('currentServingId must be a non-empty string when provided.');
  }
  if (input.nowUtc !== undefined && Number.isNaN(Date.parse(input.nowUtc))) {
    throw new RangeError('nowUtc must be parseable as a UTC date-time when provided.');
  }
}

function validateCandidate(candidate: HandoverCandidate, index: number): void {
  if (candidate.id.trim() === '') throw new RangeError(`candidates[${index}].id must be a non-empty string.`);
  if (!ORBITS.includes(candidate.orbitClass)) throw new RangeError(`candidates[${index}].orbitClass is not supported.`);
  assertFiniteInRange(candidate.elevationDeg, `candidates[${index}].elevationDeg`, -90, 90);
  assertFinite(candidate.rsrpDbm, `candidates[${index}].rsrpDbm`);
  for (const [field, value] of [
    ['predictedVisibilityRemainingMs', candidate.predictedVisibilityRemainingMs],
    ['latencyMs', candidate.latencyMs],
    ['jitterMs', candidate.jitterMs],
  ] as const) {
    assertNonNegativeFinite(value, `candidates[${index}].${field}`);
  }
}

function validatePolicy(policy: HandoverPolicyConfig): void {
  if (!POLICIES.includes(policy.policyId)) throw new RangeError('policy.policyId is not supported.');
  assertFiniteInRange(policy.elevationThresholdDeg, 'policy.elevationThresholdDeg', -90, 90);
  assertNonNegativeFinite(policy.hysteresisDb, 'policy.hysteresisDb');
  assertNonNegativeFinite(policy.minVisibilityWindowMs, 'policy.minVisibilityWindowMs');
  if (policy.latencyBudgetMs !== undefined) assertNonNegativeFinite(policy.latencyBudgetMs, 'policy.latencyBudgetMs');
}

function assertFinite(value: number, fieldName: string): void {
  if (!Number.isFinite(value)) throw new RangeError(`${fieldName} must be finite.`);
}

function assertNonNegativeFinite(value: number, fieldName: string): void {
  if (!Number.isFinite(value) || value < 0) throw new RangeError(`${fieldName} must be a finite non-negative number.`);
}

function assertFiniteInRange(value: number, fieldName: string, minInclusive: number, maxInclusive: number): void {
  if (!Number.isFinite(value) || value < minInclusive || value > maxInclusive) {
    throw new RangeError(`${fieldName} must be finite and between ${minInclusive} and ${maxInclusive}.`);
  }
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function round(value: number): number {
  return Number(value.toFixed(6));
}
