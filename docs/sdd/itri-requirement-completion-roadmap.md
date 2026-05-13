# ITRI Requirement Completion Roadmap

Date: 2026-05-13

Status: docs-only SDD roadmap. This file defines evidence ordering,
remaining authority gates, and execution slices. It does not authorize runtime
or test implementation by itself.

## Source Basis

This roadmap was drafted after reading the current requirement and authority
plans:

- [phase-6-plus-requirement-centered-plan.md](./phase-6-plus-requirement-centered-plan.md)
- [itri-f07-f09-measured-traffic-evidence-package-plan.md](./itri-f07-f09-measured-traffic-evidence-package-plan.md)
- [itri-v02-v06-external-validation-readiness-package.md](./itri-v02-v06-external-validation-readiness-package.md)
- [m8a-v4.13-multi-orbit-scale-runtime-plan.md](./m8a-v4.13-multi-orbit-scale-runtime-plan.md)
- [m8a-v4-ground-station-multi-orbit-handover-plan.md](./m8a-v4-ground-station-multi-orbit-handover-plan.md)
- [m8a-second-endpoint-authority-package-plan.md](./m8a-second-endpoint-authority-package-plan.md)
- [m8a-v3-d03-presentation-polish-plan.md](./m8a-v3-d03-presentation-polish-plan.md),
  limited to close-out and forbidden-claim scan lessons.

Secondary status inputs:

- [itri-unclosed-requirement-evidence-intake-matrix.md](../intake/itri-unclosed-requirement-evidence-intake-matrix.md)
- [itri-public-source-research-register-2026-05-12.md](../intake/itri-public-source-research-register-2026-05-12.md)
- `/home/u24/papers/itri/itri-acceptance-report-2026-04-20/01-itri-requirement-inventory-and-status.md`

No source, test, package, runtime, fixture, or retained output evidence was
changed for this roadmap.

## Completion Policy

Remaining ITRI completion work follows this priority order:

1. Use ITRI or official external-authority data when available.
2. Otherwise research and classify public/open-source substitutes.
3. Only when no acceptable public source exists, define synthetic or simulated
   fallback fixtures.

The priority order is also a claim order. A lower tier may support design,
readiness, or a bounded repo-owned profile, but it cannot silently replace a
higher tier.

## Evidence Authority Ladder

| Tier | Evidence class | May close | Must not close |
| --- | --- | --- | --- |
| 1 | ITRI-supplied or official external-authority evidence: model packages, testbed logs, owner-approved thresholds, official lab output, accepted endpoint packages, selected standards versions, and owner sign-off. | Full authority lanes for the exact retained scope. | Anything outside the retained scope, redaction boundary, or owner-approved interpretation. |
| 2 | Public/open data from first-party or official sources: CelesTrak/Space-Track orbital data, ITU recommendations, 3GPP/IETF standards, INET/OMNeT++ docs, iPerf docs, Microsoft platform docs, Calnex/iTrinegy capability docs, and operator/service pages. | Repo-owned bounded public profiles, method context, standards-indexed schemas, public proxy fixtures, and source-lineaged context. | External validation truth, measured project traffic, ITRI model equivalence, DUT pass status, active gateway/path/satellite truth, or complete ITRI authority acceptance unless ITRI explicitly accepts the public source as authority. |
| 3 | Synthetic or simulated fixture: deterministic placeholder, repo-local seed, simulated traffic sample, or generated fixture with synthetic provenance. | UI development, parser shape tests, smoke readiness, negative/gap rehearsal, and placeholder demos. | Any external validation truth, measured traffic truth, physical-layer truth, ITRI model integration, DUT/NAT/tunnel pass status, or authority acceptance. |
| 4 | UI/readiness placeholder: visible route surface, reviewer copy, empty package skeleton, or local readiness report. | Gap visibility, handoff requests, smoke selectors, and reviewer orientation. | Requirement closure by itself. |

Hard rules:

- Public/open data may close only repo-owned bounded public profiles unless
  ITRI accepts that public/open data as authority for the specific requirement.
- Synthetic data never closes external validation truth.
- UI/readiness placeholders never close authority truth. They only expose
  status, gaps, or request packets.
- A public profile and a synthetic fallback must carry explicit provenance and
  nonclaim fields.

## Status Legend

| Status | Meaning |
| --- | --- |
| Already bounded-closed | The repo has a bounded, documented surface for this requirement. Remaining work, if any, is an authority upgrade rather than a blank implementation gap. |
| Open-source candidate | Public/open data can support a bounded repo-owned profile or standards-indexed plan after classification. It still needs provenance and nonclaims. |
| Synthetic fallback | No acceptable public source is available for the bounded profile. A deterministic fixture may be used only as a labeled fallback. |
| External-authority-only | Completion requires ITRI, testbed, lab, or owner-supplied evidence. Public/open or synthetic material may support planning only. |

## Residual Requirement Inventory

| ID | Requirement lane | Current repo status | Roadmap status | Evidence path to finish honestly | Public/open substitute classification | Synthetic fallback boundary |
| --- | --- | --- | --- | --- | --- | --- |
| F-01 | ITRI self-developed orbit-model integration | Scenario contracts, walker fixtures, public-TLE scale profiles, and V4.13 public-TLE multi-orbit runtime evidence exist, but they are not ITRI model integration. | External-authority-only | Request the ITRI orbit-model package/spec, input/output schema, time basis, reference frames, propagator rules, validation vectors, tolerances, redistribution policy, and owner sign-off. Then define an adapter contract and validation package before code. | CelesTrak, Space-Track, ESTNeT, 3GPP, and ITRI public pages are context/proxy candidates only. They may maintain the bounded public-TLE profile, not replace the ITRI model. | Adapter-interface placeholders may exist without orbital truth. Simulated orbit data must be labeled synthetic and cannot close F-01. |
| F-07 | Communication-time display | Repo-owned communication-time surfaces are already bounded-closed. Values remain proxy/model state, not retained measured traffic. | Already bounded-closed; measured lane is external-authority-only | Use `output/validation/external-f07-f09/<timestamp>-measured-traffic/` with topology, endpoints, raw `ping` or approved logs, timing window, handover events, thresholds, and redaction notes. | INET PingApp, RFC 792, RFC 6349, and iPerf docs are method context only. They can guide parser/runbook fields. | Synthetic ping windows may test parser/UI shape only and must never be labeled measured. |
| F-08 | Communication-time statistics | Repo-owned summary/report state is already bounded-closed. It is not measurement-backed statistics. | Already bounded-closed; measured lane is external-authority-only | Retain raw logs, parsed distributions, packet loss, jitter source, sample count, duration, computation method, and ITRI thresholds. | INET throughput examples, iPerf docs, and RFC methodology can guide computation fields but cannot supply project results. | Generated statistics may support schema tests only. They cannot produce pass/fail status. |
| F-09 | Communication-rate display | V4.12 has bounded communication-rate visualization from modeled network-speed classes. | Already bounded-closed; measured throughput lane is external-authority-only | Retain `iperf3` or approved traffic-generator client/server output, endpoints, direction, protocol, duration, interval stats, retransmits/loss where applicable, topology proof, and threshold authority. | iPerf and INET docs are method context. Operator service pages are service context. Neither supplies project Mbps/Gbps truth. | Synthetic throughput samples may test chart/export behavior only and must carry synthetic provenance. |
| F-12 | Decision switching from latency/jitter/network-speed-style inputs | Repo-owned deterministic handover-decision logic is already bounded-closed over proxy metric classes. | Already bounded-closed; live/authority rule lane is external-authority-only | If ITRI requires authority upgrade, request accepted metric definitions, thresholds, rule semantics, validation traces, and whether decisions affect replay, simulator state, or external traffic. | 3GPP/NR NTN documents can provide taxonomy and vocabulary. They do not define ITRI decision thresholds or operator policy. | Synthetic candidate metrics may support deterministic ranking tests only. They cannot imply live control or measured decision truth. |
| F-17 | Rain-attenuation impact display | Phase 6.5 has bounded physical-input rain families and visible projected impact on decision metrics. | Already bounded-closed; standards-backed public profile is an open-source candidate | Ask ITRI/V-group owner for required rain-rate source, bands, elevation, polarization, geography, output units, accepted approximations, selected ITU versions, and validation vectors. | ITU-R P.618, P.837, P.838, P.676, P.839, and P.840 are candidate standards sources once versions and parameters are selected. Public standards may close only a bounded public standards profile unless ITRI accepts them as authority. | Synthetic rain profiles may demonstrate UI deltas only and must not be represented as standards-backed physical truth. |
| P-01 | Antenna parameters | Phase 6.5 has a bounded antenna input family. | Already bounded-closed; standards-backed public profile is an open-source candidate | Request ITRI antenna geometry, pattern, gain, frequency bands, pointing/elevation assumptions, and validation vectors. | ITU-R S.465, S.580, and S.1528 are candidate standards/context sources, subject to ITRI selection. | Synthetic antenna profiles may test field flow only. |
| P-02 | Rain attenuation / rainy-condition attenuation | Phase 6.5 has a bounded rain input family. | Already bounded-closed; standards-backed public profile is an open-source candidate | Request ITRI rain model selection, location/rain-rate data, path geometry, frequency, polarization, and accepted output units. | ITU-R P.618, P.837, P.838, and P.839 are candidate sources after version selection. | Synthetic rain-rate fixtures remain UI/parser fixtures. |
| P-03 | ITU-related factors | Phase 6.5 includes an `itu-style` bounded proxy family. | Already bounded-closed; standards-backed public profile is an open-source candidate | Request exact ITU-R recommendations, versions, parameter values, approximation level, and validation vectors from ITRI/V-group owner. | ITU recommendations are high-authority public standards, but still incomplete without ITRI parameter and version choices. | Synthetic `itu-style` values can remain placeholders only. |
| V-02 | Windows + WSL support evidence | Validation-state seam names the mode. No retained successful external run exists. | External-authority-only | Fresh external package with Windows/WSL host details, distro, network mode, interfaces, routes, tools, command transcripts, and successful traffic proof. | Microsoft WSL/Hyper-V docs are platform-method context only. | Synthetic environment JSON may rehearse schema only. |
| V-03 | Tunnel / bridge evidence | Repo can represent validation mode, but not the real tunnel/bridge runtime. | External-authority-only | Retain tunnel endpoint config, bridge process command/config/logs, interfaces, packet path evidence, and successful traffic crossing the expected path. | INET emulation/TUN docs are method context only. | Synthetic bridge logs may test package validation only. |
| V-04 | NAT / ESTNeT / INET bridge evidence | Repo has `inet-nat-bridge` as a validation boundary mode. Actual NAT rules/topology are external. | External-authority-only | Retain ESTNeT/OMNeT++ scenario identity, INET NAT/gateway mapping, host interface mapping, route tables, NAT rules, raw traffic logs, and topology proof. | INET NAT/routing docs and Microsoft NAT docs are method context only. | Synthetic NAT tables may support schema shape only. |
| V-05 | Virtual DUT evidence | Repo can display `Virtual DUT` mode but does not run a DUT path. | External-authority-only | Retain virtual DUT identity, image/version, testbench source/version, DUT-facing interfaces/routes, traffic profile, raw DUT logs, outputs, and verdict. | No public source in the current register defines ITRI virtual DUT authority. | Placeholder DUT output is allowed only for negative/gap rehearsal. |
| V-06 | Physical DUT / traffic-generator evidence | Repo can display `Physical DUT` mode but does not own the physical testbed. | External-authority-only | Retain physical DUT or NE-ONE model/version/profile, topology/cabling/ports, traffic profile, raw outputs, logs, captures when allowed, redactions, and owner verdict. | Calnex/iTrinegy/NE-ONE pages are capability context only. RFC 2544 is method context only. | Synthetic lab output may test redaction/schema handling only. |
| M8A-V4 endpoint authority | Ground-station endpoint-pair authority and viewer-owned projection are accepted for Taiwan/CHT plus Speedcast Singapore at operator-family precision. | Already bounded-closed for operator-family endpoint authority | Preserve the accepted endpoint-pair package and projected artifact. Any site-level, same-site, active gateway/path, exact serving satellite, or performance upgrade needs a new authority package. | Public/operator sources can support candidate or operator-family evidence only. They do not prove active paths or exact site truth without authority acceptance. | Synthetic endpoints are forbidden for V4 authority. Display anchors may be bounded projection fields only when backed by the accepted projection contract. |

## Execution Slices

Each slice below is a bounded deliverable. Do not combine slices unless the
authority owner explicitly asks for a single retained package.

| Slice | Bounded deliverable | Covered IDs | Entry condition | Output | Close rule |
| --- | --- | --- | --- | --- | --- |
| S1 | F-01 authority intake and adapter contract plan | F-01 | ITRI orbit/model owner identifies the model or confirms it is not available. | Docs/data contract for model package intake, validation vectors, adapter boundary, and stop rules. | Closes only the planning/contract slice unless ITRI model artifacts and validation vectors are retained and later implemented. |
| S2 | F-07/F-08/F-09 measured traffic package execution/review | F-07, F-08, F-09 | Testbed owner provides endpoints, topology, tools, thresholds, and redaction policy. | Retained measured-traffic package plus review manifest under `output/validation/external-f07-f09/`. | Per-ID verdicts may change only from retained raw logs plus threshold authority. |
| S3 | F-12 decision-threshold authority upgrade | F-12 | S2 has measured fields or ITRI supplies decision thresholds/rule semantics. | Decision-rule authority memo or data-contract amendment mapping measured fields to decision inputs. | Closes only the named authority upgrade; existing bounded proxy behavior remains separate. |
| S4 | Public standards profile for physical/rain/antenna inputs | F-17, P-01, P-02, P-03 | ITRI/V-group owner selects required ITU recommendations, versions, parameters, and acceptable approximation level; or explicitly allows a public bounded profile. | Standards-indexed public profile doc/data contract with provenance and nonclaims. | May close only bounded public standards profile unless ITRI accepts it as authority truth. |
| S5 | V-02 Windows/WSL external package | V-02 | External owner confirms host, WSL mode, distro, tools, and expected traffic path. | Retained V-02 package section with commands, interfaces, routes, and traffic proof. | Pass requires more than environment inventory; traffic proof must use the intended setup. |
| S6 | V-03 tunnel/bridge external package | V-03 | Tunnel/bridge implementation and endpoints are confirmed. | Retained tunnel/bridge config, logs, interfaces, packet path, and traffic proof. | Pass requires configured path plus successful traffic over that path. |
| S7 | V-04 NAT/ESTNeT/INET external package | V-04 | NAT topology, addresses, gateway mapping, and ESTNeT/INET build are confirmed. | Retained topology, NAT/routing state, raw traffic logs, and review notes. | Pass requires topology, NAT/routing state, and successful simulated-to-real traffic evidence. |
| S8 | V-05 virtual DUT package | V-05 | ITRI supplies virtual DUT/testbench identity and expected command/profile. | Retained virtual DUT package with logs, outputs, traffic profile, and verdict. | Pass requires real DUT run artifacts, not placeholder output. |
| S9 | V-06 physical DUT / traffic-generator package | V-06 | Lab owner supplies DUT/NE-ONE profile, topology, redaction policy, and run plan. | Retained physical package with raw outputs, logs, redactions, and verdict. | Pass requires physical/lab output with enough retained context for review. |
| S10 | M8A-V4 endpoint authority preservation and upgrade gate | M8A-V4 endpoint authority | Any request attempts to change endpoint precision, endpoint pair, path semantics, or active service claims. | Authority delta review and, if needed, a new endpoint authority package plus projected artifact update plan. | Existing operator-family bounded closure remains intact unless superseded by a new accepted package. |
| S11 | Synthetic fallback fixture definitions | Any lane without usable authority or public source | A slice explicitly reaches "no acceptable public/open source" after classification. | A labeled synthetic fixture contract with provenance, intended use, nonclaims, and scan rules. | Closes only fixture readiness; never closes authority truth. |

S4-A close-out pointer: the docs-only public standards source
classification for F-17/P-01/P-02/P-03 is recorded in
[../data-contracts/itri-public-standards-source-classification.md](../data-contracts/itri-public-standards-source-classification.md).
It classifies official ITU sources for a bounded public standards profile only;
it creates no synthetic fixtures and does not record ITRI/V-group acceptance.

Parallel data-contract close-out pointers:

- S4-B public standards bounded profile schema is recorded in
  [../data-contracts/itri-public-standards-profile.md](../data-contracts/itri-public-standards-profile.md).
  It defines profile metadata, source lineage, physical/profile fields,
  validation-vector hooks, nonclaims, and replacement rules only. It does not
  implement numeric standards-derived behavior or record ITRI/V-group
  acceptance.
- F-01-A orbit-model intake contract is recorded in
  [../data-contracts/itri-orbit-model-intake.md](../data-contracts/itri-orbit-model-intake.md).
  It defines the authority package, model identity, input/output schema,
  validation-vector, adapter-boundary, public-TLE fallback, and synthetic
  fallback requirements only. It does not claim that an ITRI model package is
  present or integrated.
- F-07-A measured traffic package schema is recorded in
  [../data-contracts/itri-measured-traffic-package.md](../data-contracts/itri-measured-traffic-package.md).
  It defines future package metadata, topology, raw artifact refs, parsed
  metric fields, threshold authority, reviewer states, and synthetic fallback
  boundaries only. Schema/import readiness does not close measured traffic
  truth.
- F-12-A decision-threshold authority contract is recorded in
  [../data-contracts/itri-decision-threshold-authority.md](../data-contracts/itri-decision-threshold-authority.md).
  It defines authority package metadata, measured-field mapping, rule
  semantics, threshold authority fields, reviewer states, and synthetic
  fallback boundaries only. It keeps the existing bounded proxy F-12 lane
  separate from any future measured/authority F-12 upgrade.
- V-02-A external validation manifest schema is recorded in
  [../data-contracts/itri-external-validation-manifest.md](../data-contracts/itri-external-validation-manifest.md).
  It defines the common manifest envelope for future V-02..V-06 packages,
  including environment, topology, DUT/generator, raw artifact, redaction,
  measured-traffic relation, and per-lane reviewer state fields only. Schema
  readiness does not close V-02..V-06 external validation.

Runtime readiness decision: the first runtime-facing implementation candidate
is selected in
[itri-runtime-readiness-decision.md](./itri-runtime-readiness-decision.md).
It chooses a bounded F-07/F-08/F-09 measured traffic package
reviewer/importer as the first runtime-facing lane, while preserving all
external authority and nonclaim boundaries.

F-07R1 close-out: the bounded measured traffic package reviewer/importer landed
in `57f3a2b` with corrective artifact-ref resolution fix `9671b42`.
Close-out details are recorded in
[itri-f07r1-measured-traffic-package-reviewer-closeout.md](./itri-f07r1-measured-traffic-package-reviewer-closeout.md).
The reviewer reads only explicitly named local packages under
`output/validation/external-f07-f09/`, fails closed for missing/malformed/
incomplete/synthetic packages, and does not create retained evidence or close
measured traffic authority.

F-12R1 close-out: the bounded decision-threshold authority reviewer landed in
`58e131f` after a corrective pass that requires exhaustive F-07R1 coverage for
F-12 measured refs and rule measured-field refs. Close-out details are recorded
in
[itri-f12r1-decision-threshold-authority-reviewer-closeout.md](./itri-f12r1-decision-threshold-authority-reviewer-closeout.md).
The reviewer reads only explicitly named local packages under
`output/validation/external-f12/`, references measured packages through the
F-07R1 reviewer surface, fails closed for missing/malformed/incomplete/
synthetic/unreviewed-ref packages, and does not create retained evidence,
change F-12 handover behavior, or close F-12 measured authority.

V-02R1 close-out: the bounded external-validation manifest reviewer landed in
`7e54e48` with package-boundary corrective fix `46b124b`. Close-out details are
recorded in
[itri-v02r1-external-validation-manifest-reviewer-closeout.md](./itri-v02r1-external-validation-manifest-reviewer-closeout.md).
The reviewer reads only explicitly named local packages under
`output/validation/external-v02-v06/`, fails closed for missing/malformed/
wrong-schema/synthetic/redaction-blocked/escaping-ref/unresolved-ref packages,
and rejects explicit manifest paths outside the named package. It does not
create retained evidence, run live Windows/WSL, tunnel, NAT, DUT, NE-ONE,
vendor, `ping`, or `iperf` tools, change existing V-02..V-06 runtime verdicts,
or close V-02..V-06 external-validation authority.

## Public/Open Source Classification Rules

Before promoting public/open material, classify it in a short source note:

| Classification | Criteria | Allowed use |
| --- | --- | --- |
| Public authority candidate | Official standards body, source-owner documentation, first-party public data, or official tool docs; stable enough to retain source URL, access date, version, and license/use notes. | Bounded public profile, standards-indexed data contract, parser/runbook design, or public proxy fixture. |
| Method/context only | Explains a method, API, platform behavior, or tool capability but does not contain project-specific evidence. | Runbook wording, schema fields, parser expectations, and evidence requests. |
| Service/operator context only | Operator or vendor page that proves service/capability context, not this route's active path or measurement. | Candidate evidence, endpoint package context, nonclaim-backed service background. |
| Hold | Public source appears useful but lacks direct verification, license clarity, version clarity, or first-party status. | Do not promote until revalidated. |
| Reject | Secondary summary, mirror when an official source exists, community-only claim, unverifiable screenshot, or source that requires unsupported inference. | No closure or profile use. |

Public/open data promotion checklist:

- source owner, URL, access date, version/epoch, and license/use notes are
  retained;
- every derived artifact records source lineage;
- bounded-public profile wording is used;
- nonclaims state which external truth remains outside the profile;
- ITRI acceptance is recorded if the profile is intended to close anything
  beyond the repo-owned bounded public profile.

## Synthetic Fallback Rules

Synthetic fixtures are allowed only after S11 records why Tier 1 and Tier 2
evidence are unavailable or unacceptable for the bounded deliverable.

S11 close-out pointer: the concrete synthetic fallback fixture boundary is
defined in
[../data-contracts/itri-synthetic-fallback-fixtures.md](../data-contracts/itri-synthetic-fallback-fixtures.md).
That contract defines required metadata, lane-specific fixture categories,
nonclaim fields, replacement triggers, and D-03-aligned scan scoping. It closes
only fixture readiness, not authority truth.

Every synthetic fixture must include:

- fixture id and generation date;
- synthetic provenance label;
- intended consumers;
- forbidden consumers;
- maximum claim it can support;
- known gaps;
- nonclaims;
- expiration or replacement trigger.

Default maximum claim:

> deterministic synthetic readiness fixture for UI/schema/parser rehearsal.

Synthetic fallback must not be used as evidence for external validation truth,
measured traffic truth, physical-layer truth, ITRI model integration, DUT/NAT
or tunnel pass status, active satellite/gateway/path truth, or complete ITRI
acceptance.

## Forbidden Claim Wording

Do not introduce copy that asserts completion of authority lanes that remain
open. Unsafe completion wording includes these forms:

- "all external validation is complete";
- "the ITRI orbit-model lane is fully wired";
- "measured traffic evidence is complete";
- "`ping` or `iperf` backed closure";
- "DUT, NAT, or tunnel evidence is complete";
- "native radio-layer handover is complete";
- "active satellite, active gateway, active path, or pair-specific teleport
  path is proven";
- "M8A-V4 exact endpoint path or active service assignment is resolved";
- "complete ITRI acceptance is achieved".

Allowed wording must keep the boundary explicit:

- "bounded repo-owned seam";
- "bounded public profile";
- "method/context source";
- "capability context";
- "readiness package";
- "gap evidence";
- "external authority required";
- "synthetic readiness fixture";
- "modeled, not measured";
- "operator-family precision only".

This roadmap records no pass assertion for external validation, DUT/NAT/tunnel
paths, measured `ping`/`iperf`, native radio-layer handover, or the ITRI
model-integration lane.

## Smoke-Scan Scoping Rules

The D-03 Section 8.1 lesson applies to every future slice:

- Substring scans are useful for new forbidden copy, but broad scans can catch
  pre-existing negated disclaimers.
- The authoritative pre-commit scan should target staged or edited files for
  the slice.
- Runtime smoke scans must target only the DOM subtree or element introduced
  or modified by the slice.
- Do not scan the whole HUD, globe root, route root, or panel root when the
  slice only changes one child element.
- If a scan hits a pre-existing negation, narrow the scan scope rather than
  weakening the nonclaim text.
- New disclaimers are still new copy; scan them as part of the slice diff.

Run the task-level forbidden-claim probe over edited docs before close-out.
Keep the literal probe pattern outside committed docs so the validation command
does not self-match.

## Unresolved Authority Questions

1. What exact ITRI orbit-model package, schema, vectors, tolerances, and
   redistribution policy are authoritative for F-01?
2. Which endpoints, topology, tools, directions, durations, sample counts,
   payloads, thresholds, and redaction policy close F-07/F-08/F-09 measured
   traffic?
3. Which measured fields and thresholds, if any, must drive an F-12 authority
   upgrade beyond the current bounded decision seam?
4. Which ITU recommendations, versions, bands, antenna assumptions, rain-rate
   data, geography, and output units close F-17/P-01/P-02/P-03 beyond bounded
   public profiles?
5. What Windows/WSL, tunnel/bridge, NAT/ESTNeT/INET, virtual DUT, physical DUT,
   and traffic-generator topology is authoritative for V-02..V-06?
6. Is NE-ONE mandatory for V-06, and what model/profile/output is acceptable?
7. What redaction policy preserves auditability for IPs, hostnames, DUT
   identifiers, lab screenshots, configs, and packet captures?
8. For M8A-V4, is operator-family endpoint authority sufficient for the
   planned scene, or will any later review require site-level, same-site,
   active-path, or performance authority?
