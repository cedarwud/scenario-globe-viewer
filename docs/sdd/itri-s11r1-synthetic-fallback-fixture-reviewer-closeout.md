# customer S11R1 Synthetic Fallback Fixture Reviewer Closeout

Date: 2026-05-14

Status: bounded synthetic-fixture package-review readiness reviewer implemented.

## Scope

S11R1 adds an explicit local package-review path for future synthetic fallback
fixture manifest directories under:

```text
output/validation/synthetic-fallback-fixtures/<fixture-id>/
```

The reviewer consumes `manifest.json` shape only. It does not discover package
directories, create fixture files, create retained evidence packages, fetch
external data, execute live traffic tools, run DUTs, run NE-ONE/vendor tools,
or promote synthetic material to authority evidence.

## Implemented Surface

- Pure reviewer module:
  `src/features/synthetic-fallback-fixture/synthetic-fallback-fixture-reviewer.ts`
- Public feature export:
  `src/features/synthetic-fallback-fixture/index.ts`
- Explicit-path CLI:
  `node scripts/review-itri-synthetic-fallback-fixture.mjs --package output/validation/synthetic-fallback-fixtures/<fixture-id>`
- Optional manifest override:
  `--manifest <path>` must resolve inside the explicitly named package
  directory.
- Focused verifier:
  `node scripts/verify-itri-synthetic-fallback-fixture-reviewer.mjs`
- Package command:
  `npm run test:itri-s11r1`

## Landed Chain

- `0d0074b` implemented the bounded S11R1 synthetic fallback fixture reviewer.

## Behavior Locked

- A missing package returns package state `missing` and fails closed.
- A path outside `output/validation/synthetic-fallback-fixtures/` returns
  `rejected`.
- A missing, malformed, or wrong-version `manifest.json` returns a non-ready
  package-review state with actionable gaps.
- An explicit `--manifest` outside the named package returns `rejected`.
- Required metadata is enforced for fixture identity, lanes, category,
  timestamp, source tier, synthetic provenance, intended consumers, forbidden
  consumers, maximum claim, known gaps, replacement trigger, and nonclaims.
- `sourceTier` must be exactly `tier-3-synthetic`; Tier 1 and Tier 2 promotion
  fail closed in this reviewer.
- Intended consumers are limited to bounded UI, schema, parser, smoke,
  negative-gap, and demo-placeholder rehearsal consumers.
- Required forbidden consumers must block authority verdicts, acceptance-report
  closure, measured evidence packages, external validation verdicts,
  physical-layer verdicts, and runtime live-traffic claims.
- `maximumClaim` must remain inside readiness, parser, schema, smoke, demo,
  placeholder, UI, shape, or rehearsal language and fails closed on stronger
  claim terms.
- `knownGaps` and an actionable replacement trigger are required.
- All S11 nonclaim fields must be present with literal `false`.
- Package-local retained refs, when present, must resolve inside the named
  package. Absolute paths, external URLs, escaping refs, and unresolved refs
  fail closed.
- Positive package state is only `bounded-synthetic-fixture-ready`; there is no
  authority-ready state.

## Nonclaims

This slice preserves these boundaries:

- synthetic fixture readiness is not authority evidence;
- synthetic fixture readiness is not truth for V-02..V-06 external validation;
- synthetic fixture readiness is not F-07/F-08/F-09 traffic measurement truth;
- synthetic fixture readiness is not calibrated physical truth;
- synthetic fixture readiness is not customer orbit-model integration;
- synthetic fixture readiness is not DUT, NAT, tunnel, gateway/path, native
  radio handover, or full acceptance by customer;
- no retained evidence package or checked-in fixture JSON is created;
- no live `ping`, `iperf`, network fetch, tunnel, NAT, DUT, NE-ONE, vendor
  tool, or traffic-generator execution is introduced.

## Validation

Close-out validation for this slice is the repo build, existing F-07R1,
F-12R1, V-02R1, S4R1, and F-01R1 focused verifiers, the new S11R1 focused
verifier, `git diff --check`, `git show --check HEAD`, and forbidden-claim
scans scoped to the edited files only. The S11R1 verifier creates only temp
package trees and does not mutate retained evidence under
`output/validation/synthetic-fallback-fixtures/`.

The verifier covers missing package, wrong root, missing manifest, malformed
JSON, wrong `schemaVersion`, explicit manifest outside the package, missing
required metadata, invalid lane, non-Tier-3 source tier, missing
synthetic-provenance fields, out-of-bound intended consumers, missing required
forbidden consumers, too-strong maximum claim, empty known gaps, missing
replacement trigger, missing nonclaims, true nonclaim fields, retained refs
escaping the package, unresolved retained refs, external URL retained refs, and
a positive temp-only package reaching only `bounded-synthetic-fixture-ready`.
