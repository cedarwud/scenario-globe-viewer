# customer S4R1 Public Standards Profile Reviewer Closeout

Date: 2026-05-14 (post-S4R1 ITU-R public-formula module amendment recorded
2026-05-15; see "ITU-R Physics Module Follow-On" section below).

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

- public standards profile readiness is not customer/V-group authority truth;
- selected public ITU recommendations do not imply customer/V-group acceptance;
- the S4R1 reviewer itself implements no numeric standards-derived runtime
  behavior — see the "ITU-R Physics Module Follow-On" section for the
  bounded-public-source-only formulae that landed under
  `src/features/itu-r-physics/` after S4R1;
- public-source-only ITU-R formulae now back demo seeds for F-17/P-01/P-02/P-03
  via `src/features/itu-r-physics/` but remain bounded-public-source-only —
  they are not calibrated physical authority truth and do not assert
  customer/V-group acceptance;
- no calibrated physical authority truth is asserted;
- no measured traffic, external validation, DUT, NAT, tunnel, native RF
  handover, active satellite/gateway/path, or complete customer acceptance claim is
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

## ITU-R Public Standards Profile v1 (bounded-public-profile-ready)

Created: 2026-05-15
profileId: `itri-s4-itu-rain-antenna-v1`
packageState: `bounded-public-profile-ready`
Sources: ITU-R P.618 / P.837 / P.838 / S.465
Covered: F-17, P-01, P-02, P-03
acceptanceStatus: `bounded-public-profile-only`

The retained package lives under
`output/validation/public-standards-profiles/itri-s4-itu-rain-antenna-v1/`
(gitignored). The S4R1 reviewer
(`scripts/review-itri-public-standards-profile.mjs`) exits 0 with zero gaps,
all four requirement reviews resolving to `bounded-public-profile-ready`,
`validationReadiness.notYetSuppliedValidationVectorsPresent: true`, and
`validationReadiness.notYetSuppliedTolerancesPresent: true`. Customer
V-group authority truth, calibrated physical authority truth, and standards-
derived runtime implementation remain explicitly nonclaimed. Rain-height
(P.839), gas/cloud (P.676/P.840), and additional antenna candidates
(S.580/S.1528) remain visible as S4-A lineage but are not promoted into
this bounded subset.

## ITU-R Physics Module Follow-On (2026-05-15)

After S4R1 landed, a bounded-public-source-only ITU-R physics module landed
under `src/features/itu-r-physics/` to back demo physical-input seeds with
public-formula values instead of repo-chosen constants:

- `itu-r-p838-rain-attenuation.ts` (`01a3820`) implements ITU-R P.838-3
  Table 5 specific-attenuation coefficients with log-log `k` and semi-log
  `α` interpolation. Reference cases verified by
  `node scripts/verify-itu-r-p838-rain-attenuation.mjs` at 0.0% deviation.
- `itu-r-p618-link-budget.ts` (`be8c042`) implements ITU-R P.618-14 §2.4
  total path attenuation composing `A_rain` (P.838-3) + `A_gas` (simplified
  P.676) + `A_cloud` (bounded P.840) + `A_scint` (bounded P.618 §2.5.2).
  Reference cases verified by
  `node scripts/verify-itu-r-p618-link-budget.mjs`.
- `itu-r-f699-antenna-pattern.ts` (`23f4314`) implements ITU-R F.699-8
  three-region sidelobe envelope plus boresight `G_max` and pointing-loss
  helper. Reference cases verified by
  `node scripts/verify-itu-r-f699-antenna-pattern.mjs` within published
  tolerance bands.

The module is consumed only by `src/runtime/bootstrap-physical-input-seeds.ts`
so that demo seeds carry public-source-only computed values. The module is
intentionally public-source-only:

- frequency, polarization, elevation, antenna geometry, and selected
  approximations are repo-chosen demo defaults rather than customer/V-group
  selected parameters;
- validation vectors and tolerances remain `not-yet-supplied` until
  customer/V-group authority is recorded;
- no `physical-input` runtime acceptance, S4R1 reviewer scope, F-WP1-B/K-03/F-07
  retained acceptance, or `output/validation/public-standards-profiles/`
  retained package state is changed by this module;
- no measured traffic, external validation, DUT, NAT, tunnel, native RF
  handover, active satellite/gateway/path, or complete customer acceptance
  is asserted by this module.

Customer/V-group selected parameters, validation vectors, tolerances, and
acceptance still gate F-17/P-01/P-02/P-03 closure beyond
bounded-public-source-only readiness.

Cross-references:

- audit rows: `INDEPENDENT-AUDIT-results.md` F-07, K-03, P-01, P-02, P-03;
- roadmap pointer:
  `docs/sdd/itri-requirement-completion-roadmap.md` ITU-R Physics Module
  close-out pointer;
- phase plan: `docs/sdd/phase-6-plus-requirement-centered-plan.md` Phase 6.5
  closure note.

## 2026-05-17 Addendum — Higher-Level NTN Wrapper Alongside itu-r-physics

Date: 2026-05-17. The S4R1 reviewer and the close-out above remain
authoritative for the public-standards-profile package review path. This
addendum records a separate higher-level wrapper that shipped on the same
day, so future readers do not conclude the new module set replaces the
S4R1-reviewed surface.

A new module directory landed at `src/runtime/link-budget/` containing five
modules used by the multi-station-selector V4 runtime projection (see
`docs/itri-requirement-walkthrough.md` for the requirement-by-requirement
walkthrough). The relevant overlap with the existing S4-closed
`itu-r-physics/` suite is the P.838-3 rain attenuation coefficient table.
That overlap was resolved on the same day (commit `794a34e`) by refactoring
`runtime/link-budget/rain-attenuation.ts` to delegate the k/alpha lookup
into `features/itu-r-physics/itu-r-p838-rain-attenuation.ts` via
`computeSpecificAttenuation`. The full 1-100 GHz P.838-3 table remains the
single source of truth in `itu-r-physics/`.

Other modules in `link-budget/` (FSPL standalone, gas-absorption standalone,
S.1528/S.465 NTN antenna patterns, TR 38.821 §7.3 + V-MO1 handover policy)
fill gaps the existing `itu-r-physics/` suite did not expose. They do not
re-implement S4-closed surfaces.

S4R1 reviewer behavior, `profile.json` shape, and acceptance criteria are
unchanged.
