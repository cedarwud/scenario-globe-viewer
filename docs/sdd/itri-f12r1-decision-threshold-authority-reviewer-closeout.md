# customer F-12R1 Decision-Threshold Authority Reviewer Closeout

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
- package-review readiness is not complete customer acceptance;
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

## S3-F12R2 — Verifier schema-ready fixture stabilization (2026-05-14)

### Problem

`node scripts/verify-itri-f12-decision-threshold-authority-reviewer.mjs`
exited 1 at line 812 (`Schema-ready package must review cleanly`). The F-12
verifier's `measuredManifest()` fixture had not been kept in sync with F-07R1
corrective commits 9671b42, 23439d3, and 70b9e90. Specifically, commit 23439d3
extended `REQUIRED_NON_CLAIMS` in the F-07R1 reviewer with 8 additional
literal-false fields:
`completeItriAcceptance`, `closesF01ItriOrbitModelIntegration`,
`arbitraryExternalSourceAcceptance`, `liveRealTimeFeedExecution`,
`measuredTrafficNetworkTruth`, `natTunnelDutValidation`,
`nativeRfHandoverTruth`, and
`publicCelesTrakOrSpaceTrackSubstitutesForItriPrivateSourceAuthorityWithoutOwnerEvidence`.
All 8 were absent from the fixture's `nonClaims` block. F-07R1 emitted 8
blocking `nonclaims.literal-false-missing` gaps, causing
`packageState=incomplete` for F-07, F-08, and F-09, which in turn caused the
F-12 reviewer to emit `pending-measured-fields` and the verifier to exit 1.

### Resolution

Added the 8 missing non-claims fields (all `false`) to `measuredManifest()`
inside `scripts/verify-itri-f12-decision-threshold-authority-reviewer.mjs`.
No F-07R1 reviewer, F-12 reviewer, or S12 reviewer source was changed.

### Commit

`1ea4e180044e3d8b183c2d33d7465c9026636a17` — `itri: stabilize f12 verifier schema-ready fixture`

### Validation result

- `npx tsc --noEmit`: exit 0
- `npm run build`: exit 0
- `node scripts/verify-itri-f12-decision-threshold-authority-reviewer.mjs`: exit 0
- `npm run test:itri-f12r1`: exit 0
- `npm run test:itri-f07r1`: exit 0
- `npm run test:itri-v02r1`: exit 0
- `npm run test:itri-s4r1`: exit 0
- `npm run test:itri-f01r1`: exit 0
- `npm run test:itri-s11r1`: exit 0
- `npm run test:itri-s12r1`: exit 0
- `npm run test:itri-s12r3`: exit 0
- Missing-package fail-closed: `packageState=missing`, exit 1
- Manifest-outside-package fail-closed: `packageState=rejected`, gap `manifest.path-outside-package`, exit 1
- Forbidden-claim scan: 0 matches
- `git diff --check` and `git show --check HEAD`: clean
