# ITRI S4R1 Public Standards Profile Reviewer Closeout

Date: 2026-05-14

Status: bounded public-profile review readiness reviewer implemented.

## Scope

S4R1 adds an explicit local package-review path for public standards profile
directories under:

```text
output/validation/public-standards-profiles/<profile-id>/
```

The reviewer consumes `profile.json` shape only. It does not discover package
directories, fetch standards material, copy ITU tables/equations/components,
create fixtures, change `physical-input`, or implement numeric
standards-derived behavior.

## Implemented Surface

- Pure reviewer module:
  `src/features/public-standards-profile/public-standards-profile-reviewer.ts`
- Public feature export:
  `src/features/public-standards-profile/index.ts`
- Explicit-path CLI:
  `node scripts/review-itri-public-standards-profile.mjs --package output/validation/public-standards-profiles/<profile-id>`
- Optional profile override:
  `--profile <path>` must resolve inside the explicitly named package
  directory.
- Focused verifier:
  `node scripts/verify-itri-public-standards-profile-reviewer.mjs`
- Package command:
  `npm run test:itri-s4r1`

## Landed Chain

- `e4a49f4` implemented the bounded S4R1 public standards profile reviewer.

## Behavior Locked

- A missing package returns package state `missing` and fails closed.
- A path outside `output/validation/public-standards-profiles/` returns
  `rejected`.
- A missing, malformed, or wrong-version `profile.json` returns a non-ready
  package-review state with actionable gaps.
- An explicit `--profile` outside the named package returns `rejected`.
- Selected recommendations are limited to the S4-A public authority candidate
  IDs. S4-A method/context source IDs are rejected when promoted as selected
  physical recommendations.
- Selected recommendation URLs, version IDs, access dates, `sourceLineage`,
  `accessDates`, and `versionIds` are checked against the retained S4-A
  official ITU lineage.
- `sourceTier: "tier-1-itri-or-official-authority"`,
  `authority-selected` recommendations,
  `accepted-by-itri-vgroup-with-retained-record`, and
  `implementation-ready-after-authority-review` fail closed in S4R1.
- `validationVectors` and `tolerances` must be present and must include
  `not-yet-supplied` entries unless a later authority slice supersedes S4R1.
- All S4-B nonclaim fields must be present with literal `false`.
- Tier-3 synthetic source material, synthetic provenance, or synthetic fixture
  truth is rejected.
- All mandatory replacement-rule triggers are required.
- `retainedPath` / `retainedPaths` fields, when present, must resolve inside
  the named package and cannot be unresolved.
- Package state is never global `authority-pass`; the positive state is only
  `bounded-public-profile-ready`.

## Nonclaims

This slice preserves these boundaries:

- public standards profile readiness is not ITRI/V-group authority truth;
- selected public ITU recommendations do not imply ITRI/V-group acceptance;
- no numeric standards-derived runtime behavior is implemented;
- current bounded proxy physical-input values are not standards-derived;
- no calibrated physical authority truth is asserted;
- no measured traffic, external validation, DUT, NAT, tunnel, native RF
  handover, active satellite/gateway/path, or complete ITRI acceptance claim is
  asserted;
- no synthetic fixture is created or promoted;
- no retained output package or checked-in profile fixture is created.

## Validation

Close-out validation for this slice is the repo build, existing F-07R1,
F-12R1, and V-02R1 focused verifiers, the new S4R1 focused verifier,
`git diff --check`, `git show --check HEAD`, new-file whitespace checks where
needed, and forbidden-claim scans scoped to edited files only. The S4R1
verifier creates only temp package trees and does not mutate retained evidence
under `output/validation/public-standards-profiles/`.
The verifier covers missing package, wrong root, missing profile, malformed
JSON, wrong schema, explicit profile path outside the package, unknown selected
source ID, method/context source promotion, unofficial URL, missing or true
nonclaims, synthetic provenance/source tier, authority acceptance without
retained authority material, implementation-ready approximation without
retained authority material, missing validation vectors, missing tolerances,
missing replacement-rule trigger, retained path escaping the package, missing
`sourceTier` defaulting to Tier 2, and a positive temp-only bounded public
profile covering F-17/P-01/P-02/P-03.
