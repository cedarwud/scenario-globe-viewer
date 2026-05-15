# customer F-07R1 Measured-Traffic Package Reviewer Closeout

Date: 2026-05-13

Status: bounded runtime-facing reviewer/importer slice implemented.

## Scope

F-07R1 adds a small package-review path for explicitly named local package
directories under:

```text
output/validation/external-f07-f09/<timestamp>-measured-traffic/
```

The reviewer consumes `manifest.json` shape only. It does not discover package
directories, fetch evidence, execute traffic tools, or write retained evidence
by default.

## Implemented Surface

- Pure reviewer module:
  `src/features/measured-traffic-package/measured-traffic-package-reviewer.ts`
- Public feature export:
  `src/features/measured-traffic-package/index.ts`
- Explicit-path CLI:
  `node scripts/review-itri-measured-traffic-package.mjs --package output/validation/external-f07-f09/<timestamp>-measured-traffic`
- Focused verifier:
  `node scripts/verify-itri-measured-traffic-package-reviewer.mjs`
- Package command:
  `npm run test:itri-f07r1`

## Behavior Locked

- A missing package returns package state `missing` and per-requirement
  `incomplete` review states.
- A missing or malformed manifest returns `incomplete` with actionable gaps.
- Synthetic source tier or synthetic provenance in the measured package context
  returns `rejected`.
- Review states are emitted per F-07/F-08/F-09 requirement.
- `authority-pass` is never assigned by default. A submitted authority-pass
  state is downgraded unless raw refs, parsed metric refs, external threshold
  owner/version/rules, and `unresolvedThresholdState: "none"` are present.
- Positive path: a complete owner-package manifest under
  `output/validation/external-f07-f09/<timestamp>-measured-traffic` now reviews as
  `packageState: "importable"` with per-requirement `importable` state and exit
  code 0, matching S2-C positive availability alignment.
- Declared artifact refs, including `parsedMetrics[].sourceArtifactRefs`, must
  resolve inside the named package directory. Escaping refs are rejected.
- Threshold authority is reported as external to the importer.

## Nonclaims

This slice preserves these boundaries:

- schema/import readiness is not measured traffic truth;
- importer output is not V-02 through V-06 validation truth;
- DUT, NAT, tunnel, bridge, packet-path, or traffic-generator success remains
  external;
- `ping` and `iperf` commands are never executed by this reviewer;
- F-12 decision behavior is unchanged;
- F-01 orbit-model behavior is unchanged;
- S4 physical/standards runtime behavior is unchanged;
- no complete customer acceptance is asserted.
- close-path external-source provenance, live real-time-feed execution truth,
  measured-network-truth, NAT/tunnel/DUT validation closure, arbitrary native-RF
  handover and orbit-model substitution claims are preserved as `false` via
  explicit nonclaim fields.

## Validation

Close-out validation for this slice is the repo build plus the focused
temp-data verifier and edited-file forbidden-claim scans. The verifier creates
only temp package trees and does not mutate retained evidence under
`output/validation/external-f07-f09/`.
