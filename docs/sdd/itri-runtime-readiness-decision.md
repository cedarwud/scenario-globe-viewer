# customer Runtime Readiness Decision

Date: 2026-05-13

Status: docs-only readiness decision. This document selects the first
runtime-facing implementation lane after the customer roadmap/data-contract layer.
It does not authorize runtime implementation by itself.

Related roadmap:
[itri-requirement-completion-roadmap.md](./itri-requirement-completion-roadmap.md).

Related contracts:

- [../data-contracts/itri-measured-traffic-package.md](../data-contracts/itri-measured-traffic-package.md)
- [../data-contracts/itri-external-validation-manifest.md](../data-contracts/itri-external-validation-manifest.md)
- [../data-contracts/itri-decision-threshold-authority.md](../data-contracts/itri-decision-threshold-authority.md)
- [../data-contracts/itri-orbit-model-intake.md](../data-contracts/itri-orbit-model-intake.md)
- [../data-contracts/itri-public-standards-profile.md](../data-contracts/itri-public-standards-profile.md)
- [../data-contracts/itri-synthetic-fallback-fixtures.md](../data-contracts/itri-synthetic-fallback-fixtures.md)

## Decision

The first runtime-facing lane should be a bounded F-07/F-08/F-09 measured
traffic package reviewer/importer.

Working slice id:

`F-07R1 measured-traffic package reviewer/importer readiness`.

The slice should consume the
[measured traffic package contract](../data-contracts/itri-measured-traffic-package.md)
as its authority for manifest shape, reviewer states, raw artifact references,
threshold fields, synthetic fallback rejection, and nonclaims.

## Why This Lane First

The measured-traffic package lane is the lowest-risk first runtime-facing
candidate because:

- it has a complete docs/data-contract surface;
- it can fail closed when no retained package exists;
- it can validate structure without requiring live network access, Windows/WSL,
  ESTNeT/INET, NAT, tunnels, DUTs, NE-ONE, or customer orbit-model data;
- it creates useful reviewer plumbing for F-07, F-08, F-09, F-12, and V-02..V-06
  without changing their authority status;
- it can use explicitly retained local package paths instead of fetching or
  discovering external evidence;
- it gives future external evidence a stable intake path without treating
  schema readiness as measured authority.

## Alternatives Considered

### F-01 Orbit-Model Runtime Adapter

Rejected as first runtime lane. The F-01 intake contract is ready, but the
actual model package, frames, time system, vectors, tolerances, redistribution
policy, and owner sign-off are still external authority inputs. A runtime
adapter would either block immediately or risk implying model presence.

### S4 Public Standards Profile Runtime

Rejected as first runtime lane. S4-A and S4-B are ready for public standards
profile records, but numeric standards behavior still needs selected versions,
parameters, geometry, vectors, tolerance expectations, and license/authority
review. That lane is better as a later profile-record importer or parameter
reviewer, not the first runtime touch.

### F-12 Decision Threshold Runtime

Rejected as first runtime lane. F-12 depends on retained measured package
fields and threshold/rule authority. It should follow the measured-traffic
package reader so it can reference real package review states instead of
inventing inputs.

### V-02..V-06 External Validation Runtime

Rejected as first runtime lane. The manifest schema is now ready, but the
external validation surface has the widest authority dependency: Windows/WSL,
tunnels, NAT/ESTNeT/INET, virtual DUT, physical DUT, traffic generators,
redaction policy, and owner verdicts. It should follow a smaller package
reviewer pattern.

### Synthetic Fixture Runtime

Rejected as first runtime lane. S11 defines the synthetic fixture boundary, but
creating synthetic runtime paths before an importer exists would increase the
risk that generated examples become confused with retained evidence.

## F-07R1 Locked Boundary

The first implementation child should build only a package review/import
readiness path. It must not generate traffic, run external tests, connect to
devices, infer metrics from modeled route state, or promote any reviewer state
to authority by default.

Allowed implementation outcomes for the future runtime child:

- read or validate an explicitly named local manifest/package path under
  `output/validation/external-f07-f09/`;
- report package states such as `missing`, `incomplete`, `importable`,
  `redacted-reviewable`, or `rejected` according to the data contract;
- surface raw artifact reference coverage and unresolved threshold state;
- reject or quarantine synthetic source tiers in measured package context;
- emit repo-owned review output that is labeled package-review readiness only;
- add smoke/tests that use temp-only or inline test data, unless a later prompt
  explicitly authorizes checked-in fixture files.

Forbidden implementation outcomes:

- live `ping`, `iperf`, tunnel, NAT, DUT, NE-ONE, or traffic-generator runs;
- auto-discovery of packages outside the explicitly configured retained path;
- network fetches or vendor tool execution;
- committed synthetic measured package JSON fixtures unless separately
  authorized under S11;
- pass/fail acceptance copy for F-07, F-08, F-09, F-12, or V-02..V-06;
- promotion of screenshots, summaries, or modeled route data into retained raw
  evidence;
- changes to F-12 decision behavior, V-02..V-06 validation verdicts, F-01 orbit
  model behavior, or S4 physical/standards behavior.

## Required Pre-Implementation Review

Before editing runtime/source files, the implementation child must inspect the
existing project structure and propose the exact write set. The write set must
be narrow and should avoid shared presentation code unless a reviewer surface is
explicitly in scope.

The child must check for existing patterns before choosing files:

- validation scripts under `scripts/`;
- retained-output readers or validators;
- route/runtime state surfaces for validation or report export;
- smoke test style for data-contract-driven reviewers;
- existing nonclaim or truth-boundary rendering helpers.

If no matching runtime pattern exists, the child should start with a small
Node-side validator/reviewer rather than a UI route. UI presentation can follow
after the review object shape is stable.

## Acceptance Gate For F-07R1

F-07R1 can close only when the implementation child demonstrates:

- package absence fails closed and produces a non-authority readiness state;
- malformed or incomplete manifests are rejected or marked incomplete with
  actionable gaps;
- synthetic provenance cannot enter the retained measured package path as
  measured evidence;
- reviewer states are per requirement, not a global pass;
- threshold authority is treated as external input;
- raw artifact refs are required for authority-eligible states;
- no live testbed, DUT, NAT/tunnel, radio-layer handover, or customer orbit-model
  behavior is implied.

## Validation Expectations

The future implementation child must run validation scaled to the write set.
Minimum expectations:

- static build or focused TypeScript check if source code changes;
- focused unit or smoke checks for manifest parse/review behavior;
- forbidden-claim scans scoped to edited files and any newly introduced DOM or
  output subtree;
- no broad HUD/root scans when the slice only introduces a package-review
  surface;
- retained evidence path checks must use explicit test fixtures or temp
  directories and must not mutate real retained evidence.

## Handoff Prompt

Use this prompt only in a fresh implementation child conversation:

```text
Role: scenario-globe-viewer F-07R1 implementation child.
Repo: /home/u24/papers/scenario-globe-viewer

Task:
Implement the first bounded runtime-facing package reviewer/importer slice for
F-07/F-08/F-09 measured traffic packages.

Read first:
- docs/sdd/itri-runtime-readiness-decision.md
- docs/data-contracts/itri-measured-traffic-package.md
- docs/data-contracts/itri-external-validation-manifest.md
- docs/data-contracts/itri-decision-threshold-authority.md
- docs/data-contracts/itri-synthetic-fallback-fixtures.md
- docs/sdd/itri-requirement-completion-roadmap.md

Before editing:
- inspect existing validation scripts, package/output readers, report export
  code, and smoke style;
- state the exact write set you will use;
- do not edit unrelated runtime surfaces.

Allowed:
- implement a small package manifest reviewer/importer for explicitly named
  local paths under output/validation/external-f07-f09/;
- add focused tests/smokes using temp-only or inline test data;
- add docs close-out for this runtime slice.

Forbidden:
- no live ping/iperf, network fetch, NAT/tunnel/DUT/NE-ONE execution, or vendor
  tool execution;
- no checked-in measured traffic fixture JSON unless separately authorized;
- no authority pass by default;
- no F-12 decision behavior changes;
- no V-02..V-06 verdict changes;
- no F-01 orbit-model or S4 physical/standards runtime changes.

Required behavior:
- missing package fails closed;
- malformed/incomplete manifest produces actionable gaps;
- synthetic provenance is rejected or quarantined for measured package context;
- reviewer states are per requirement;
- threshold authority remains external;
- raw artifact refs are required for authority-eligible states.

Validation:
- run the repo-appropriate build/type/test checks for the touched write set;
- run focused reviewer/importer tests;
- run forbidden-claim scans scoped to edited files and any new output/DOM
  subtree.

Final response:
- commit SHA;
- edited files;
- validation results;
- explicit nonclaims preserved;
- any residual blockers.
```
