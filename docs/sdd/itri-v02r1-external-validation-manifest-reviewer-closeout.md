# ITRI V-02R1 External Validation Manifest Reviewer Closeout

Date: 2026-05-14

Status: bounded package-review readiness reviewer implemented.

## Scope

V-02R1 adds a package-review path for explicitly named local package
directories under:

```text
output/validation/external-v02-v06/<timestamp>-external-validation/
```

The reviewer consumes `manifest.json` shape only. It does not discover package
directories, fetch evidence, execute traffic tools, control NAT/tunnels, run
DUTs, run NE-ONE/vendor tools, or create retained evidence packages.

## Implemented Surface

- Pure reviewer module:
  `src/features/external-validation-manifest/external-validation-manifest-reviewer.ts`
- Public feature export:
  `src/features/external-validation-manifest/index.ts`
- Explicit-path CLI:
  `node scripts/review-itri-external-validation-manifest.mjs --package output/validation/external-v02-v06/<timestamp>-external-validation`
- Focused verifier:
  `node scripts/verify-itri-external-validation-manifest-reviewer.mjs`
- Package command:
  `npm run test:itri-v02r1`

## Landed Chain

- `7e54e48` implemented the bounded V-02R1 external-validation manifest
  reviewer.
- `46b124b` fixed the explicit-manifest package-boundary check after review
  found that `--manifest` could point outside the explicitly named package
  directory.

## Behavior Locked

- A missing package returns package state `missing` and fails closed.
- A path outside `output/validation/external-v02-v06/` returns `rejected`.
- An explicit `--manifest` path outside the named package returns `rejected`
  with `manifest.path-outside-package` and does not produce per-lane
  `authority-pass`.
- A missing, malformed, or wrong-version `manifest.json` returns a non-authority
  package-review state with actionable gaps.
- Synthetic source tier, synthetic provenance, or `tier-3-synthetic` material in
  the package context returns `rejected`.
- Artifact refs that support review or verdict fields must resolve inside the
  explicitly named package directory. Escaping refs and external URLs fail
  closed.
- Nested refs are included for artifact refs, environment command/source refs,
  topology refs, DUT refs, traffic-generator refs, traffic-profile refs,
  reviewer verdict refs, screenshot illustrated/source refs, and shared raw refs
  from related measured-traffic relations.
- `authority-pass` is per V requirement only. The package has no global
  authority-pass state.
- A submitted per-lane `authority-pass` is downgraded unless retained raw refs,
  lane-required evidence refs, resolved owner verdict refs, and auditable
  redaction state are present.
- Audit-blocking redaction rejects authority review.
- Screenshots are supplemental only and cannot satisfy raw artifact requirements
  by themselves.
- `relatedMeasuredTrafficPackages` remains relation metadata only and cannot
  promote V-lane authority or measured traffic truth.

## Nonclaims

This slice preserves these boundaries:

- package-review readiness is not external validation truth;
- package-review readiness is not V-02 through V-06 acceptance;
- package-review readiness is not measured traffic truth;
- DUT, NAT, tunnel, bridge, traffic-generator, ESTNeT/INET, and Windows/WSL
  runtime success remain external to this reviewer;
- no live `ping`, `iperf`, tunnel, NAT, DUT, NE-ONE, vendor tool, or traffic
  generator execution is introduced;
- no runtime demo validation verdict, UI surface, F-12 decision behavior,
  F-07/F-08/F-09 measured-truth behavior, F-01 behavior, or S4 behavior is
  changed;
- no complete ITRI acceptance is asserted.

## Validation

Close-out validation for this slice is the repo build, the existing F-07R1 and
F-12R1 focused verifiers, the new V-02R1 focused verifier, `git diff --check`,
new-file whitespace checks where needed, and forbidden-claim scans scoped to the
edited files only. The verifier creates only temp package trees and does not
mutate retained evidence under `output/validation/external-v02-v06/`.
The V-02R1 verifier now includes missing package, wrong root, missing manifest,
malformed manifest, wrong schema, synthetic/tier-3, escaping ref, nested
reviewer source refs, owner verdict refs, audit-blocking redaction,
screenshot-only evidence, related measured-traffic truth promotion,
manifest-outside-package, and temp-only per-lane authority-pass cases.
