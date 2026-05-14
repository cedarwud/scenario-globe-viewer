# ITRI F-12R1 Decision-Threshold Authority Reviewer Closeout

Date: 2026-05-13

Status: bounded package-review readiness reviewer implemented.

## Scope

F-12R1 adds a package-review path for explicitly named local authority package
directories under:

```text
output/validation/external-f12/<timestamp>-decision-threshold-authority/
```

The reviewer consumes `manifest.json` shape only. It does not discover package
directories, fetch evidence, execute live traffic tools, control NAT/tunnels,
run DUTs, run NE-ONE/vendor tools, or change the existing F-12 handover
decision behavior.

## Implemented Surface

- Pure reviewer module:
  `src/features/decision-threshold-authority/decision-threshold-authority-reviewer.ts`
- Public feature export:
  `src/features/decision-threshold-authority/index.ts`
- Explicit-path CLI:
  `node scripts/review-itri-f12-decision-threshold-authority.mjs --package output/validation/external-f12/<timestamp>-decision-threshold-authority`
- Focused verifier:
  `node scripts/verify-itri-f12-decision-threshold-authority-reviewer.mjs`
- Package command:
  `npm run test:itri-f12r1`

## Behavior Locked

- A missing F-12 package returns package state `missing` and fails closed.
- A missing, malformed, or incomplete manifest returns a non-authority package
  review state with actionable gaps.
- Synthetic source tier or synthetic provenance in the F-12 authority package
  context returns `rejected`.
- Reviewer states are package-review states, not runtime states.
- `authority-ready` is never assigned by default. It is emitted only when the
  manifest explicitly requests `reviewerState: "authority-ready"` and all
  measured-field, threshold-authority, artifact-boundary, synthetic-boundary,
  and nonclaim gates pass.
- Referenced measured package paths must remain under
  `output/validation/external-f07-f09/`.
- Referenced measured packages are reviewed through the existing F-07R1
  reviewer surface; F-12R1 does not reimplement or bypass F-07R1 artifact
  boundary checks.
- Referenced measured packages must expose sufficient F-07R1 package-review
  states for the named requirements and must have
  `thresholdAuthority.unresolvedThresholdState` present and exactly `none`.
- F-12 `measuredPackageRefs[].parsedMetricRefs` and
  `measuredPackageRefs[].thresholdRuleRefs` require exhaustive F-07R1
  per-requirement review coverage; a valid reviewed ref cannot mask an
  unreviewed ref in the same array.
- Each `decisionRules[].measuredFieldRef` used for `authority-ready` must be
  covered by a sufficient F-07R1 requirement review for the rule input. A
  `throughput` or `networkSpeed` rule that references an F-09 metric fails
  closed when `measuredPackageRefs[].requirementIds` omits F-09.
- F-12 `thresholdAuthority.unresolvedState` must be present and exactly `none`
  before `authority-ready` can be emitted.
- Decision rule semantics must retain `unit`, `weight`, and fail-closed
  fallback behavior. Bounded-proxy fallback substitution is rejected for the
  measured authority lane.
- Raw refs named by measured-package refs, approval refs, source artifact refs,
  reviewer verdict refs, parsed metric refs, threshold rule refs, handover event
  refs, and rule sample-window refs are included in F-12 artifact resolution and
  package-boundary checks.
- Bounded proxy F-12 policy/rule config refs are not treated as authority and do
  not change behavior.

## Nonclaims

This slice preserves these boundaries:

- package-review readiness is not runtime control;
- package-review readiness is not F-12 acceptance;
- package-review readiness is not measured-decision truth;
- package-review readiness is not complete ITRI acceptance;
- `--manifest` explicit-path checks require manifest to stay within the selected package directory;
- no live `ping`, `iperf`, tunnel, NAT, DUT, NE-ONE, vendor tool, or traffic
  generator execution is introduced;
- no F-12 handover decision behavior is changed;
- no V-02 through V-06 verdict is changed;
- no F-01 orbit-model or S4 physical/standards runtime behavior is changed;
- no retained evidence package is created under `output/validation/external-f12/`
  or `output/validation/external-f07-f09/`.

## Validation

Close-out validation for this slice is the repo build, the existing F-07R1
focused verifier, the new F-12R1 focused verifier, `git diff --check`, and
forbidden-claim scans scoped to the edited files only. The verifier creates
only temp package trees and does not mutate retained evidence under
`output/validation/external-f12/` or `output/validation/external-f07-f09/`.
