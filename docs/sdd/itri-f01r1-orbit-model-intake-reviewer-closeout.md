# ITRI F-01R1 Orbit-Model Intake Reviewer Closeout

Date: 2026-05-14

Status: bounded authority-package intake readiness reviewer implemented.

## Scope

F-01R1 adds an explicit local package-review path for orbit-model intake
directories under:

```text
output/validation/external-f01-orbit-model/<timestamp>-orbit-model-intake/
```

The reviewer consumes `manifest.json` shape only. It does not discover package
directories, fetch public catalogs, run vendor tools, execute a model, add a
runtime adapter, implement propagation, substitute public TLE output, or create
retained orbit-model package fixtures.

## Implemented Surface

- Pure reviewer module:
  `src/features/orbit-model-intake/orbit-model-intake-reviewer.ts`
- Public feature export:
  `src/features/orbit-model-intake/index.ts`
- Explicit-path CLI:
  `node scripts/review-itri-orbit-model-intake.mjs --package output/validation/external-f01-orbit-model/<timestamp>-orbit-model-intake`
- Optional manifest override:
  `--manifest <path>` must resolve inside the explicitly named package
  directory.
- Focused verifier:
  `node scripts/verify-itri-orbit-model-intake-reviewer.mjs`
- Package command:
  `npm run test:itri-f01r1`

## Behavior Locked

- A missing package returns package state `missing` and fails closed.
- A path outside `output/validation/external-f01-orbit-model/` returns
  `rejected`.
- A missing, malformed, or wrong-version `manifest.json` returns a non-ready
  package-review state with actionable gaps.
- An explicit `--manifest` outside the named package returns `rejected`.
- Required metadata is checked: `packageId`, `owner`, `receivedAt`,
  `redistributionPolicy`, `licenseUseNotes`, and `reviewer`.
- `redistributionPolicy` must explicitly state whether projected artifacts are
  allowed.
- `sourceTier` must be retained Tier 1 ITRI or owner-approved orbit-model
  authority context. Public TLE, CelesTrak, Space-Track, and Tier 3 synthetic
  source tiers fail closed.
- `modelIdentity` must include model name/version, propagation method,
  coordinate input/output frames, frame definition refs, time system, accepted
  epoch formats, epoch source, and relative-time policy.
- `inputContract` must include scenario time, satellite identity, orbit-state
  inputs, and units.
- `outputContract` must include sample output shape, frame/time labels, and
  uncertainty or tolerance fields.
- `validationVectors` must include case id/purpose, input or retained input
  ref, expected output or retained output ref, tolerances, comparison method,
  and failure handling.
- Validation vectors cannot be replaced by public TLE, CelesTrak, or
  Space-Track output.
- `status.nonClaims` must carry all F-01 intake nonclaims with literal `false`.
- Package-local retained refs, checksum refs, source-package refs, and
  `retainedPath`-like fields must resolve inside the named package unless they
  use an explicit private owner-system ref.
- Positive package state is only `ready-for-design-review`; there is no global
  or per-requirement authority-pass state.

## Nonclaims

This slice preserves these boundaries:

- intake readiness is not F-01 authority completion;
- no ITRI orbit-model package is checked into the repo by this slice;
- no runtime adapter, propagation implementation, or scenario/overlay runtime
  integration is added;
- public TLE, CelesTrak, or Space-Track output is not a substitute for the ITRI
  model or validation vectors;
- synthetic data is not orbital truth;
- no measured traffic, external stack verdict, DUT, NAT, tunnel,
  gateway/path truth, native radio-frequency handover, or full ITRI acceptance
  is asserted;
- no retained authority package or checked-in orbit-model fixture is created.

## Validation

Close-out validation for this slice is the repo build, existing F-07R1,
F-12R1, V-02R1, and S4R1 focused verifiers, the new F-01R1 focused verifier,
`git diff --check`, `git show --check HEAD`, new-file whitespace checks where
needed, and forbidden-claim scans scoped to edited files only. The F-01R1
verifier creates only temp package trees and does not mutate retained evidence
under `output/validation/external-f01-orbit-model/`.

The verifier covers missing package, wrong root, missing manifest, malformed
JSON, wrong schemaVersion, explicit manifest outside the package, missing
required metadata, public TLE sourceTier promotion, missing model identity,
missing coordinate frame refs, missing time system or epoch rules, missing
input units, missing output frame/time labels, missing validation vectors,
validation vector missing tolerances, validation vector missing
`comparisonMethod`, validation vector using public TLE output as a substitute,
synthetic provenance or source tier, missing or true nonclaims, retainedPath
escaping the package, and a positive temp-only package reaching
`ready-for-design-review` without runtime integration.
