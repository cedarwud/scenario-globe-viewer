# customer Requirement Completion Roadmap

Date: 2026-05-15 (S4 follow-on amendment: ITU-R public-formula module landed
under `src/features/itu-r-physics/`; see ITU-R Physics Module close-out pointer
below).

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

Remaining customer completion work follows this priority order:

1. Use customer or official external-authority data when available.
2. Otherwise research and classify public/open-source substitutes.
3. Only when no acceptable public source exists, define synthetic or simulated
   fallback fixtures.

The priority order is also a claim order. A lower tier may support design,
readiness, or a bounded repo-owned profile, but it cannot silently replace a
higher tier.

## Evidence Authority Ladder

| Tier | Evidence class | May close | Must not close |
| --- | --- | --- | --- |
| 1 | customer-supplied or official external-authority evidence: model packages, testbed logs, owner-approved thresholds, official lab output, accepted endpoint packages, selected standards versions, and owner sign-off. | Full authority lanes for the exact retained scope. | Anything outside the retained scope, redaction boundary, or owner-approved interpretation. |
| 2 | Public/open data from first-party or official sources: CelesTrak/Space-Track orbital data, ITU recommendations, 3GPP/IETF standards, INET/OMNeT++ docs, iPerf docs, Microsoft platform docs, Calnex/iTrinegy capability docs, and operator/service pages. | Repo-owned bounded public profiles, method context, standards-indexed schemas, public proxy fixtures, and source-lineaged context. | External validation truth, measured project traffic, customer model equivalence, DUT pass status, active gateway/path/satellite truth, or complete customer authority acceptance unless customer explicitly accepts the public source as authority. |
| 3 | Synthetic or simulated fixture: deterministic placeholder, repo-local seed, simulated traffic sample, or generated fixture with synthetic provenance. | UI development, parser shape tests, smoke readiness, negative/gap rehearsal, and placeholder demos. | Any external validation truth, measured traffic truth, physical-layer truth, customer model integration, DUT/NAT/tunnel pass status, or authority acceptance. |
| 4 | UI/readiness placeholder: visible route surface, reviewer copy, empty package skeleton, or local readiness report. | Gap visibility, handoff requests, smoke selectors, and reviewer orientation. | Requirement closure by itself. |

Hard rules:

- Public/open data may close only repo-owned bounded public profiles unless
  customer accepts that public/open data as authority for the specific requirement.
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
| External-authority-only | Completion requires customer, testbed, lab, or owner-supplied evidence. Public/open or synthetic material may support planning only. |

## Residual Requirement Inventory

| ID | Requirement lane | Current repo status | Roadmap status | Evidence path to finish honestly | Public/open substitute classification | Synthetic fallback boundary |
| --- | --- | --- | --- | --- | --- | --- |
| F-01 | customer self-developed orbit-model integration | Scenario contracts, walker fixtures, public-TLE scale profiles, and V4.13 public-TLE multi-orbit runtime evidence exist, but they are not customer model integration. | External-authority-only | Request the customer orbit-model package/spec, input/output schema, time basis, reference frames, propagator rules, validation vectors, tolerances, redistribution policy, and owner sign-off. Then define an adapter contract and validation package before code. | CelesTrak, Space-Track, ESTNeT, 3GPP, and customer public pages are context/proxy candidates only. They may maintain the bounded public-TLE profile, not replace the customer model. | Adapter-interface placeholders may exist without orbital truth. Simulated orbit data must be labeled synthetic and cannot close F-01. |
| F-03/F-15 | External TLE/source scenario breadth and real-time/prerecorded source acceptance | Public CelesTrak fixtures, walker fixtures, scenario mode switching, and V4.13 public-TLE multi-orbit runtime evidence exist. S12-A defines the owner-supplied source-package intake schema and S12-B readiness reviewer is available. Full owner-supplied source breadth remains separate from F-01 orbit-model integration. | Already bounded-closed for repo-owned public fixtures; S12-A/S12-B covers intake readiness when retained package material is present; external retained package/reviewer lane remains open if required by customer | Use the S12-A schema to request source-owner package material: catalog owner, source URL or private drop, epoch/update cadence, licensing and redistribution policy, real-time vs prerecorded mode rules, checksum/retention rules, accepted stale-data policy, scenario mapping, and owner sign-off for source use. | CelesTrak and Space-Track can support bounded public-source profiles with lineage and access dates. They do not prove customer private source acceptance or arbitrary external scenario coverage by themselves. | Source-shape fixtures may rehearse parser/schema behavior only and cannot replace retained source packages or source-owner acceptance. |
| F-07 | Communication-time display | Repo-owned communication-time surfaces are already bounded-closed. Values remain proxy/model state, not retained measured traffic. | Already bounded-closed; measured lane is external-authority-only | Use `output/validation/external-f07-f09/<timestamp>-measured-traffic/` with topology, endpoints, raw `ping` or approved logs, timing window, handover events, thresholds, and redaction notes. | INET PingApp, RFC 792, RFC 6349, and iPerf docs are method context only. They can guide parser/runbook fields. | Synthetic ping windows may test parser/UI shape only and must never be labeled measured. |
| F-08 | Communication-time statistics | Repo-owned summary/report state is already bounded-closed. It is not measurement-backed statistics. | Already bounded-closed; measured lane is external-authority-only | Retain raw logs, parsed distributions, packet loss, jitter source, sample count, duration, computation method, and customer thresholds. | INET throughput examples, iPerf docs, and RFC methodology can guide computation fields but cannot supply project results. | Generated statistics may support schema tests only. They cannot produce pass/fail status. |
| F-09 | Communication-rate display | V4.12 has bounded communication-rate visualization from modeled network-speed classes. | Already bounded-closed; measured throughput lane is external-authority-only | Retain `iperf3` or approved traffic-generator client/server output, endpoints, direction, protocol, duration, interval stats, retransmits/loss where applicable, topology proof, and threshold authority. | iPerf and INET docs are method context. Operator service pages are service context. Neither supplies project Mbps/Gbps truth. | Synthetic throughput samples may test chart/export behavior only and must carry synthetic provenance. |
| F-12 | Decision switching from latency/jitter/network-speed-style inputs | Repo-owned deterministic handover-decision logic is already bounded-closed over proxy metric classes. | Already bounded-closed; live/authority rule lane is external-authority-only | If customer requires authority upgrade, request accepted metric definitions, thresholds, rule semantics, validation traces, and whether decisions affect replay, simulator state, or external traffic. | 3GPP/NR NTN documents can provide taxonomy and vocabulary. They do not define customer decision thresholds or operator policy. | Synthetic candidate metrics may support deterministic ranking tests only. They cannot imply live control or measured decision truth. |
| F-17 | Rain-attenuation impact display | Phase 6.5 plus ITU-R-physics module (`src/features/itu-r-physics/`) backs demo seeds with public-source-only P.618-14 total-path attenuation (rain via P.838-3, gas via simplified P.676, cloud bounded, scintillation bounded). 51 rain seeds in `bootstrap-physical-input-seeds.ts` now flow through `computeTotalPathAttenuation()`. Repo-owned values remain Tier-2 bounded-public-source-only; demo frequency/elevation/polarization are repo-chosen, not customer/V-group selected. | Already bounded-closed (public-source-only formulae); standards-backed public profile is also already bounded-closed via S4R1; customer/V-group authority truth remains external-authority-only | Ask customer/V-group owner for required rain-rate source, bands, elevation, polarization, geography, output units, accepted approximations, selected ITU versions, and validation vectors. | ITU-R P.618, P.837, P.838, P.676, P.839, and P.840 are candidate standards sources once versions and parameters are selected. Public-source-only formulae are now implemented in `src/features/itu-r-physics/`; they remain bounded-public-source-only and do not assert customer/V-group authority acceptance. | Synthetic rain profiles may demonstrate UI deltas only and must not be represented as standards-backed physical truth. |
| P-01 | Antenna parameters | Phase 6.5 plus ITU-R-physics module backs demo antenna seeds with ITU-R F.699-8 three-region sidelobe envelope (main-beam parabolic, near-sidelobe `G₁` plateau, far-sidelobe `52 − 10·log10(D/λ) − 25·log10(φ)`). Small-terminal `D=0.9 m / 1.5 GHz / G_max=20.79 dBi`, medium-terminal `D=2.4 m / 12 GHz / G_max=47.38 dBi`, pointing-loss `0.5°` off-axis. Repo-owned demo geometry/frequencies are not customer/V-group selected. | Already bounded-closed (public-source-only formulae); standards-backed public profile is also already bounded-closed via S4R1; customer/V-group authority truth remains external-authority-only | Request customer antenna geometry, pattern, gain, frequency bands, pointing/elevation assumptions, and validation vectors. | ITU-R F.699, S.465, S.580, and S.1528 are candidate standards/context sources, subject to customer selection. F.699-8 is now implemented in `src/features/itu-r-physics/itu-r-f699-antenna-pattern.ts` as bounded-public-source-only. | Synthetic antenna profiles may test field flow only. |
| P-02 | Rain attenuation / rainy-condition attenuation | Phase 6.5 plus ITU-R-physics module backs demo rain seeds with ITU-R P.838-3 Table 5 specific-attenuation coefficients (1–100 GHz, `k_H`/`α_H`/`k_V`/`α_V`) plus log-log `k` interpolation and semi-log `α` interpolation. Repo-owned demo frequency/polarization are not customer/V-group selected. | Already bounded-closed (public-source-only formulae); standards-backed public profile is also already bounded-closed via S4R1; customer/V-group authority truth remains external-authority-only | Request customer rain model selection, location/rain-rate data, path geometry, frequency, polarization, and accepted output units. | ITU-R P.618, P.837, P.838, and P.839 are candidate sources after version selection. P.838-3 is now implemented in `src/features/itu-r-physics/itu-r-p838-rain-attenuation.ts` as bounded-public-source-only. | Synthetic rain-rate fixtures remain UI/parser fixtures. |
| P-03 | ITU-related factors | Phase 6.5 plus ITU-R-physics module backs the `itu-style` family with ITU-R P.618-14 §2.4 total path attenuation (`A_rain` via P.838-3, `A_gas` via simplified P.676 oxygen+water-vapor at 1.5 GHz with bounded scaling, `A_cloud` bounded from P.840, `A_scint` bounded from P.618 §2.5.2). Customer/V-group selected parameters, approximation level, and validation vectors remain external authority inputs. | Already bounded-closed (public-source-only formulae); standards-backed public profile is also already bounded-closed via S4R1; customer/V-group authority truth remains external-authority-only | Request exact ITU-R recommendations, versions, parameter values, approximation level, and validation vectors from customer/V-group owner. | ITU recommendations are high-authority public standards, but still incomplete without customer parameter and version choices. P.618-14/P.676/P.840 link-budget composition is now implemented in `src/features/itu-r-physics/itu-r-p618-link-budget.ts` as bounded-public-source-only. | Synthetic `itu-style` values can remain placeholders only. |
| V-02 | Windows + WSL support evidence | Validation-state seam names the mode. No retained successful external run exists. | External-authority-only | Fresh external package with Windows/WSL host details, distro, network mode, interfaces, routes, tools, command transcripts, and successful traffic proof. | Microsoft WSL/Hyper-V docs are platform-method context only. | Synthetic environment JSON may rehearse schema only. |
| V-03 | Tunnel / bridge evidence | Repo can represent validation mode, but not the real tunnel/bridge runtime. | External-authority-only | Retain tunnel endpoint config, bridge process command/config/logs, interfaces, packet path evidence, and successful traffic crossing the expected path. | INET emulation/TUN docs are method context only. | Synthetic bridge logs may test package validation only. |
| V-04 | NAT / ESTNeT / INET bridge evidence | Repo has `inet-nat-bridge` as a validation boundary mode. Actual NAT rules/topology are external. | External-authority-only | Retain ESTNeT/OMNeT++ scenario identity, INET NAT/gateway mapping, host interface mapping, route tables, NAT rules, raw traffic logs, and topology proof. | INET NAT/routing docs and Microsoft NAT docs are method context only. | Synthetic NAT tables may support schema shape only. |
| V-05 | Virtual DUT evidence | Repo can display `Virtual DUT` mode but does not run a DUT path. | External-authority-only | Retain virtual DUT identity, image/version, testbench source/version, DUT-facing interfaces/routes, traffic profile, raw DUT logs, outputs, and verdict. | No public source in the current register defines customer virtual DUT authority. | Placeholder DUT output is allowed only for negative/gap rehearsal. |
| V-06 | Physical DUT / traffic-generator evidence | Repo can display `Physical DUT` mode but does not own the physical testbed. | External-authority-only | Retain physical DUT or NE-ONE model/version/profile, topology/cabling/ports, traffic profile, raw outputs, logs, captures when allowed, redactions, and owner verdict. | Calnex/iTrinegy/NE-ONE pages are capability context only. RFC 2544 is method context only. | Synthetic lab output may test redaction/schema handling only. |
| M8A-V4 endpoint authority | Ground-station endpoint-pair authority and viewer-owned projection are accepted for Taiwan/CHT plus Speedcast Singapore at operator-family precision. | Already bounded-closed for operator-family endpoint authority | Preserve the accepted endpoint-pair package and projected artifact. Any site-level, same-site, active gateway/path, exact serving satellite, or performance upgrade needs a new authority package. | Public/operator sources can support candidate or operator-family evidence only. They do not prove active paths or exact site truth without authority acceptance. | Synthetic endpoints are forbidden for V4 authority. Display anchors may be bounded projection fields only when backed by the accepted projection contract. |

## Execution Slices

Each slice below is a bounded deliverable. Do not combine slices unless the
authority owner explicitly asks for a single retained package.

| Slice | Bounded deliverable | Covered IDs | Entry condition | Output | Close rule |
| --- | --- | --- | --- | --- | --- |
| S1 | F-01 authority intake and adapter contract plan | F-01 | customer orbit/model owner identifies the model or confirms it is not available. | Docs/data contract for model package intake, validation vectors, adapter boundary, and stop rules. | Closes only the planning/contract slice unless customer model artifacts and validation vectors are retained and later implemented. |
| S2 | F-07/F-08/F-09 measured traffic package execution/review | F-07, F-08, F-09 | Testbed owner provides endpoints, topology, tools, thresholds, and redaction policy. | Retained measured-traffic package plus review manifest under `output/validation/external-f07-f09/`. | Per-ID verdicts may change only from retained raw logs plus threshold authority. |
| S3 | F-12 decision-threshold authority upgrade | F-12 | S2 has measured fields or customer supplies decision thresholds/rule semantics. | Decision-rule authority memo or data-contract amendment mapping measured fields to decision inputs. | Closes only the named authority upgrade; existing bounded proxy behavior remains separate. |
| S4 | Public standards profile for physical/rain/antenna inputs | F-17, P-01, P-02, P-03 | customer/V-group owner selects required ITU recommendations, versions, parameters, and acceptable approximation level; or explicitly allows a public bounded profile. | Standards-indexed public profile doc/data contract with provenance and nonclaims. | May close only bounded public standards profile unless customer accepts it as authority truth. |
| S5 | V-02 Windows/WSL external package | V-02 | External owner confirms host, WSL mode, distro, tools, and expected traffic path. | Retained V-02 package section with commands, interfaces, routes, and traffic proof. | Pass requires more than environment inventory; traffic proof must use the intended setup. |
| S6 | V-03 tunnel/bridge external package | V-03 | Tunnel/bridge implementation and endpoints are confirmed. | Retained tunnel/bridge config, logs, interfaces, packet path, and traffic proof. | Pass requires configured path plus successful traffic over that path. |
| S7 | V-04 NAT/ESTNeT/INET external package | V-04 | NAT topology, addresses, gateway mapping, and ESTNeT/INET build are confirmed. | Retained topology, NAT/routing state, raw traffic logs, and review notes. | Pass requires topology, NAT/routing state, and successful simulated-to-real traffic evidence. |
| S8 | V-05 virtual DUT package | V-05 | customer supplies virtual DUT/testbench identity and expected command/profile. | Retained virtual DUT package with logs, outputs, traffic profile, and verdict. | Pass requires real DUT run artifacts, not placeholder output. |
| S9 | V-06 physical DUT / traffic-generator package | V-06 | Lab owner supplies DUT/NE-ONE profile, topology, redaction policy, and run plan. | Retained physical package with raw outputs, logs, redactions, and verdict. | Pass requires physical/lab output with enough retained context for review. |
| S10 | M8A-V4 endpoint authority preservation and upgrade gate | M8A-V4 endpoint authority | Any request attempts to change endpoint precision, endpoint pair, path semantics, or active service claims. | Authority delta review and, if needed, a new endpoint authority package plus projected artifact update plan. | Existing operator-family bounded closure remains intact unless superseded by a new accepted package. |
| S11 | Synthetic fallback fixture definitions | Any lane without usable authority or public source | A slice explicitly reaches "no acceptable public/open source" after classification. | A labeled synthetic fixture contract with provenance, intended use, nonclaims, and scan rules. | Closes only fixture readiness; never closes authority truth. |
| S12 | External scenario-source/TLE package intake | F-03, F-15 | customer or a source owner requires source breadth beyond the vendored public fixtures, or supplies authoritative source catalogs/update rules. | Source-package intake contract or retained package plan covering source owner, update cadence, real-time/prerecorded mode rules, redistribution, checksums, scenario mapping, and review gates. S12-A records the docs-only schema in [../data-contracts/itri-external-source-package-intake.schema.json](../data-contracts/itri-external-source-package-intake.schema.json). S12-B adds the bounded reviewer surface, S12-C enforces owner-submitted package boundary checks, and S12-D reaches the positive owner package `ready-for-intake` state when an explicit package is present and all boundary checks pass. | Closes only the named source-package readiness lane unless retained source material and owner acceptance are supplied and reviewed. |

S4-A close-out pointer: the docs-only public standards source
classification for F-17/P-01/P-02/P-03 is recorded in
[../data-contracts/itri-public-standards-source-classification.md](../data-contracts/itri-public-standards-source-classification.md).
It classifies official ITU sources for a bounded public standards profile only;
it creates no synthetic fixtures and does not record customer/V-group acceptance.

Parallel data-contract close-out pointers:

- S4-B public standards bounded profile schema is recorded in
  [../data-contracts/itri-public-standards-profile.md](../data-contracts/itri-public-standards-profile.md).
  It defines profile metadata, source lineage, physical/profile fields,
  validation-vector hooks, nonclaims, and replacement rules only. It does not
  implement numeric standards-derived behavior or record customer/V-group
  acceptance.
- F-01-A orbit-model intake contract is recorded in
  [../data-contracts/itri-orbit-model-intake.md](../data-contracts/itri-orbit-model-intake.md).
  It defines the authority package, model identity, input/output schema,
  validation-vector, adapter-boundary, public-TLE fallback, and synthetic
  fallback requirements only. It does not claim that an customer model package is
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

S4R1 close-out: the bounded public standards profile reviewer landed in
`e4a49f4`. Close-out details are recorded in
[itri-s4r1-public-standards-profile-reviewer-closeout.md](./itri-s4r1-public-standards-profile-reviewer-closeout.md).
The reviewer reads only explicitly named local packages under
`output/validation/public-standards-profiles/`, validates S4-A source-lineage
IDs, official ITU URLs, nonclaims, validation-vector/tolerance readiness,
replacement triggers, authority-escalation gates, and package-boundary
`retainedPath` refs. It does not create retained profile evidence, generate
synthetic fixtures, fetch standards material, copy ITU tables/equations/
components, implement numeric standards-derived behavior, change
`physical-input`, or close F-17/P-01/P-02/P-03 customer/V-group authority.

F-01R1 close-out: the bounded orbit-model intake reviewer landed in
`fbc36c5`. Close-out details are recorded in
[itri-f01r1-orbit-model-intake-reviewer-closeout.md](./itri-f01r1-orbit-model-intake-reviewer-closeout.md).
The reviewer reads only explicitly named local packages under
`output/validation/external-f01-orbit-model/`, fails closed for missing/
malformed/wrong-schema/public-TLE-substitute/synthetic/unresolved-ref packages,
and can reach only `ready-for-design-review`. It does not create retained
authority evidence, add an customer runtime adapter, implement propagation, change
satellite/scenario/overlay runtime, promote public TLE/CelesTrak/Space-Track
output as customer model authority, or close F-01 authority completion.

ITU-R Physics Module close-out pointer (post-S4R1 public-source-only formulae):
the public-source-only ITU-R formulae backing the bounded F-17/P-01/P-02/P-03
demo seeds landed under `src/features/itu-r-physics/` across three commits:

- `01a3820` adds `itu-r-p838-rain-attenuation.ts` implementing ITU-R P.838-3
  Table 5 specific-attenuation coefficients with log-log `k` and semi-log
  `α` interpolation. Reference cases pass at 0.0% deviation
  (`node scripts/verify-itu-r-p838-rain-attenuation.mjs`).
- `be8c042` adds `itu-r-p618-link-budget.ts` implementing ITU-R P.618-14 §2.4
  total path attenuation (`A_rain` + simplified `A_gas` + bounded `A_cloud` +
  bounded `A_scint`). Component reference cases pass
  (`node scripts/verify-itu-r-p618-link-budget.mjs`).
- `23f4314` adds `itu-r-f699-antenna-pattern.ts` implementing ITU-R F.699-8
  three-region sidelobe envelope plus boresight `G_max`. Reference cases pass
  within published tolerance bands
  (`node scripts/verify-itu-r-f699-antenna-pattern.mjs`).

The module is consumed by `src/runtime/bootstrap-physical-input-seeds.ts` so
that all 51 rain seeds plus antenna gain/pointing values flow through the
public formulae instead of repo-chosen constants. The module is intentionally
public-source-only: frequency, polarization, elevation, antenna geometry, and
selected approximations are repo-chosen demo defaults, not customer/V-group
selected. This module does not promote any public-source-only computation to
customer/V-group authority truth, change S4R1 reviewer scope, change
F-WP1-B/K-03/F-07 retained acceptance, run live external traffic, or
substitute for customer/V-group validation vectors, tolerances, or owner
sign-off. Customer/V-group selected parameters, validation vectors,
tolerances, and acceptance still gate F-17/P-01/P-02/P-03 closure beyond
bounded-public-source-only readiness.

Cross-references for the post-S4R1 public-source-only state:

- audit: `INDEPENDENT-AUDIT-results.md` rows F-07, K-03, P-01, P-02, P-03;
- runtime: `src/features/itu-r-physics/`,
  `src/runtime/bootstrap-physical-input-seeds.ts`;
- verifiers: `scripts/verify-itu-r-p838-rain-attenuation.mjs`,
  `scripts/verify-itu-r-p618-link-budget.mjs`,
  `scripts/verify-itu-r-f699-antenna-pattern.mjs`;
- phase plan: `docs/sdd/phase-6-plus-requirement-centered-plan.md`
  Phase 6.5 closure note.

S11R1 close-out: the bounded synthetic fallback fixture reviewer landed in
`0d0074b`. Close-out details are recorded in
[itri-s11r1-synthetic-fallback-fixture-reviewer-closeout.md](./itri-s11r1-synthetic-fallback-fixture-reviewer-closeout.md).
The reviewer reads only explicitly named local packages under
`output/validation/synthetic-fallback-fixtures/`, fails closed for missing/
malformed/wrong-schema/non-Tier-3/strong-claim/unresolved-ref packages, and can
reach only `bounded-synthetic-fixture-ready`. It does not create retained
evidence, create fixture JSON, fetch external data, execute live tools, promote
synthetic material to authority evidence, or close any measured, external,
physical, F-01, F-12, V-lane, DUT/NAT/tunnel, native radio handover, active
gateway/path, or full acceptance by customer.

S12-A schema close-out pointer (docs-only): the external source package intake
schema is
recorded in
[../data-contracts/itri-external-source-package-intake.schema.json](../data-contracts/itri-external-source-package-intake.schema.json).
It defines the required owner/source metadata, source tier and authority
classification, public URL or private drop metadata, catalog type,
real-time/prerecorded rules, epoch/time/update/stale-data rules, license and
redistribution policy, checksums, artifact retention, scenario mapping,
orbit-class coverage, satellite counts, parsed/reviewed field source refs, and
literal-false nonclaims.

S12-D close-out pointer (bounded readiness reviewer): the source-package
intake reviewer, boundary checks, and script entrypoint are implemented with
the reviewer command in
[./itri-retained-evidence-request-packet.md](./itri-retained-evidence-request-packet.md).
Close-out details are recorded in
[./itri-s12r3-reviewer-closeout.md](./itri-s12r3-reviewer-closeout.md).
It does not create retained evidence, fixture JSON, runtime ingestion, public-source
fetches, or live external execution.

Retained evidence request pointer: remaining authority-gated lanes have a
docs-only owner request packet in
[itri-retained-evidence-request-packet.md](./itri-retained-evidence-request-packet.md).
The packet lists required owner-supplied artifacts, metadata, raw artifact
expectations, redaction notes, and future reviewer commands only; it creates no
retained evidence, retained packages, fixture JSON, or implementation authority.

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
- customer acceptance is recorded if the profile is intended to close anything
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
measured traffic truth, physical-layer truth, customer model integration, DUT/NAT
or tunnel pass status, active satellite/gateway/path truth, or complete customer
acceptance.

## Forbidden Claim Wording

Do not introduce copy that asserts completion of authority lanes that remain
open. Unsafe completion wording includes these forms:

- "all external validation is complete";
- "the customer orbit-model lane is fully wired";
- "measured traffic evidence is complete";
- "`ping` or `iperf` backed closure";
- "DUT, NAT, or tunnel evidence is complete";
- "native radio-layer handover is complete";
- "active satellite, active gateway, active path, or pair-specific teleport
  path is proven";
- "M8A-V4 exact endpoint path or active service assignment is resolved";
- "complete customer acceptance is achieved".

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
paths, measured `ping`/`iperf`, native radio-layer handover, or the customer
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

1. What exact customer orbit-model package, schema, vectors, tolerances, and
   redistribution policy are authoritative for F-01?
2. Does customer require F-03/F-15 source breadth beyond the current vendored
   public fixtures and bounded scenario modes; if so, what source owner,
   catalog/update cadence, licensing, retention, and real-time/prerecorded
   acceptance rules apply?
3. Which endpoints, topology, tools, directions, durations, sample counts,
   payloads, thresholds, and redaction policy close F-07/F-08/F-09 measured
   traffic?
4. Which measured fields and thresholds, if any, must drive an F-12 authority
   upgrade beyond the current bounded decision seam?
5. Which ITU recommendations, versions, bands, antenna assumptions, rain-rate
   data, geography, and output units close F-17/P-01/P-02/P-03 beyond bounded
   public profiles?
6. What Windows/WSL, tunnel/bridge, NAT/ESTNeT/INET, virtual DUT, physical DUT,
   and traffic-generator topology is authoritative for V-02..V-06?
7. Is NE-ONE mandatory for V-06, and what model/profile/output is acceptable?
8. What redaction policy preserves auditability for IPs, hostnames, DUT
   identifiers, lab screenshots, configs, and packet captures?
9. For M8A-V4, is operator-family endpoint authority sufficient for the
   planned scene, or will any later review require site-level, same-site,
   active-path, or performance authority?

## 2026-05-17 Addendum — `src/runtime/link-budget/` Higher-Level NTN Wrapper

Date: 2026-05-17. Docs-only addendum to record a higher-level NTN wrapper that
shipped alongside the existing `src/features/itu-r-physics/` close-out (S4
follow-on amendment). This addendum does NOT change any prior status closure
on this roadmap; it records the new module set and its relationship to the
existing P.838/P.618 close-out.

New module set under `src/runtime/link-budget/`:

- `free-space-path-loss.ts` — standalone 3GPP TR 38.811 §6.6.2 FSPL fn
  (the existing `itu-r-physics` suite did not expose FSPL as a standalone fn).
- `rain-attenuation.ts` — ITU-R P.618-14 §2.2.1 effective slant path plus
  polarization handling. The P.838-3 coefficient table lookup is **delegated**
  to the existing `src/features/itu-r-physics/itu-r-p838-rain-attenuation.ts`
  via `computeSpecificAttenuation`; the full 1-100 GHz P.838-3 table remains
  the single source of truth in `itu-r-physics/`.
- `gas-absorption.ts` — standalone ITU-R P.676-13 Annex 2 slant-path estimate
  (the existing `itu-r-p618-link-budget.ts` only exposed the composite
  `A_rain + A_gas + A_cloud + A_scint` form; this is the granular standalone).
- `antenna-pattern.ts` — ITU-R S.1528 (non-GSO satellite) + S.465-6 (Earth
  station) NTN-specific pattern fns. The existing `itu-r-f699-antenna-pattern.ts`
  remains canonical for the older F.699 generic recommendation; both patterns
  cover different rec families and coexist.
- `handover-policy.ts` — 3GPP TR 38.821 §7.3 handover trigger metrics +
  user-verbal addendum V-MO1 cross-orbit LIVE handover policy. Not present in
  the existing `itu-r-physics/` suite.

Live caller seams:

- `src/runtime/bootstrap-physical-input-seeds.ts` → existing
  `itu-r-physics/itu-r-p618-link-budget.ts` (composite-attenuation path used
  by bootstrap physical-input families; unchanged).
- `src/features/multi-station-selector/runtime-projection.ts` → new
  `link-budget/` modules (multi-station-selector V4 runtime projection,
  including rain UI + CSV; documented in
  `docs/itri-requirement-walkthrough.md`).

The two seams serve different feature paths and do not collide. The only
real duplication, the P.838-3 coefficient table, is resolved by delegation
(commit `794a34e` on 2026-05-17).

No retained-evidence status changes. The existing S4 / S4R1 close-outs remain
authoritative for what the public-standards-profile reviewer accepts; this
addendum only records the additional module footprint.
