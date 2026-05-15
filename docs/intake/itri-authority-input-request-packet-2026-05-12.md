# customer Authority Input Request Packet

Date: 2026-05-12

Scope:

- Working route:
  `/?scenePreset=regional&m8aV4GroundStationScene=1`
- Working repo:
  `/home/u24/papers/scenario-globe-viewer`
- Packet purpose:
  request customer / external testbed owner authority inputs that cannot be closed
  from public sources or the current repo-local demo.
- Packet status:
  docs-only request baseline. This file does not modify source, tests, runtime
  behavior, retained output evidence, or any pass/fail verdict.

## Executive Boundary

The V4 route is a route-local bounded reviewer-ready demo. It is suitable for
reviewing the current 13-actor ground-station multi-orbit handover presentation,
route-local requirement-gap surfacing, bounded F-09 rate-class/proxy display,
bounded F-10/F-11 modeled policy/rule presets, and bounded F-16 JSON export.

The V4 route is not full customer external validation closure. It does not prove the
complete original customer requirement set, and it does not replace external
authority from customer model owners, V-group / physical-model owners, report-system
owners, or testbed owners.

Until a later retained authority package proves otherwise, the project must not
claim:

- measured throughput, measured latency, measured jitter, measured packet loss,
  measured continuity, live `ping`, or live `iperf` truth;
- live ESTNeT, INET, NAT, tunnel, bridge, real-network, active satellite,
  active gateway, pair-specific teleport path, or native RF handover truth;
- route-native `>=500 LEO` closure from the 13-actor V4 route;
- customer self-developed orbit-model integration;
- external report-system integration or measured-report export;
- virtual DUT, physical DUT, traffic-generator, or NE-ONE pass.

Public official sources are useful as context, method, standards, or service
references. They are not closure evidence for this repo unless a later retained
package ties them to customer-approved parameters, raw project artifacts, and
explicit acceptance criteria.

## Authority Read

This packet was prepared after reading:

- `docs/intake/itri-unclosed-requirement-evidence-intake-matrix.md`
- `docs/intake/itri-public-source-research-register-2026-05-12.md`
- `docs/sdd/itri-f07-f09-measured-traffic-evidence-package-plan.md`
- `output/validation/itri-demo-route-final-closure-2026-05-12.md`
- `output/validation/external-v02-v06/2026-05-11T16-59-27.404Z-external-validation/summary.json`
- `docs/sdd/itri-demo-route-requirement-closure-sdd.md`
- `docs/sdd/itri-v02-v06-external-validation-evidence-package-plan.md`
- `docs/sdd/itri-v02-v06-external-validation-readiness-package.md`
- `docs/sdd/m8a-v4.12-f16-statistics-report-export-plan.md`
- `docs/sdd/itri-v4-demo-view-redesign-plan.md`
- `docs/sdd/m8a-v4.11-content-and-visual-followup-spec.md`
- `docs/data-contracts/physical-input.md`
- `docs/data-contracts/phase7.1-validation-evidence.md`
- `/home/u24/papers/itri/README.md`
- `/home/u24/papers/itri/itri-acceptance-report-2026-04-20/01-itri-requirement-inventory-and-status.md`
- `/home/u24/papers/itri/itri-acceptance-report-2026-04-20/04-external-stack-dependencies.md`
- `output/validation/phase7.1/2026-05-11T16-43-23.879Z-phase7-1-first-slice/summary.json`

Authority availability note:

- `/home/u24/papers/itri/v4-quickstart.md`,
  `/home/u24/papers/itri/v4.md`, and `/home/u24/papers/itri/v3.md` are named by
  the workspace authority order, but they are absent in this checkout. This
  packet therefore follows the same fallback used by the route SDD and external
  readiness docs: `itri/README.md`, the acceptance report, and repo-local
  route/evidence SDDs.

## Request Groups

### F-01 Orbit Model Authority

Current repo status:

- The route uses viewer-owned projected artifacts and source-lineaged display
  actors.
- It is not integrated with customer's self-developed orbit model.
- F-01 remains `external-validation-required` for full closure.

Why public data is insufficient:

- customer public NTN / LEO pages establish context only.
- No public source found in the retained research register publishes the
  authoritative customer orbit-model package, API, schema, reference frames,
  propagator, time basis, validation vectors, or acceptance criteria.

Questions for customer orbit-model owner:

1. What is the authoritative orbit-model package, repository, API, or file
   bundle for this project?
2. Which input formats are mandatory: TLE, ephemeris, CZML, custom JSON, or
   another format?
3. Which propagator, coordinate/reference frame, time scale, epoch handling,
   and interpolation rules are authoritative?
4. Which LEO/MEO/GEO scenarios and satellite counts are required for F-01
   acceptance?
5. Which validation vectors prove correct integration, and what tolerance is
   accepted for position/time comparison?
6. May the model or vectors be redistributed in this repo, retained only in
   private output packages, or referenced by redacted path only?

Required artifacts:

- Orbit-model package/specification.
- Input and output schemas.
- Reference-frame and time-basis notes.
- TLE/ephemeris fixture inputs.
- Expected output vectors and tolerance rules.
- Redistribution/redaction policy.
- Owner-approved pass/fail criteria.

Expected retained location if supplied:

```text
docs/intake/authority-supplied/f01-orbit-model/<date-or-package-id>/
output/validation/external-f01/<timestamp>-orbit-model-validation/
```

Claims still forbidden until artifacts arrive:

- customer orbit-model integration.
- Active satellite truth.
- Native orbit closure.
- TLE or ephemeris acceptance beyond bounded repo fixture/demo scope.

### F-07/F-08/F-09 Measured Traffic Authority

Current repo status:

- F-07 and F-08 are bounded repo-owned seams with modeled timing/report state.
- F-09 is a bounded route representation plus external-validation-required.
- The route contains no measured `ping`, `iperf`, latency, jitter, throughput,
  packet-loss, or handover-continuity truth.
- `docs/sdd/itri-f07-f09-measured-traffic-evidence-package-plan.md` defines a
  future evidence package only.

Why public data is insufficient:

- INET and iPerf official docs support method and parser planning.
- They do not provide this project's topology, endpoints, command transcripts,
  raw traffic output, thresholds, or measured results.
- Operator/service public pages do not prove project-specific Mbps/Gbps,
  latency, jitter, packet loss, or continuity.

Questions for customer / testbed traffic owner:

1. Which endpoints are authoritative for F-07/F-08/F-09 measurement?
2. Which topology is required: direct host-to-host, ESTNeT/INET, NAT bridge,
   tunnel/bridge, virtual DUT, physical DUT, NE-ONE, or a combination?
3. Which tools are authoritative: OS `ping`, INET PingApp, `iperf3`, NE-ONE, or
   another traffic generator?
4. Which traffic directions, protocols, ports, durations, intervals, stream
   counts, payload sizes, and UDP target rates are required?
5. Which thresholds define pass/fail for latency, jitter, throughput, packet
   loss, sample count, outage, and continuity?
6. How should handover events be generated, timestamped, and correlated with
   traffic logs?
7. What redaction is allowed for IPs, hostnames, operators, DUT identifiers,
   configs, screenshots, packet captures, and raw logs?
8. Which clock source and synchronization method are required across hosts,
   WSL, ESTNeT/INET, DUTs, and traffic generators?

Required artifacts:

- Topology and packet-path description.
- Environment, interface, route, NAT, tunnel, and bridge inventories.
- Command transcripts with timestamps and exit codes.
- Raw `ping` logs.
- Raw `iperf3` or traffic-generator logs, preferably including client JSON and
  server output when `iperf3` is used.
- Handover event timeline and correlation notes.
- Threshold authority and per-requirement verdict notes.
- Redaction policy.

Expected retained location if supplied:

```text
output/validation/external-f07-f09/<timestamp>-measured-traffic/
```

Claims still forbidden until artifacts arrive:

- Measured communication time.
- Measured statistics.
- Measured throughput, Mbps/Gbps, latency, jitter, packet loss, or continuity.
- Live `ping` or `iperf` closure.
- F-07/F-08/F-09 external measured closure from modeled/demo surfaces.

### F-10/F-11 Policy / Rule Authority

Current repo status:

- The V4 route exposes bounded route-local modeled policy and rule presets.
- F-10 is not live policy push, backend control, active gateway/satellite
  selection, or native RF handover.
- F-11 is not an arbitrary rule editor or live rule engine.

Why public data is insufficient:

- Public sources do not define customer handover policy semantics, allowed
  parameters, operator permissions, persistence rules, rollback behavior, or
  simulator/testbed side effects.
- INET method docs can inform simulator behavior, but they do not define customer
  policy/rule authority.

Questions for customer product / simulator-control owner:

1. Which policy families and rule parameters are mandatory for F-10/F-11?
2. Are operator choices expected to affect UI replay only, simulator state, or
   real testbed traffic?
3. Are rules preset-only, form-editable, importable as files, or fully
   arbitrary?
4. What validation proves that a policy/rule change took effect?
5. What safety constraints prevent unintended live-network side effects?
6. Are policies/rules persistent, session-only, reversible, or auditable?
7. What exact wording may the UI use to describe bounded policy/rule behavior
   without implying live control?

Required artifacts:

- Policy/rule model or DSL.
- Allowed parameter list with units and ranges.
- Preset definitions, if presets are authoritative.
- Simulator/control integration contract, if live or external effects are
  required.
- Validation traces showing inputs, state transitions, outputs, and rollback.
- Safety, persistence, and audit requirements.

Expected retained location if supplied:

```text
docs/intake/authority-supplied/f10-f11-policy-rules/<date-or-package-id>/
output/validation/external-f10-f11/<timestamp>-policy-rule-validation/
```

Claims still forbidden until artifacts arrive:

- Live policy control.
- Active gateway or active satellite control.
- Native RF handover.
- Arbitrary rule editing.
- Backend/live rule-engine truth.
- Real-network side effects from route-local presets.

### F-13 Scale / Freshness Acceptance

Current repo status:

- The V4 route is intentionally a 13-actor demo route.
- F-13 now has a route-exposed fixture/model-backed scale readiness surface on
  the canonical route, but route-native `>=500 LEO` closure/proof is still not
  complete.
- The readiness surface reports `549` total readiness/demo points, including
  `540` LEO, `6` MEO, and `3` GEO points, from repo-local fixture/model-backed
  input.
- The readiness data/source status is `fixture/model-backed`, source URL
  `not-applicable-repo-local-fixture`, no public-source retrieval used, built
  and freshness timestamp `2026-05-12T09:53:20Z`.
- F-13 readiness artifacts are retained at
  `output/itri-demo-route-f13-scale-readiness/desktop-1440x900-f13-scale-readiness.json`
  and
  `output/itri-demo-route-f13-scale-readiness/desktop-1440x900-f13-scale-readiness.png`.
- A separate Phase 7.1 evidence boundary currently reports `540` LEO points and
  `549` total overlay points in
  `output/validation/phase7.1/2026-05-11T16-43-23.879Z-phase7-1-first-slice/summary.json`.
- That retained artifact has `retentionDays: 14` and expires for current
  citation after `2026-05-25T16:43:23.879Z` UTC unless rerun.

Why public data is insufficient:

- Public constellation pages can show that real LEO constellations exceed
  500 satellites.
- They do not prove this route's runtime scale, the freshness of retained local
  evidence, customer acceptance of a source constellation, or whether route-native
  scale is required.
- The new readiness surface did not use public-source retrieval and does not
  convert public constellation context into project proof.

Questions for customer / validation owner:

1. Does F-13 require route-native `>=500 LEO`, separate viewer-side validation
   evidence, or both?
2. Which constellation source is acceptable for scale validation?
3. Is the fixture/model-backed readiness surface acceptable as reviewer demo
   evidence while remaining non-closure?
4. Is the existing Phase 7.1 harness acceptable as the F-13 evidence boundary?
5. What freshness window is acceptable for review, and must it remain 14 days?
6. Are MEO/GEO non-zero counts required together with the `>=500 LEO` count?
7. What rerun command, owner, and artifact retention process should be used
   before formal review?

Required artifacts:

- customer acceptance note for route-native vs separate-harness scale closure.
- Approved constellation/source input.
- Explicit decision on whether repo-local fixture/model-backed readiness/demo
  input is acceptable for review and what it does not close.
- Fresh Phase 7.1 or successor scale package.
- Harness parameters, observed counts, pass/fail summary, known gaps, and
  retention policy.

Expected retained location if supplied:

```text
output/validation/phase7.1/<timestamp>-phase7-1-first-slice/
output/validation/external-f13/<timestamp>-scale-authority/
output/itri-demo-route-f13-scale-readiness/
```

Claims still forbidden until artifacts arrive:

- Route-native `>=500 LEO` closure/proof from the 13-actor V4 route or from
  fixture/model-backed readiness input alone.
- Current F-13 acceptance after retained evidence freshness expires.
- Acceptance of any public constellation source as project scale proof without
  customer approval.
- Full customer external validation closure from the readiness surface.

### F-16 External Report System Authority

Current repo status:

- The V4 route exposes a bounded route-local JSON export for demo-owned state.
- Existing F-16 route export is not an external report-system integration.
- It is not measured-report export and does not attach raw `ping`, `iperf`,
  DUT, NE-ONE, NAT, tunnel, or bridge evidence.

Why public data is insufficient:

- No public source defines the customer target report system, destination, schema,
  authentication, accepted fields, attachment model, provenance rules, or
  redaction policy.
- Existing route export can inform local schema only.

Questions for customer report-system owner:

1. What is the target report system or file-exchange destination?
2. Which formats are accepted: JSON, CSV, PDF, signed archive, portal upload, or
   another format?
3. Which schema fields and attachments are required?
4. Are raw logs attached, summarized, linked, or excluded?
5. What authentication, naming, retention, versioning, and submission process is
   required?
6. What redaction policy applies to endpoint IDs, IPs, DUT identifiers,
   operators, screenshots, configs, and packet captures?
7. Does customer accept bounded/proxy route export as partial F-16 review material,
   or only external measured report-system submission?

Required artifacts:

- External report-system contract or submission instructions.
- Schema and example accepted report.
- Auth or sandbox endpoint/file-exchange process, if applicable.
- Redaction and attachment policy.
- Accepted submission receipt or validation log for any future test submission.

Expected retained location if supplied:

```text
docs/intake/authority-supplied/f16-report-system/<date-or-package-id>/
output/validation/external-f16/<timestamp>-report-system-submission/
```

Claims still forbidden until artifacts arrive:

- External report-system integration.
- Measured report export.
- Accepted report submission.
- Raw external validation attachment support.
- Full F-16 external closure from route-local JSON download.

### F-17/P-01/P-02/P-03 V-Group / ITU / Physical Model Authority

Current repo status:

- The repo has bounded physical-input seams for antenna, rain attenuation, and
  ITU-style families.
- Current values are bounded proxies projected into demo decision metrics.
- The route does not contain a standards-backed propagation engine, calibrated
  rain attenuation, validated antenna model, or V-group integration.

Why public data is insufficient:

- ITU-R recommendations provide candidate standards authority.
- They do not select the required recommendation versions, frequency bands,
  rain-rate source, geography, antenna parameters, polarization, elevation
  angles, link-budget assumptions, validation vectors, or acceptable
  approximation level for this project.
- Public customer pages do not publish the V-group input format or physical-model
  parameter set.

Questions for customer V-group / physical-model owner:

1. What is the authoritative V-group input format and interface?
2. Which ITU-R recommendations and versions are mandatory?
3. Which frequency bands, polarizations, elevation-angle ranges, antenna
   patterns, gains, and terminal classes apply?
4. Which rain-rate source, geography, availability target, and rain-height model
   apply?
5. Which outputs close the requirement: attenuation, link margin, availability,
   decision metric deltas, or visual scenario state?
6. What validation vectors, units, tolerances, and pass/fail thresholds are
   required?
7. What approximation level is acceptable for demo, prototype, and acceptance?
8. Which fields may be public, redacted, or private-only?

Required artifacts:

- V-group schema/interface.
- Selected ITU-R recommendations and versions.
- Antenna, rain, atmosphere, frequency, geometry, and link-budget parameters.
- Validation vectors with expected outputs.
- Unit/tolerance/threshold definitions.
- Redaction and redistribution policy.

Expected retained location if supplied:

```text
docs/intake/authority-supplied/f17-p-group-physical-model/<date-or-package-id>/
output/validation/external-f17-p-group/<timestamp>-physical-model-validation/
```

Claims still forbidden until artifacts arrive:

- Standards-backed physical truth.
- Calibrated rain attenuation.
- Validated antenna gain or antenna pattern behavior.
- ITU compliance for project outputs.
- Link-margin or atmospheric-loss truth.
- V-group integration.

### V-02..V-06 External Testbed Authority

Current repo status:

- The retained package at
  `output/validation/external-v02-v06/2026-05-11T16-59-27.404Z-external-validation/`
  is negative/gap evidence.
- `summary.json` reports all five IDs as `fail`.
- V-02 has partial Windows 11 + WSL2 environment context only.
- V-03 through V-06 lack retained tunnel/bridge, NAT/ESTNeT/INET, virtual DUT,
  physical DUT, NE-ONE, `ping`, or `iperf` proof.

Why public data is insufficient:

- INET/OMNeT++ docs can support testbed planning and terminology.
- They do not prove the customer Windows/WSL host, tunnel endpoints, NAT rules,
  ESTNeT/INET topology, DUT identity, NE-ONE profile, or traffic results.
- The kickoff examples provide topology direction, but current addresses and
  acceptance status still require testbed owner confirmation.

Questions for external testbed owner:

1. What exact Windows host, WSL distro, ESTNeT build, OMNeT++/INET build,
   virtual DUT image, physical DUT, and NE-ONE version are authoritative?
2. Are kickoff values such as `tun0`, `tun1`, `tun_bridge.py :9001/:9002`,
   `192.168.2.x`, and `140.96.29.x` current, illustrative, or obsolete?
3. What tunnel/bridge implementation, endpoints, ports, bind addresses, and log
   files must be retained?
4. What NAT/routing topology, gateway mapping, virtual interfaces, route tables,
   and forwarding rules must be retained?
5. What traffic path proves V-03 and V-04: `ping`, `iperf`, packet capture,
   bridge logs, INET logs, or a combined evidence set?
6. What virtual DUT testbench package, command, traffic profile, and pass/fail
   rule closes V-05?
7. What physical DUT or NE-ONE configuration, profile, ports, timing, and raw
   output closes V-06?
8. Which artifacts may be redacted, and what redaction would make the package
   audit-blocking?
9. Who signs off the final `summary.json` per-ID verdicts?

Required artifacts:

- Fresh external validation package following
  `docs/sdd/itri-v02-v06-external-validation-readiness-package.md`.
- `summary.json`, `review.md`, topology, environment, interface, route, NAT,
  bridge, command, traffic, DUT, NE-ONE, and redaction artifacts.
- Raw `ping` / `iperf` / DUT / NE-ONE logs where applicable.
- Per-ID `pass`, `fail`, or `gap` reasons.

Expected retained location if supplied:

```text
output/validation/external-v02-v06/<timestamp>-external-validation/
```

Claims still forbidden until artifacts arrive:

- Windows/WSL tunnel validated.
- Live ESTNeT/INET validation passed.
- Tunnel/bridge validation passed.
- NAT routing or simulated-to-real bridge validation passed.
- Virtual DUT pass.
- Physical DUT pass.
- Traffic-generator or NE-ONE pass.
- Live `ping` or `iperf` measured.

## Priority Table

| Priority | Input | Required before | Owner | Expected artifact path |
| --- | --- | --- | --- | --- |
| P0 | F-07/F-08/F-09 raw measured traffic logs, topology, thresholds, and verdict authority | Any measured communication-time, statistics, latency, jitter, throughput, packet-loss, continuity, `ping`, or `iperf` pass/fail claim | customer/testbed traffic owner | `output/validation/external-f07-f09/<timestamp>-measured-traffic/` |
| P0 | V-02..V-06 fresh external validation package with raw topology, NAT, tunnel/bridge, DUT, NE-ONE, and traffic evidence | Any Windows/WSL, ESTNeT/INET, NAT, tunnel, bridge, virtual DUT, physical DUT, traffic-generator, or NE-ONE pass/fail claim | External testbed owner | `output/validation/external-v02-v06/<timestamp>-external-validation/` |
| P0 | F-16 external report-system contract and accepted submission evidence | Any external report-system integration or accepted measured-report export claim | customer report-system owner | `output/validation/external-f16/<timestamp>-report-system-submission/` |
| P0 | F-13 readiness-surface acceptance decision, fresh scale evidence, or explicit customer acceptance of a separate-harness artifact | Any current `>=500 LEO` acceptance claim after freshness review, any route-native scale claim, or any customer authority acceptance claim from fixture/model-backed readiness input | Repo validation owner / customer validation owner | `docs/intake/itri-f13-scale-readiness-evidence-addendum-2026-05-12.md`, `output/itri-demo-route-f13-scale-readiness/`, and/or `output/validation/phase7.1/<timestamp>-phase7-1-first-slice/` |
| P1 | F-01 orbit-model package, schema, frames, vectors, and tolerances | Any implementation/prototype that claims customer model integration rather than placeholder adapter work | customer orbit-model owner | `docs/intake/authority-supplied/f01-orbit-model/<date-or-package-id>/` |
| P1 | F-10/F-11 policy/rule model, allowed parameters, validation traces, and safety constraints | Any implementation/prototype beyond bounded route-local replay presets | customer product owner / simulator-control owner | `docs/intake/authority-supplied/f10-f11-policy-rules/<date-or-package-id>/` |
| P1 | F-17/P-01/P-02/P-03 V-group schema, selected ITU versions, physical parameters, and validation vectors | Any implementation/prototype that claims standards-backed physical modeling or V-group integration | customer V-group / physical-model owner | `docs/intake/authority-supplied/f17-p-group-physical-model/<date-or-package-id>/` |
| P2 | Report naming, CSV-vs-JSON preference, and reviewer packaging polish | Cleaner handoff material after authority and pass/fail blockers are settled | customer reviewer / report owner | `docs/intake/authority-supplied/f16-report-system/<date-or-package-id>/` |
| P2 | Visual wording preferences for bounded demo labels and nonclaim copy | UI/documentation polish, not evidence closure | customer reviewer / product owner | `docs/intake/authority-supplied/reviewer-copy/<date-or-package-id>/` |
| P2 | Optional packet-capture permission and screenshot redaction preferences | Richer diagnostics where raw command logs already satisfy minimum evidence | Testbed owner / security owner | Relevant external validation package `redactions.md` |

## Response Template

customer / testbed owner may copy this form once per request group or artifact.

```text
Request group:
Requirement IDs:
Owner / organization:
Technical contact:
Authority source:
  [ ] customer internal spec
  [ ] Testbed run artifact
  [ ] External system contract
  [ ] Standards selection
  [ ] Other:
Authority source ID / version:
Artifact path or transfer location:
Artifact retention permission:
  [ ] Commit-safe documentation
  [ ] Retain under output/validation only
  [ ] Private path reference only
  [ ] Redacted copy required
Redaction policy:
Threshold / acceptance rule:
Required tool or system version:
Expected run date / evidence date:
Acceptance status:
  [ ] Accepted authority
  [ ] Accepted with redactions
  [ ] Gap / not enough evidence
  [ ] Failed run retained
  [ ] Rejected / obsolete
Reviewer notes:
Claims this artifact authorizes:
Claims still forbidden:
```

## Nonclaims

This packet does not claim:

- the original customer requirement set is fully closed;
- the V4 route is more than a route-local bounded reviewer-ready demo;
- the V4 route has measured throughput, measured latency, measured jitter,
  measured packet loss, measured handover continuity, live `ping`, or live
  `iperf` truth;
- the V4 route has live ESTNeT, INET, NAT, tunnel, bridge, DUT, traffic
  generator, NE-ONE, or real-network truth;
- the V4 route has active satellite truth, active gateway truth, pair-specific
  teleport path truth, or native RF handover truth;
- the 13-actor V4 route is route-native `>=500 LEO` scale validation;
- fixture/model-backed F-13 readiness/demo input is customer authority acceptance
  or route-native `>=500 LEO` closure/proof;
- public customer pages publish the private customer orbit-model implementation;
- public operator/service pages prove project-specific throughput or endpoint
  path truth;
- ITU recommendations alone close physical/rain/antenna requirements without
  customer-selected parameters and validation vectors;
- bounded F-10/F-11 route presets are live policy/rule control;
- bounded F-16 route JSON export is an external report-system submission;
- the retained V-02..V-06 package passed external validation.
