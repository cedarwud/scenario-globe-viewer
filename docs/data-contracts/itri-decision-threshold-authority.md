# customer F-12 Decision Threshold Authority Data Contract

Date: 2026-05-13

Status: docs-only authority/data contract for a future F-12 threshold and rule
authority package. This document does not create runtime implementation, tests,
package files, retained output evidence, fixture JSON files, or measured
decision evidence.

Related roadmap:
[../sdd/itri-requirement-completion-roadmap.md](../sdd/itri-requirement-completion-roadmap.md).

Related plans and contracts:

- [itri-measured-traffic-package.md](./itri-measured-traffic-package.md)
- [itri-synthetic-fallback-fixtures.md](./itri-synthetic-fallback-fixtures.md)
- [../sdd/m8a-v4.12-f10-impl-phase1-policy-spec.md](../sdd/m8a-v4.12-f10-impl-phase1-policy-spec.md)
- [../sdd/m8a-v4.12-f11-impl-phase1-rule-config-spec.md](../sdd/m8a-v4.12-f11-impl-phase1-rule-config-spec.md)
- [../sdd/itri-f07-f09-measured-traffic-evidence-package-plan.md](../sdd/itri-f07-f09-measured-traffic-evidence-package-plan.md)
- [../sdd/phase-6-plus-requirement-centered-plan.md](../sdd/phase-6-plus-requirement-centered-plan.md)

## Purpose

This contract defines the authority package shape required before F-12 can be
reviewed as an externally authorized threshold/rule lane instead of only the
existing bounded repo-owned proxy decision lane.

The contract is an intake and review boundary only. It defines metadata,
measured-field mapping, rule semantics, threshold authority fields, reviewer
states, and nonclaims for a future package that may map retained F-07/F-08/F-09
measured traffic fields into F-12 decision inputs.

It does not assert that any such package has arrived, that thresholds have been
approved, or that measured decision behavior exists.

## Authority Boundary

The roadmap classifies F-12 as already bounded for the repo-owned deterministic
proxy decision seam. That bounded seam is separate from a future measured and
authority-backed F-12 lane.

Authority ordering:

1. Tier 1 customer, lab, testbed, or owner-approved threshold/rule packages may
   support an F-12 authority review only for the exact retained scope.
2. Retained F-07/F-08/F-09 measured traffic packages may supply measured
   latency, jitter, loss, throughput, network-speed, continuity, and
   handover-window context only when their raw artifacts and reviewer states are
   valid for the referenced fields.
3. Public method/context sources may inform vocabulary and field naming, but
   they do not define customer thresholds or operator rule policy.
4. S11 synthetic fallback material may rehearse schema or negative gaps only.

This document must not be used to infer authority rules from:

- the existing bounded proxy `HandoverPolicyDescriptor` variants;
- the F-11 `HandoverRuleConfig` bounded-proxy editor;
- modeled route windows, modeled speed classes, or deterministic candidate
  metrics;
- synthetic fallback rows;
- public standards or method/context text without an explicit customer or owner
  approval record.

## Bounded Proxy Separation

The current repo-owned F-12 implementation remains a deterministic proxy lane.
It may continue to use bounded inputs, policy weights, tie-break order,
hysteresis-like modeled margins, and session-local rule configuration as
defined by the F-10 and F-11 specs.

The future authority lane defined here is separate:

| Surface | Owner | Inputs | Allowed claim |
| --- | --- | --- | --- |
| Bounded proxy F-12 | Repo implementation | Modeled latency, jitter, and network-speed-style candidate fields, plus session-local policy/rule config. | Deterministic proxy decision behavior and explainable ranking. |
| Measured/authority F-12 | External threshold/rule owner plus reviewer | Retained measured package refs, accepted field mapping, threshold authority, rule semantics, and approval records. | Authority package readiness or authority-backed rule review for the retained scope only. |

No importer or reviewer may merge these surfaces by default. A measured F-12
authority package must name the measured package refs and authority rule refs it
uses. A bounded proxy report is not a measured authority input unless an
authority package explicitly approves a mapping from that report field to an
F-12 rule input.

## Authority Package Metadata

Every future F-12 authority package or manifest must carry these package-level
fields:

| Field | Required rule |
| --- | --- |
| `schemaVersion` | Must identify this contract, for example `itri.f12.decision-threshold-authority.v1`. |
| `authorityId` | Stable authority package identifier. It must be unique across F-12 authority packages. |
| `owner` | Person, role, organization, lab, or requirement owner authorized to submit the package. |
| `receivedAt` | ISO-8601 timestamp when the package was received into review. |
| `thresholdVersion` | Version, memo ID, document ID, or approval record for the threshold set. |
| `ruleVersion` | Version, memo ID, document ID, or approval record for the decision-rule semantics. |
| `reviewer` | Reviewer object with name or role, organization when retained, review scope, and review timestamp. |
| `redactionPolicy` | Policy object naming redaction owner, policy id/version, redacted categories, and auditability effect. |
| `useNotes` | Human-readable notes for permitted use, distribution limits, scope limitations, and package handling. |
| `coveredRequirements` | Must include `F-12`. May reference F-07/F-08/F-09 only as measured input sources, not as F-12 closure by themselves. |
| `measuredPackageRefs` | References to retained F-07/F-08/F-09 measured packages and per-requirement reviewer records used by the decision rules. |
| `thresholdAuthority` | Threshold authority fields defined below. |
| `decisionRules` | Rule semantics records defined below. |
| `reviewerState` | One of the F-12 reviewer states defined below. |
| `syntheticFallbackBoundary` | S11 boundary object defined below. |
| `nonClaims` | Machine-readable nonclaim object defined below. |

`redactionPolicy` and `useNotes` must preserve enough context for review. If
redaction removes owner identity, threshold version, rule version, measured
package linkage, sample-window basis, or approval records, the reviewer state
cannot be `authority-ready`.

## Covered Inputs

An F-12 authority package may cover these decision inputs only when each input
has an accepted source mapping and sample-window basis:

| F-12 input | Required source basis |
| --- | --- |
| `latency` | Retained F-07/F-08 RTT or owner-approved timing metric, including aggregation method and raw refs. |
| `jitter` | Retained F-08 jitter metric from UDP `iperf3`, approved traffic-generator output, or owner-approved timing log. |
| `loss` | Retained packet-loss metric from F-08/F-09 or owner-approved traffic source. |
| `throughput` | Retained F-09 throughput intervals or approved traffic-generator throughput output. |
| `networkSpeed` | Owner-approved normalized decision input derived from retained throughput or an approved equivalent. The normalization method must be named. |
| `continuity` | Owner-approved continuity metric tied to retained packet loss, outage, or event-window evidence. |
| `handoverWindow` | Event-window context with pre-event, event, and post-event time bounds, timezone, and source refs. |
| `measuredPackageRefs` | Package, artifact, parsed metric, reviewer verdict, and threshold refs from the F-07/F-08/F-09 measured package contract. |

Inputs are not interchangeable by name. For example, a modeled
`networkSpeedMbps` value from the bounded proxy lane is not an F-09 measured
throughput input. A reviewer must reject or mark pending any package that
substitutes modeled values for retained measured package fields without an
explicit authority mapping.

## Measured Field Mapping

Each measured input mapping must link back to the F-07/F-08/F-09 package schema
and identify the raw artifact refs behind the parsed value.

| F-12 field | F-07/F-08/F-09 package source | Mapping rule |
| --- | --- | --- |
| `latency.rttMs` | `parsedMetrics[].rttDistributionMs` plus `artifactRefs.pingLogs[]` or approved timing log refs. | Select the owner-approved aggregate such as avg, median, p95, p99, max, or a custom aggregate. Record comparator direction and units. |
| `jitter.jitterMs` | `parsedMetrics[].jitter` plus UDP `iperf3`, traffic-generator, or owner-approved log refs. | Record `jitterSource`, method notes, aggregation, and whether jitter is required, optional, or forbidden for the rule. |
| `loss.lossPct` | `parsedMetrics[].loss` or throughput interval loss fields plus raw refs. | Record packet basis, total/lost counts, excluded rows, and whether TCP retransmits may substitute for packet loss. |
| `throughput.bitsPerSecond` | `parsedMetrics[].throughputIntervals[]` plus `artifactRefs.iperf3ClientLogs[]`, server logs, or traffic-generator outputs. | Record interval selection, direction, protocol, stream count, and aggregation. |
| `networkSpeed.normalized` | Authority-approved transformation from retained throughput or equivalent measured source. | Record transformation owner, version, input fields, unit conversion, clamp rules if any, and whether higher values are better. |
| `continuity.outageOrLoss` | F-07/F-08/F-09 handover continuity plan fields, retained `handover-events.json`, ping logs, loss fields, and command timestamps. | Record event refs, window alignment, outage/loss basis, timezone, and raw refs. If the retained package lacks explicit continuity fields, state `pending-measured-fields`. |
| `handoverWindow` | `artifactRefs.commandsTranscript`, topology refs, clock sync notes, and package-relative event refs. | Record pre-event, event, and post-event window bounds, time source, max known skew, and reviewer notes. |

The mapping must be per rule or per rule group. A global "use measured
traffic" statement is insufficient because F-12 decisions depend on
direction, sample window, candidate set, and metric aggregation.

For `authority-ready`, `measuredPackageRefs[].parsedMetricRefs` and
`measuredPackageRefs[].thresholdRuleRefs` are exhaustive gates. Every listed ref
must be covered by a sufficient per-requirement F-07R1 review for the referenced
measured package; a reviewed ref in the same array must not mask an unreviewed
ref. Each `decisionRules[].measuredFieldRef` must also be covered by a
sufficient F-07R1 requirement review for the rule input. In this reviewer
slice, `throughput` and `networkSpeed` rules that reference an F-09 throughput
metric require F-09 measured review coverage; omitting F-09 from
`measuredPackageRefs[].requirementIds` fails closed.

## Threshold Authority Fields

Threshold authority is external to parser code and external to bounded proxy
defaults. Every future authority package must include:

| Field | Required rule |
| --- | --- |
| `thresholdAuthority.owner` | Person, role, organization, lab, or requirement owner authorized to define thresholds. |
| `thresholdAuthority.version` | Threshold set version, memo ID, document ID, or approval record. |
| `thresholdAuthority.approvalRecord` | Approval metadata with approver, approvedAt timestamp when available, scope, and retained refs. |
| `thresholdAuthority.requirementScope` | Exact scope, such as F-12 only, named scenario, route, topology, endpoint pair, traffic direction, orbit class set, or measured package set. |
| `thresholdAuthority.effectiveDate` | ISO-8601 date or timestamp from which the threshold set applies. Use `null` only with reviewer notes. |
| `thresholdAuthority.supersessionPolicy` | Rule for replacing, expiring, or coexisting with prior threshold versions. |
| `thresholdAuthority.redactionUseNotes` | Notes explaining redacted threshold content, permitted use, and auditability effects. |
| `thresholdAuthority.unresolvedState` | `none`, `owner-missing`, `version-missing`, `approval-missing`, `scope-mismatch`, `effective-date-missing`, `supersession-missing`, or `pending-review`. |
| `thresholdAuthority.unresolvedNotes` | Required when unresolved state is not `none`. |

An F-12 reviewer state cannot become `authority-ready` unless
`unresolvedState` is `none`, the requirement scope includes F-12, and the
approval record covers the exact measured package refs and rule semantics under
review.

## Rule Semantics

Every decision rule or rule group must describe how measured fields become a
candidate ranking, hold decision, reject decision, or reviewer-visible outcome.

Required fields:

| Field | Required rule |
| --- | --- |
| `ruleId` | Stable identifier unique inside the authority package. |
| `ruleVersion` | Version for the rule semantics. May match package-level `ruleVersion` or be narrower. |
| `inputField` | F-12 input field name such as `latency`, `jitter`, `loss`, `throughput`, `networkSpeed`, or `continuity`. |
| `measuredFieldRef` | Mapping ref to the retained measured package field and raw artifact refs. |
| `comparator` | Explicit comparator such as `<`, `<=`, `>`, `>=`, `==`, `between`, `rank-ascending`, `rank-descending`, or owner-defined value with notes. |
| `thresholdValue` | Numeric, interval, enum, or owner-defined threshold value. Use `null` only when the rule is ranking-only and the owner approves that form. |
| `unit` | Unit such as `ms`, `percent`, `bps`, `Mbps`, `packets`, `seconds`, or owner-defined unit. |
| `weight` | Numeric weighting for score-based rules, or `null` when weighting is not part of the semantics. |
| `priority` | Integer or ordered label for rule ordering. Lower or higher priority direction must be stated. |
| `tieBreaker` | Ordered list or rule ref used when candidates are otherwise equal. Include stable-serving behavior when applicable. |
| `hysteresis` | Dwell, margin, cooldown, minimum improvement, or hold behavior. Use `none` only when the owner explicitly disallows hysteresis. |
| `fallback` | Behavior when a candidate, metric, or measured package ref is unavailable. Must fail closed unless the authority owner supplies a bounded fallback. |
| `missingFieldBehavior` | `pending-measured-fields`, `reject-rule`, `hold-current`, `omit-candidate`, or owner-defined behavior with notes. |
| `sampleWindowBasis` | Duration, sample count, interval selection, event-window alignment, aggregation, direction, and clock source used by the rule. |
| `applicability` | Scenario, route, topology, endpoint pair, orbit class, traffic direction, candidate set, or other exact scope. |
| `reviewNotes` | Reviewer notes explaining assumptions, redactions, or unresolved interpretation questions. |

Rule semantics must fail closed:

- Missing measured package refs produce `pending-measured-fields` unless the
  rule owner explicitly states a different auditable behavior.
- Missing threshold owner, version, approval, effective date, or supersession
  policy produces `pending-threshold-authority`.
- Synthetic source tier or hand-authored shape examples produce `rejected` for
  the measured authority lane.
- A fallback that silently substitutes bounded proxy metrics for measured
  fields is not allowed.
- Missing `unit` or missing `weight` produces
  `pending-threshold-authority` because rule semantics are incomplete.
- A fallback that names bounded proxy policy, rule config, or modeled proxy
  metrics as substitute authority input is not allowed.
- A tie-breaker must be deterministic and documented; it must not be inferred
  from current repo implementation defaults unless the authority package names
  those defaults as accepted semantics.

## Sample-Window Basis

Every rule must name the evidence window it consumes. At minimum:

| Field | Required rule |
| --- | --- |
| `windowId` | Stable window identifier. |
| `startedAt` | ISO-8601 timestamp or measured package ref for the window start. |
| `endedAt` | ISO-8601 timestamp or measured package ref for the window end. |
| `timezone` | Timezone for timestamps and human review notes. |
| `basis` | `fixed-duration`, `sample-count`, `handover-event-window`, `rolling-window`, or owner-defined basis. |
| `durationSeconds` | Planned and observed duration when applicable. |
| `sampleCount` | Attempted, received, lost, and excluded counts when applicable. |
| `aggregation` | Aggregate such as avg, median, percentile, max, min, interval mean, or owner-defined function. |
| `direction` | Traffic direction or candidate direction covered by the rule. |
| `eventRefs` | Handover event refs when the rule is windowed around an event. |
| `clockSyncRef` | Clock source and max known skew ref from the measured package when available. |

If sample-window information is missing or cannot be aligned with raw artifacts,
the package cannot advance beyond `pending-measured-fields`.

## Reviewer States

Reviewer states are package-review states, not runtime states.

| State | Meaning | May be used when |
| --- | --- | --- |
| `schema-ready` | The F-12 authority package is structurally complete enough for review. It is not an authority approval. | Required metadata exists, rule records parse, measured-package refs are well-formed, and no import-blocking schema errors are present. |
| `pending-measured-fields` | The package needs retained measured fields or mapping details before rule review can proceed. | One or more measured package refs, raw refs, parsed fields, continuity windows, sample windows, or mapping methods are absent or unresolved. |
| `pending-threshold-authority` | The package needs threshold or rule authority before review can proceed. | Owner, version, approval record, requirement scope, effective date, supersession policy, comparator, weight, priority, tie-breaker, hysteresis, fallback, or missing-field behavior is absent or unresolved. |
| `rejected` | The package must not be used for an F-12 measured authority review. | Synthetic source tier is used for authority, refs do not resolve, redaction blocks auditability, threshold authority is fabricated, proxy metrics are substituted for measured fields, or package scope contradicts the claimed rule use. |
| `authority-ready` | The package has enough retained measured fields and external rule authority for a reviewer to apply the rules to the named scope. | Only when measured mappings, authority fields, rule semantics, sample windows, redaction notes, and reviewer notes are complete for the exact retained scope. This is not a runtime-control or acceptance verdict. |

`authority-ready` must be assigned per package scope or per rule group. It must
not be assigned globally by default.

## Synthetic Fallback Boundary

S11 remains the only allowed home for synthetic F-12 fallback fixture rules:
[itri-synthetic-fallback-fixtures.md](./itri-synthetic-fallback-fixtures.md).

Synthetic F-12 material may be used for:

- schema rehearsal;
- negative-gap rehearsal for missing threshold authority;
- tie-breaker and ranking shape examples;
- replay-window examples that do not control live traffic or simulator state.

Synthetic F-12 material must not be used for:

- authority decision-rule upgrades;
- measured decision verdicts;
- threshold approval;
- external traffic actuation;
- acceptance-report closure.

If an F-12 authority package declares `sourceTier: "tier-3-synthetic"`,
generated candidate metrics, hand-authored shape examples, or S11-only
provenance for any authority input, the reviewer state must be `rejected` for
the measured authority lane or the synthetic material must be kept outside the
authority package.

## Pseudo-Schema

The following TypeScript shape is a schema sketch for a future authority
importer or reviewer. It is not an implementation and not a fixture.

```ts
type ItriF12AuthorityReviewerState =
  | "schema-ready"
  | "pending-measured-fields"
  | "pending-threshold-authority"
  | "rejected"
  | "authority-ready";

type ItriF12DecisionInput =
  | "latency"
  | "jitter"
  | "loss"
  | "throughput"
  | "networkSpeed"
  | "continuity"
  | "handoverWindow";

interface ItriF12DecisionThresholdAuthorityManifest {
  schemaVersion: "itri.f12.decision-threshold-authority.v1";
  authorityId: string;
  owner: ItriF12AuthorityOwner;
  receivedAt: string;
  thresholdVersion: string | null;
  ruleVersion: string | null;
  reviewer: ItriF12AuthorityReviewer;
  redactionPolicy: ItriF12AuthorityRedactionPolicy;
  useNotes: ReadonlyArray<string>;
  coveredRequirements: ReadonlyArray<"F-12">;
  measuredPackageRefs: ReadonlyArray<ItriF12MeasuredPackageRef>;
  thresholdAuthority: ItriF12ThresholdAuthority;
  decisionRules: ReadonlyArray<ItriF12DecisionRule>;
  reviewerState: ItriF12AuthorityReviewerState;
  syntheticFallbackBoundary: ItriF12SyntheticFallbackBoundary;
  nonClaims: ItriF12AuthorityNonClaims;
}

interface ItriF12AuthorityOwner {
  organization: string;
  role: string;
  authorityScope: ReadonlyArray<string>;
  contactRef: string | null;
}

interface ItriF12AuthorityReviewer {
  nameOrRole: string;
  organization: string | null;
  reviewedAt: string | null;
  reviewScope: ReadonlyArray<string>;
  notes: ReadonlyArray<string>;
}

interface ItriF12AuthorityRedactionPolicy {
  policyId: string;
  policyVersion: string;
  owner: string;
  redactedCategories: ReadonlyArray<string>;
  auditability: "full" | "reviewable" | "blocked";
  useRestrictions: ReadonlyArray<string>;
}

interface ItriF12MeasuredPackageRef {
  packageId: string;
  packagePath: string;
  requirementIds: ReadonlyArray<"F-07" | "F-08" | "F-09">;
  reviewerVerdictRefs: ReadonlyArray<string>;
  parsedMetricRefs: ReadonlyArray<string>;
  sourceArtifactRefs: ReadonlyArray<string>;
  thresholdRuleRefs: ReadonlyArray<string>;
  handoverEventRefs: ReadonlyArray<string>;
  notes: ReadonlyArray<string>;
}

interface ItriF12ThresholdAuthority {
  owner: string | null;
  version: string | null;
  approvalRecord: {
    approver: string | null;
    approvedAt: string | null;
    approvalRef: string | null;
    requirementScope: ReadonlyArray<string>;
  };
  requirementScope: ReadonlyArray<string>;
  effectiveDate: string | null;
  supersessionPolicy: string | null;
  redactionUseNotes: ReadonlyArray<string>;
  unresolvedState:
    | "none"
    | "owner-missing"
    | "version-missing"
    | "approval-missing"
    | "scope-mismatch"
    | "effective-date-missing"
    | "supersession-missing"
    | "pending-review";
  unresolvedNotes: ReadonlyArray<string>;
}

interface ItriF12DecisionRule {
  ruleId: string;
  ruleVersion: string;
  inputField: ItriF12DecisionInput;
  measuredFieldRef: string;
  comparator:
    | "<"
    | "<="
    | ">"
    | ">="
    | "=="
    | "between"
    | "rank-ascending"
    | "rank-descending"
    | string;
  thresholdValue: number | string | null;
  unit: string | null;
  weight: number | null;
  priority: number | string;
  tieBreaker: ReadonlyArray<string>;
  hysteresis: {
    mode: "none" | "dwell" | "margin" | "cooldown" | "minimum-improvement" | string;
    value: number | string | null;
    unit: string | null;
    notes: ReadonlyArray<string>;
  };
  fallback: {
    behavior:
      | "pending-measured-fields"
      | "reject-rule"
      | "hold-current"
      | "omit-candidate"
      | string;
    notes: ReadonlyArray<string>;
  };
  missingFieldBehavior:
    | "pending-measured-fields"
    | "reject-rule"
    | "hold-current"
    | "omit-candidate"
    | string;
  sampleWindowBasis: ItriF12SampleWindowBasis;
  applicability: ReadonlyArray<string>;
  reviewNotes: ReadonlyArray<string>;
}

interface ItriF12SampleWindowBasis {
  windowId: string;
  startedAt: string | null;
  endedAt: string | null;
  timezone: string;
  basis:
    | "fixed-duration"
    | "sample-count"
    | "handover-event-window"
    | "rolling-window"
    | string;
  durationSeconds: {
    planned: number | null;
    observed: number | null;
  };
  sampleCount: {
    attempted: number | null;
    received: number | null;
    lost: number | null;
    excluded: number | null;
  };
  aggregation: string;
  direction: string | null;
  eventRefs: ReadonlyArray<string>;
  clockSyncRef: string | null;
}

interface ItriF12SyntheticFallbackBoundary {
  s11ContractRef: "docs/data-contracts/itri-synthetic-fallback-fixtures.md";
  authorityPackageAllowsSyntheticSource: false;
  allowedSyntheticUses: ReadonlyArray<
    "schema-rehearsal" | "negative-gap-rehearsal" | "ranking-shape-example"
  >;
  rejectAuthorityReviewWhenSourceTierIsSynthetic: true;
}

interface ItriF12AuthorityNonClaims {
  liveControl: false;
  measuredDecisionTruth: false;
  nativeRadioFrequencyHandover: false;
  externalTrafficControl: false;
  completeItriAcceptance: false;
  externalValidationVerdict: false;
  dutNatTunnelVerdict: false;
  itriOrbitModelIntegration: false;
  boundedProxyIsAuthorityRule: false;
}
```

## Review Checklist

Before assigning `authority-ready`, the reviewer must confirm:

1. `authorityId`, owner, `receivedAt`, threshold version, rule version,
   reviewer, redaction policy, and use notes are present.
2. Threshold authority owner, version, approval record, requirement scope,
   effective date, supersession policy, and unresolved state are complete.
3. Every rule has comparator, threshold value or ranking-only approval, unit,
   weight when applicable, priority, tie-breaker, hysteresis, fallback,
   missing-field behavior, and sample-window basis.
4. Every rule maps to retained F-07/F-08/F-09 measured package fields and raw
   artifact refs for the exact reviewed scope.
5. Latency, jitter, loss, throughput, network-speed, continuity, and
   handover-window inputs are either mapped, declared out of scope by the rule
   owner, or listed as pending.
6. Redactions do not block auditability of owner, version, approval, measured
   package linkage, sample-window basis, or rule semantics.
7. No S11 synthetic fallback row, generated metric, or hand-authored shape
   example is used as an authority input.
8. Bounded proxy F-12 policy/rule fields are not treated as external authority
   unless an authority package explicitly approves that mapping.
9. Nonclaim fields are present and literal `false`.

## Nonclaims

This contract records no pass assertion and no implementation upgrade. The
following claims remain outside this docs-only contract:

- no live control of the viewer, simulator, route, satellite path, DUT, traffic
  generator, or packet path;
- no measured decision truth from schema readiness, proxy metrics, or synthetic
  rows;
- no native radio-frequency or radio-layer handover behavior;
- no external traffic control or packet-path actuation;
- no complete customer acceptance;
- no external validation verdict from F-12 rule schema alone;
- no DUT, NAT, tunnel, or bridge verdict from F-12 rule schema alone;
- no customer orbit-model integration;
- no claim that bounded proxy F-12 is the measured authority rule lane.
