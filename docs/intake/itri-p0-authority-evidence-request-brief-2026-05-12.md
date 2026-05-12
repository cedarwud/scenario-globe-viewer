# ITRI P0 Authority And Evidence Request Brief

Date: 2026-05-12

Scope:

- Working route:
  `/?scenePreset=regional&m8aV4GroundStationScene=1`
- Working repo:
  `/home/u24/papers/scenario-globe-viewer`
- Brief purpose:
  outbound request and response tracker for ITRI / testbed-owner inputs that
  block P0 evidence closure.
- Edit boundary:
  docs-only. This brief does not modify source, tests, runtime behavior, or
  retained output evidence.

## One-Page Executive Summary

The V4 route is a route-local bounded reviewer-ready demo. It is appropriate
for reviewing the current 13-actor ground-station multi-orbit handover
presentation, bounded route-local requirement-gap surfacing, modeled F-09 rate
class/proxy display, modeled F-10/F-11 policy and rule presets, and bounded
F-16 JSON export.

The V4 route is not full ITRI external validation closure. It does not prove
the complete original ITRI requirement set, and it does not replace authority
from ITRI model owners, traffic/testbed owners, report-system owners, or repo
validation owners.

Public sources have filled in context, method, standards, tool-capability, and
service-background material. They support better request wording and evidence
package design, but they do not change closure status. The route still has no
retained measured `ping`, `iperf`, latency, jitter, throughput, packet-loss, or
handover-continuity truth. It also has no retained live ESTNeT/INET, NAT,
tunnel, bridge, DUT, NE-ONE, active satellite, active gateway, active path, or
external report-system closure.

The immediate P0 outbound asks are therefore narrow:

1. Obtain F-07/F-08/F-09 measured traffic logs plus ITRI-approved thresholds.
2. Obtain a fresh V-02..V-06 external testbed package.
3. Obtain the F-16 external report-system contract and accepted-submission
   evidence path.
4. Obtain an F-13 decision on freshness and whether the fixture/model-backed
   readiness/demo surface is acceptable for review, and whether acceptance
   requires separate harness evidence, route-native `>=500 LEO`, ITRI-approved
   source input, or some combination.

F-01 ITRI orbit/model authority remains an authority gate for any orbit-model
integration claim. It is included below as an owner request block so the
outbound package is complete, but the existing intake packet classifies it
outside the P0 execution table unless ITRI asks to close orbit-model
integration in this same review window.

## P0 Request Table

| P0 ask | Owner | Exact outbound request | Required artifact | Expected retained path | Claim it would unlock | Claim still forbidden without it |
| --- | --- | --- | --- | --- | --- | --- |
| F-07/F-08/F-09 measured traffic logs and thresholds | ITRI/testbed traffic owner | Provide raw measured traffic evidence, topology, endpoints, command transcripts, handover timing, redaction policy, and pass/fail thresholds for communication time, statistics, and throughput. | Raw `ping` logs, raw `iperf3` or approved traffic-generator logs, topology, environment, interface/route/NAT/tunnel/bridge inventory, handover timeline, threshold authority, and verdict notes. | `output/validation/external-f07-f09/<timestamp>-measured-traffic/` | Measured F-07 communication time, F-08 measured statistics, and F-09 measured throughput verdicts for the retained path only. | Measured throughput, latency, jitter, packet loss, continuity, live `ping`, live `iperf`, and external measured closure. |
| V-02..V-06 external testbed package | External testbed owner | Provide a fresh external validation package proving or failing Windows/WSL, tunnel/bridge, NAT/ESTNeT/INET, virtual DUT, and physical DUT or traffic-generator evidence. | `summary.json`, `review.md`, topology, environment, interface, route, NAT, bridge, command, traffic, DUT, NE-ONE, and redaction artifacts, with raw logs where applicable. | `output/validation/external-v02-v06/<timestamp>-external-validation/` | Per-ID V-02..V-06 pass/fail/gap verdicts tied to retained external artifacts. | Live ESTNeT, INET, NAT, tunnel, bridge, virtual DUT, physical DUT, traffic-generator, or NE-ONE validation. |
| F-16 external report-system contract | ITRI report-system owner | Provide the target external report-system contract, submission process, schema, auth/redaction rules, required attachments, and accepted-submission evidence path. | Contract or submission instructions, schema, example accepted report, sandbox or file-exchange process, redaction/attachment policy, and future submission receipt or validation log. | `docs/intake/authority-supplied/f16-report-system/<date-or-package-id>/` and `output/validation/external-f16/<timestamp>-report-system-submission/` | External report-system integration and accepted measured-report export, after a retained accepted submission exists. | External report-system closure, accepted submission, and measured-report export from route-local JSON alone. |
| F-13 freshness / route-native acceptance decision | Repo validation owner with ITRI validation owner | Decide whether the fixture/model-backed readiness/demo surface is acceptable for review, and whether F-13 acceptance requires fresh separate Phase 7.1 evidence, route-native `>=500 LEO`, ITRI-approved source input, or some combination; rerun freshness evidence when needed. | ITRI acceptance note, approved constellation/source input, readiness addendum, fresh Phase 7.1 or successor package, observed counts, harness params, known gaps, and retention policy. | `docs/intake/itri-f13-scale-readiness-evidence-addendum-2026-05-12.md`, `output/itri-demo-route-f13-scale-readiness/`, `output/validation/phase7.1/<timestamp>-phase7-1-first-slice/`, and/or `output/validation/external-f13/<timestamp>-scale-authority/` | Current F-13 acceptance through an approved fresh evidence boundary, or an explicit route-native implementation requirement decision. | Route-native `>=500 LEO`, current F-13 acceptance after evidence expiry, ITRI authority acceptance from fixture/model-backed input alone, and acceptance of public constellation context as project proof. |

## Per-Owner Request Blocks

### ITRI Orbit / Model Owner

Exact question:

What is the authoritative ITRI orbit-model package, API, schema, time basis,
reference frame, propagator, fixture set, validation vector set, tolerance
rule, and redistribution/redaction policy for this project?

Required artifact:

- Orbit-model package or specification.
- Input and output schemas.
- Reference-frame, time-scale, epoch, propagation, and interpolation notes.
- TLE, ephemeris, CZML, or custom fixture inputs as applicable.
- Expected output vectors and tolerance rules.
- Redistribution, private-retention, or redaction policy.
- Owner-approved pass/fail criteria.

Expected retained path:

```text
docs/intake/authority-supplied/f01-orbit-model/<date-or-package-id>/
output/validation/external-f01/<timestamp>-orbit-model-validation/
```

What claim it would unlock:

It could unlock an ITRI orbit-model integration claim after the supplied model
or contract is implemented and validated against the retained vectors.

What claim remains forbidden without it:

ITRI orbit-model integration, native orbit closure, active satellite truth, and
TLE/ephemeris acceptance beyond bounded repo fixture or demo scope remain
forbidden.

### ITRI / Testbed Traffic Owner

Exact question:

Which endpoints, topology, tools, directions, protocols, ports, durations,
sample counts, payload sizes, stream counts, UDP target rates, clock source,
handover event timing, and pass/fail thresholds are authoritative for
F-07/F-08/F-09 measured traffic?

Required artifact:

- Topology and packet-path description.
- Source and target endpoint identities.
- Environment, interface, route, NAT, tunnel, and bridge inventories.
- Command transcripts with timestamps and exit codes.
- Raw `ping` logs.
- Raw `iperf3` client JSON and server output, or approved traffic-generator
  output.
- Handover event timeline and correlation notes.
- Threshold authority for latency, jitter, throughput, packet loss, outage,
  sample count, duration, and continuity.
- Redaction policy and auditability notes.

Expected retained path:

```text
output/validation/external-f07-f09/<timestamp>-measured-traffic/
```

What claim it would unlock:

It could unlock measured F-07/F-08/F-09 verdicts for communication time,
statistics, latency, jitter, throughput, packet loss, and continuity, limited
to the retained topology and evidence package.

What claim remains forbidden without it:

Measured throughput, latency, jitter, packet loss, handover continuity, live
`ping`, live `iperf`, and F-07/F-08/F-09 external measured closure remain
forbidden.

### External Testbed Owner

Exact question:

What exact Windows/WSL host, ESTNeT/OMNeT++/INET build, tunnel/bridge
implementation, NAT/routing topology, virtual DUT package, physical DUT or
NE-ONE profile, traffic path, redaction policy, and per-ID verdict authority
close V-02 through V-06?

Required artifact:

- Fresh external validation package following the retained readiness-package
  shape.
- `summary.json` with V-02..V-06 per-ID `pass`, `fail`, or `gap` reasons.
- `review.md`, topology, environment, interface, route, NAT, bridge, command,
  traffic, DUT, NE-ONE, and redaction artifacts.
- Raw `ping`, `iperf`, packet-path, DUT, or NE-ONE logs where applicable.
- Sign-off or reviewer notes identifying who owns the final verdicts.

Expected retained path:

```text
output/validation/external-v02-v06/<timestamp>-external-validation/
```

What claim it would unlock:

It could unlock retained external V-02..V-06 verdicts for Windows/WSL,
tunnel/bridge, NAT/ESTNeT/INET, virtual DUT, and physical DUT or
traffic-generator evidence.

What claim remains forbidden without it:

Live ESTNeT, INET, NAT, tunnel, bridge, simulated-to-real path, virtual DUT,
physical DUT, traffic-generator, NE-ONE, live `ping`, and live `iperf`
validation remain forbidden.

### ITRI Report-System Owner

Exact question:

What external report system or file-exchange destination receives F-16 reports,
which schema and attachments are required, how are raw logs referenced or
attached, what auth/redaction/naming/versioning rules apply, and what artifact
proves accepted submission?

Required artifact:

- External report-system contract or submission instructions.
- Required JSON, CSV, PDF, archive, portal-upload, or other format definition.
- Schema fields, attachment rules, provenance rules, and example accepted
  report.
- Auth or sandbox/file-exchange process if applicable.
- Redaction and retention policy for endpoint IDs, IPs, DUT identifiers,
  operators, screenshots, configs, packet captures, and raw logs.
- Accepted submission receipt or validation log for any future test submission.

Expected retained path:

```text
docs/intake/authority-supplied/f16-report-system/<date-or-package-id>/
output/validation/external-f16/<timestamp>-report-system-submission/
```

What claim it would unlock:

It could unlock external report-system integration and accepted measured-report
export after an accepted submission is retained.

What claim remains forbidden without it:

External report-system closure, accepted report submission, measured-report
export, and raw external-validation attachment support remain forbidden.

### Repo Validation Owner

Exact question:

Does F-13 acceptance rely on a fresh separate Phase 7.1 evidence boundary,
route-native `>=500 LEO`, fixture/model-backed readiness/demo evidence,
ITRI-approved source input, or some combination, and what rerun command, source
constellation, freshness window, retention policy, and reviewer wording should
be used before formal review?

Current repo status:

- The canonical route now exposes a fixture/model-backed F-13 readiness/demo
  surface.
- Readiness input reports `549` total points and `540` LEO points from
  repo-local walker-derived multi-orbit scale fixture/model data.
- Source URL is `not-applicable-repo-local-fixture`; no public-source retrieval
  was used.
- Built/freshness timestamp is `2026-05-12T09:53:20Z`.
- Evidence artifacts are retained under `output/itri-demo-route-f13-scale-readiness/`.
- This is readiness/demo evidence only. It is not route-native `>=500 LEO`
  closure/proof and not ITRI authority acceptance.

Required artifact:

- ITRI or reviewer acceptance note for separate-harness versus route-native
  scale closure.
- Explicit note on whether fixture/model-backed readiness/demo input is
  acceptable for review and what it does not close.
- Approved constellation or source input.
- Fresh Phase 7.1 or successor scale package when freshness is required.
- Harness parameters, observed counts, pass/fail summary, known gaps, and
  retention policy.
- Rerun owner and review-date notes.

Expected retained path:

```text
docs/intake/itri-f13-scale-readiness-evidence-addendum-2026-05-12.md
output/itri-demo-route-f13-scale-readiness/
output/validation/phase7.1/<timestamp>-phase7-1-first-slice/
output/validation/external-f13/<timestamp>-scale-authority/
```

What claim it would unlock:

It could unlock F-13 acceptance through an approved fresh evidence boundary, or
produce an explicit decision that route-native `>=500 LEO` must be implemented
before acceptance.

What claim remains forbidden without it:

Route-native `>=500 LEO`, current F-13 acceptance after retained evidence
freshness expires, ITRI authority acceptance from fixture/model-backed input
alone, and public constellation context as project scale proof remain forbidden.

## Response Tracker

| Owner | Due date | Response status | Artifact received | Redaction status | Reviewer verdict | Follow-up needed |
| --- | --- | --- | --- | --- | --- | --- |
| ITRI orbit/model owner | TBD by delivery owner | Not sent | No | Unreviewed | Pending | Confirm whether F-01 is in this review window or remains a later authority gate. |
| ITRI/testbed traffic owner | TBD by delivery owner | Not sent | No | Unreviewed | Pending | Request thresholds and raw F-07/F-08/F-09 traffic package. |
| External testbed owner | TBD by delivery owner | Not sent | No | Unreviewed | Pending | Request fresh V-02..V-06 package and per-ID verdict sign-off. |
| ITRI report-system owner | TBD by delivery owner | Not sent | No | Unreviewed | Pending | Request F-16 schema, destination, redaction, and accepted-submission proof. |
| Repo validation owner | Before formal review or before Phase 7.1 freshness expiry | Not sent | No | Unreviewed | Pending | Decide readiness-surface acceptance, Phase 7.1 rerun timing, and route-native scale requirement. |

## Forbidden Claims

Until later retained authority and evidence packages prove otherwise, this
brief preserves the existing forbidden-claim boundary. Do not claim:

- measured throughput, measured latency, measured jitter, measured packet loss,
  measured continuity, live `ping`, or live `iperf` truth;
- live ESTNeT, INET, NAT, tunnel, bridge, DUT, traffic-generator, or NE-ONE
  validation;
- active satellite truth, active gateway truth, or active path truth;
- route-native `>=500 LEO` closure from the 13-actor V4 route;
- ITRI authority acceptance or external F-13 closure from fixture/model-backed
  readiness/demo evidence alone;
- ITRI orbit-model integration;
- external report-system closure or accepted measured-report export.

## Source Basis

This brief was prepared from the existing intake, SDD, and validation files:

- `docs/intake/itri-unclosed-requirement-evidence-intake-matrix.md`
- `docs/intake/itri-public-source-research-register-2026-05-12.md`
- `docs/intake/itri-search-source-delta-review-2026-05-12.md`
- `docs/intake/itri-authority-input-request-packet-2026-05-12.md`
- `docs/sdd/itri-f07-f09-measured-traffic-evidence-package-plan.md`
- `output/validation/itri-demo-route-final-closure-2026-05-12.md`

No new source research, runtime validation, source change, test change, or
output evidence mutation is claimed by this brief.
