# ITRI Retained Evidence Request Packet

Date: 2026-05-14

Status: docs-only evidence request packet for remaining authority-gated ITRI
lanes. This file is a request for owner-supplied retained material. It is not
retained evidence, a package manifest, a fixture, a reviewer result, or an
implementation authorization.

Related roadmap:
[itri-requirement-completion-roadmap.md](./itri-requirement-completion-roadmap.md).

Related data contracts and reviewer close-outs:

- [../data-contracts/itri-measured-traffic-package.md](../data-contracts/itri-measured-traffic-package.md)
- [../data-contracts/itri-decision-threshold-authority.md](../data-contracts/itri-decision-threshold-authority.md)
- [../data-contracts/itri-external-validation-manifest.md](../data-contracts/itri-external-validation-manifest.md)
- [../data-contracts/itri-orbit-model-intake.md](../data-contracts/itri-orbit-model-intake.md)
- [../data-contracts/itri-external-source-package-intake.schema.json](../data-contracts/itri-external-source-package-intake.schema.json)
- [../data-contracts/itri-public-standards-profile.md](../data-contracts/itri-public-standards-profile.md)
- [../data-contracts/itri-synthetic-fallback-fixtures.md](../data-contracts/itri-synthetic-fallback-fixtures.md)
- [itri-f07r1-measured-traffic-package-reviewer-closeout.md](./itri-f07r1-measured-traffic-package-reviewer-closeout.md)
- [itri-f12r1-decision-threshold-authority-reviewer-closeout.md](./itri-f12r1-decision-threshold-authority-reviewer-closeout.md)
- [itri-v02r1-external-validation-manifest-reviewer-closeout.md](./itri-v02r1-external-validation-manifest-reviewer-closeout.md)
- [itri-f01r1-orbit-model-intake-reviewer-closeout.md](./itri-f01r1-orbit-model-intake-reviewer-closeout.md)
- [itri-s4r1-public-standards-profile-reviewer-closeout.md](./itri-s4r1-public-standards-profile-reviewer-closeout.md)

## Overview

This packet tells external owners what retained artifacts must be supplied
before the remaining ITRI authority lanes can move beyond request/review
readiness. It does not collect data, run tools, create retained packages under
`output/`, or author fixture JSON.

Every owner submission must identify the exact lane, scope, authority owner,
time window, redaction policy, retained artifact paths, and redistribution
limits. Repo reviewers can only use the commands listed below after a package
has arrived in the contract-specific retained package directory and after its
raw refs resolve inside that package.

## Packet-Wide Nonclaims

This request packet preserves these boundaries:

- It creates no retained evidence and no retained package material.
- It does not assert truth for project traffic measurements.
- It does not assert truth for external validation.
- It does not assert an F-01 orbit-model authority result.
- It does not assert arbitrary F-03/F-15 external source-package acceptance
  beyond the current bounded public fixtures.
- It does not assert F-12 decision-threshold authority from traffic
  measurements.
- It does not assert physical authority backed by public standards.
- It does not assert pass status for DUT, NAT, tunnel, bridge,
  traffic-generator, Windows/WSL, ESTNeT/INET, or lab paths.
- It does not assert radio-frequency handover at the native layer.
- It does not assert active service assignment for satellites, gateways, or
  packet paths.
- It does not assert ITRI acceptance as complete.

## Packet-Wide Not Sufficient Examples

The following submissions are not sufficient for the authority-gated lanes:

- screenshots only;
- summary-only verdicts;
- synthetic fixture data;
- public TLE substitution for F-01;
- vendored public fixture success as proof of arbitrary owner-supplied source
  breadth;
- public standards without selected parameters/vectors;
- environment inventory without traffic proof;
- measured logs without topology/time/window/threshold context.

## F-03/F-15 External TLE And Scenario Source Package

Target package family:
Future owner-supplied package material shaped by
`docs/data-contracts/itri-external-source-package-intake.schema.json` if ITRI
requires source breadth beyond the current vendored public fixtures. No
retained package directory or reviewer exists for this lane yet.

Required owner-supplied artifact checklist:

- Manifest shaped by the S12-A external source package intake schema.
- Source package identity, owner, received time, license/use notes,
  redistribution policy, and reviewer record.
- Source type and scope: public TLE feed, private TLE drop, owner-provided
  catalog, prerecorded scenario bundle, real-time source endpoint, or mixed
  source family.
- Catalog epoch, update cadence, stale-data policy, checksum policy, and
  retention policy.
- Scenario mapping rules that explain how source records map to LEO/MEO/GEO,
  real-time vs prerecorded modes, replay windows, and route-visible scenario
  IDs.
- Raw source files or private owner-system refs, plus manifest/checksum refs.
- Owner notes that state whether the package is intended only for bounded
  public-source review or for ITRI/source-owner acceptance.

Minimum metadata:

- `schemaVersion`, package ID, source owner, source family, source tier,
  authority classification, received time, access time when public, epoch
  range, time system, update cadence, stale-data policy, license/use notes,
  redistribution limits, checksum list, reviewer, covered requirements, and
  scenario mapping scope.
- Mode rules for real-time and prerecorded use, including fallback behavior
  when source data is unavailable, stale, malformed, or outside the accepted
  epoch window.
- Explicit relationship to F-01: whether this source package is independent of
  the ITRI orbit-model package or only a public/source-profile fallback.

Raw artifact expectations:

- Retained source files or private owner-system refs for each source family.
- Manifest/checksum refs for every retained catalog file.
- Access-date and version/epoch refs for public sources.
- Scenario mapping refs that bind source records to route/runtime scenario
  identities.
- Reviewer notes for duplicate records, stale epochs, mixed source families,
  unsupported orbit classes, and source records that fail parsing.

Redaction and redistribution notes:

- Private source packages may be referenced by owner-system refs when raw files
  cannot be committed, but checksums, source identity, epoch range, scope, and
  review notes must remain auditable.
- Public source metadata can be retained with URL, access date, version/epoch,
  and license/use notes.
- Public CelesTrak/Space-Track fixtures can support bounded public-source
  profiles, but they do not by themselves satisfy a private or owner-supplied
  source acceptance request.

Reviewer command after package arrival:

```text
No F-03/F-15 source-package reviewer exists yet. The S12-A schema defines only
the package intake shape. If ITRI requires review for this lane, open a bounded
source-package reviewer slice before runtime integration.
```

## F-07/F-08/F-09 Measured Traffic Package

Target package family:
`output/validation/external-f07-f09/<timestamp>-measured-traffic/`.

Required owner-supplied artifact checklist:

- Manifest using the measured traffic package contract.
- Endpoint identities for source and target, including redacted host/IP refs
  when needed.
- Topology and packet-path proof for every Windows/WSL, tunnel, bridge, NAT,
  ESTNeT/INET, virtual DUT, physical DUT, or generator surface used by the run.
- Raw timing logs, raw rate logs, or approved traffic-generator outputs for the
  claimed F-07/F-08/F-09 scope.
- Parsed metric records that link to raw artifact refs.
- Threshold owner, threshold version, per-requirement rules, and reviewer
  notes when any pass/fail verdict is requested.
- Redaction notes and packet-capture allowance or omission rationale.

Minimum metadata:

- `schemaVersion`, `packageId`, `runId`, `packagePath`, `capturedAt`,
  `capturedUntil`, and `timezone`.
- `validationOwner`, authority scope, contact reference when retained, and
  reviewer role.
- `redactionPolicy`, `toolVersions`, `topologyId`,
  `coveredRequirements`, and related V-lane records when topology uses those
  surfaces.
- Source, target, direction, duration, sample counts, command IDs, clock-sync
  notes, and threshold authority state.

Raw artifact expectations:

- Command transcripts with host, shell, timestamps, command text, exit code,
  stdout/stderr refs, and operator.
- Raw `ping` or owner-approved timing logs for F-07/F-08.
- Raw `iperf3` client/server JSON or approved generator output for F-09.
- Topology diagrams or JSON, interface inventory, route tables, NAT rules,
  tunnel/bridge records, DUT/generator refs, and packet-path notes when in
  scope.
- Packet captures when allowed; otherwise a policy ref plus alternate path
  evidence.
- Raw artifacts must be package-relative and resolve inside the retained
  package directory.

Redaction and redistribution notes:

- Redactions may hide sensitive hostnames, IPs, MACs, serials, lab asset IDs,
  or packet payloads only when the policy keeps source, target, direction,
  time window, topology, and threshold review auditable.
- If redaction blocks review of endpoint identity class, path, raw logs, or
  thresholds, the package must remain incomplete or rejected by the reviewer.
- Redistribution limits must state whether parsed projections, summaries, or
  reviewer outputs may be committed.

Reviewer command after package arrival:

```text
node scripts/review-itri-measured-traffic-package.mjs --package output/validation/external-f07-f09/<timestamp>-measured-traffic
```

## F-12 Decision Threshold Authority Package

Target package family:
`output/validation/external-f12/<timestamp>-decision-threshold-authority/`.

Required owner-supplied artifact checklist:

- Manifest using the F-12 decision threshold authority contract.
- Threshold owner, threshold version, rule version, approval record, effective
  date, and supersession policy.
- Decision rules with comparator, unit, weight when applicable, priority,
  tie-breaker, hysteresis, fallback, missing-field behavior, and sample-window
  basis.
- Retained F-07/F-08/F-09 package refs for every traffic-derived field used by
  a rule.
- Measured-field mappings that name raw artifact refs, parsed metric refs,
  threshold rule refs, and handover event refs.
- Redaction notes and use restrictions.

Minimum metadata:

- `schemaVersion`, `authorityId`, `owner`, `receivedAt`, `reviewer`,
  `redactionPolicy`, `useNotes`, `coveredRequirements`, `measuredPackageRefs`,
  `thresholdAuthority`, `decisionRules`, and `nonClaims`.
- Requirement scope, route/topology/endpoint-pair scope when applicable,
  traffic direction, sample window, candidate set, and approval refs.

Raw artifact expectations:

- The F-12 package must retain rule, threshold, approval, redaction, and review
  refs inside its package directory.
- Referenced measured packages must live under
  `output/validation/external-f07-f09/` and must retain their own raw artifact
  refs.
- Every rule input must point back to reviewed measured package fields for the
  exact requirement and sample window.
- Bounded proxy policy/rule config output is not a substitute unless the
  authority package explicitly approves a mapping and scope.

Redaction and redistribution notes:

- Redaction must not remove authority owner, threshold version, approval record,
  measured package linkage, sample-window basis, or rule semantics needed for
  review.
- Use notes must state whether thresholds and reviewer summaries may be
  retained in the repo or only referenced by private owner-system refs.
- Any redaction that prevents audit of rule authority keeps the package outside
  the ready reviewer state.

Reviewer command after package arrival:

```text
node scripts/review-itri-f12-decision-threshold-authority.mjs --package output/validation/external-f12/<timestamp>-decision-threshold-authority
```

## V-02 Windows/WSL Evidence

Target package family:
`output/validation/external-v02-v06/<timestamp>-external-validation/`.

Required owner-supplied artifact checklist:

- External validation manifest with `V-02` in `coveredRequirements`.
- Windows host inventory, WSL distro/release, WSL mode, kernel/build details,
  interfaces, routes, namespaces when applicable, and tool versions.
- Command transcripts proving the environment values and the intended
  Windows-to-WSL traffic path.
- Raw traffic output tied to source, target, direction, timing, and topology.
- Owner verdict refs or review notes for the V-02 scope.

Minimum metadata:

- `schemaVersion`, `packageId`, `runId`, `packagePath`, `capturedAt`,
  `capturedUntil`, `timezone`, `validationOwner`, `redactionPolicy`,
  `reviewer`, `coveredRequirements`, and V-02 lane review fields.
- Host IDs, distro ID, WSL mode, source/target endpoint IDs, tool versions,
  route/interface refs, and clock-sync notes.

Raw artifact expectations:

- Windows command output for version/build, interfaces, routes, and tooling.
- WSL command output for distro, kernel, interfaces, routes, and tooling.
- Raw traffic logs and command transcripts for the intended path.
- Packet captures when allowed, or alternate path evidence when captures are
  not allowed.

Redaction and redistribution notes:

- Redacted hostnames, IPs, MACs, and user names must retain stable refs that
  still let the reviewer follow source, target, and route identity.
- A platform inventory without retained traffic proof is a gap, not V-02
  review completion.
- Redistribution notes must state which host and route artifacts may be
  committed, summarized, or only referenced privately.

Reviewer command after package arrival:

```text
node scripts/review-itri-external-validation-manifest.mjs --package output/validation/external-v02-v06/<timestamp>-external-validation
```

## V-03 Tunnel/Bridge Evidence

Target package family:
`output/validation/external-v02-v06/<timestamp>-external-validation/`.

Required owner-supplied artifact checklist:

- External validation manifest with `V-03` in `coveredRequirements`.
- Tunnel endpoint config, bridge process command/config/logs, interface refs,
  route refs, and expected direction.
- Packet-path evidence showing traffic crosses the expected tunnel or bridge
  path.
- Raw traffic output tied to tunnel/bridge refs and command IDs.
- Owner verdict refs or review notes for the V-03 scope.

Minimum metadata:

- Package/run metadata from the external validation manifest contract.
- Tunnel IDs, bridge IDs, process/version refs, endpoint refs, bind/remote
  address refs, protocol/port, direction, timing window, and clock-sync notes.
- Redaction policy and capture policy.

Raw artifact expectations:

- Retained tunnel config and logs.
- Retained bridge command line, config, version/commit, and logs.
- Interface and route tables before and during the run when available.
- Raw traffic logs and packet captures when allowed; otherwise alternate path
  evidence approved by the owner.

Redaction and redistribution notes:

- Endpoint addresses and tunnel secrets may be redacted, but the retained refs
  must still prove which configured path was under review.
- Secret material must be excluded or replaced with owner-approved redaction
  notes.
- A topology diagram or screenshot alone cannot replace configs, logs, and
  traffic-path artifacts.

Reviewer command after package arrival:

```text
node scripts/review-itri-external-validation-manifest.mjs --package output/validation/external-v02-v06/<timestamp>-external-validation
```

## V-04 NAT/ESTNeT/INET Evidence

Target package family:
`output/validation/external-v02-v06/<timestamp>-external-validation/`.

Required owner-supplied artifact checklist:

- External validation manifest with `V-04` in `coveredRequirements`.
- ESTNeT/OMNeT++ scenario identity, INET node/module mapping, run parameters,
  build/version refs, and scenario logs.
- NAT/gateway mapping, route tables, interface mapping, NAT rule refs, and
  gateway owner notes.
- Raw traffic logs tied to the simulated-to-real path.
- Owner verdict refs or review notes for the V-04 scope.

Minimum metadata:

- Package/run metadata from the external validation manifest contract.
- Scenario IDs, build/version IDs, gateway IDs, source/destination subnet refs,
  route refs, NAT rule IDs, tool identity, timing window, and clock-sync notes.
- Redaction policy and packet-capture policy.

Raw artifact expectations:

- Raw ESTNeT, OMNeT++, and INET scenario/config/log refs.
- Raw Windows or Linux NAT/routing command output, plus INET or ESTNeT gateway
  mapping where applicable.
- Raw traffic logs linked to command transcripts, endpoints, direction, and
  route/NAT refs.
- Packet captures when allowed, or alternate owner-approved path evidence.

Redaction and redistribution notes:

- NAT addresses, subnets, lab asset names, and gateway identifiers may be
  redacted only with stable refs and enough topology context for review.
- Vendor or simulator config redistribution limits must identify what may be
  retained in the repo.
- A NAT table without traffic proof, or traffic output without NAT/topology
  refs, remains insufficient.

Reviewer command after package arrival:

```text
node scripts/review-itri-external-validation-manifest.mjs --package output/validation/external-v02-v06/<timestamp>-external-validation
```

## V-05 Virtual DUT Evidence

Target package family:
`output/validation/external-v02-v06/<timestamp>-external-validation/`.

Required owner-supplied artifact checklist:

- External validation manifest with `V-05` in `coveredRequirements`.
- Virtual DUT identity, image/version, testbench source/version/commit, config
  refs, DUT-facing interfaces/routes, and traffic profile.
- Raw DUT logs, raw testbench output, traffic output, and owner verdict refs.
- Topology refs showing where the virtual DUT sits in the packet path.

Minimum metadata:

- Package/run metadata from the external validation manifest contract.
- DUT ID, owner, image ref/version, testbench ref/version, config refs,
  interface refs, route refs, output refs, owner verdict refs, timing window,
  and clock-sync notes.

Raw artifact expectations:

- Retained virtual DUT image/version evidence or private owner-system refs.
- Testbench command transcripts, configs, stdout/stderr refs, and logs.
- DUT-facing interface and route tables.
- Raw traffic logs and DUT outputs linked to source, target, direction, and
  traffic profile.

Redaction and redistribution notes:

- Image names, private registry refs, DUT IDs, and testbench repos may be
  redacted only when stable owner-system refs remain reviewable.
- Redistribution policy must state whether DUT logs and testbench output may be
  committed, summarized, or retained only by private reference.
- Placeholder DUT output or schema-only rows are not acceptable for this lane.

Reviewer command after package arrival:

```text
node scripts/review-itri-external-validation-manifest.mjs --package output/validation/external-v02-v06/<timestamp>-external-validation
```

## V-06 Physical DUT / Traffic Generator Evidence

Target package family:
`output/validation/external-v02-v06/<timestamp>-external-validation/`.

Required owner-supplied artifact checklist:

- External validation manifest with `V-06` in `coveredRequirements`.
- Physical DUT or traffic-generator identity, model, firmware/software version,
  profile/config refs, topology/cabling/port mapping, and operator notes.
- Raw DUT, NE-ONE, or other generator outputs; raw traffic output; packet
  capture policy; and lab owner verdict refs.
- Timing, clock-sync, traffic profile, and success-criteria refs.

Minimum metadata:

- Package/run metadata from the external validation manifest contract.
- DUT or generator ID, model/version/profile, cabling refs, port mapping refs,
  operator, source/target endpoints, direction, duration, packet size or
  bandwidth settings, interval settings, timing refs, and owner verdict refs.

Raw artifact expectations:

- Retained lab topology, cabling, port mapping, and traffic profile files.
- Raw generator exports, DUT logs, testbench logs, command transcripts, and
  traffic output.
- Packet captures when allowed; otherwise policy ref and alternate path
  evidence.
- Redaction notes for serials, ports, lab assets, and packet content.

Redaction and redistribution notes:

- Serials, asset IDs, cabling labels, lab photos, and packet captures may be
  redacted under policy, but the reviewer must still be able to connect the
  retained run to the claimed DUT/generator path.
- Vendor output redistribution limits must state which raw files can be kept in
  the repo and which require private owner-system refs.
- A lab verdict without raw outputs and topology/cabling context is
  insufficient.

Reviewer command after package arrival:

```text
node scripts/review-itri-external-validation-manifest.mjs --package output/validation/external-v02-v06/<timestamp>-external-validation
```

## F-01 ITRI Orbit-Model Intake Package

Target package family:
`output/validation/external-f01-orbit-model/<timestamp>-orbit-model-intake/`.

Required owner-supplied artifact checklist:

- Manifest using the orbit-model intake contract.
- Model package identity, owner, received time, redistribution policy, license
  and use notes, and reviewer record.
- Model name/version, propagation method, coordinate frames, frame definition
  refs, time system, epoch rules, input schema, output schema, units, and
  uncertainty/tolerance fields.
- Validation vectors with inputs, expected outputs or retained refs,
  tolerances, comparison method, and failure handling.
- Owner notes for projection allowance and adapter planning boundaries.

Minimum metadata:

- `packageId`, `owner`, `receivedAt`, `redistributionPolicy`,
  `licenseUseNotes`, `reviewer`, `sourceTier`, `redactionPolicy`,
  `sourcePackageLocation`, `projectionAllowed`, and review notes.
- Model identity, input contract, output contract, validation vectors,
  adapter-boundary notes, status fields, and nonclaims.

Raw artifact expectations:

- Retained model metadata and schema refs, or private owner-system refs allowed
  by redistribution policy.
- Validation vector input/output refs, checksum refs, comparison method, and
  tolerance refs.
- Frame/time definition refs and unit declarations.
- Any projected artifact refs must be explicitly allowed and tied back to the
  owner package.

Redaction and redistribution notes:

- Proprietary model internals, equations, constants, and package files may be
  excluded from public repo artifacts when private owner-system refs and
  checksums preserve reviewability.
- Redistribution policy must state whether metadata, validation-vector
  summaries, projected samples, or reviewer output may be retained.
- Public TLE output, public catalogs, or synthetic samples cannot replace the
  owner-supplied model package and validation vectors.

Reviewer command after package arrival:

```text
node scripts/review-itri-orbit-model-intake.mjs --package output/validation/external-f01-orbit-model/<timestamp>-orbit-model-intake
```

## S4/F-17/P-01/P-02/P-03 Public Standards And V-Group Physical Parameters

Target package family:
`output/validation/public-standards-profiles/<profile-id>/`.

Required owner-supplied artifact checklist:

- Public standards profile package using the S4-B contract, or a retained
  ITRI/V-group authority package that supersedes the bounded public profile.
- Selected ITU recommendations, version IDs, access dates, URLs, source-lineage
  records, and license/use notes.
- Selected frequency bands, geography, rain-rate source, rain-height source,
  path geometry, elevation angle, polarization, antenna class, pointing
  assumptions, output units, approximation level, and covered requirements.
- Validation vectors, tolerances, reviewer role, acceptance status, and
  replacement rules.
- V-group owner notes when the profile is intended to move beyond bounded
  public profile readiness.

Minimum metadata:

- `schemaVersion`, `profileId`, `profileDate`, `coveredRequirements`,
  `profileScope`, `sourceTier`, `selectedRecommendations`, `sourceLineage`,
  `accessDates`, `versionIds`, `licenseUseNotes`, physical/profile fields,
  `validationVectors`, `tolerances`, `reviewer`, `acceptanceStatus`,
  `nonClaims`, and `replacementRules`.
- For V-group authority escalation: owner, approval record, selected parameter
  set, validation-vector refs, tolerance refs, scope, use limits, and
  supersession policy.

Raw artifact expectations:

- Retained `profile.json` and any package-local retained refs.
- Source-lineage refs back to the classified official ITU sources used by the
  profile.
- Owner-supplied parameter/vector/tolerance refs when the profile depends on
  ITRI/V-group selection.
- License/use notes that avoid copying restricted recommendation prose, tables,
  equations, or component data without later review.

Redaction and redistribution notes:

- Standards source metadata may be retained, but restricted content must not be
  copied into repo payloads unless policy allows it.
- Owner-supplied physical parameters, validation vectors, or tolerances may be
  redacted only when stable refs and scope notes remain sufficient for review.
- Public standards source IDs alone are not enough; selected parameters,
  vectors, tolerances, and owner scope must be present before stronger review
  can proceed.

Reviewer command after package arrival:

```text
node scripts/review-itri-public-standards-profile.mjs --package output/validation/public-standards-profiles/<profile-id>
```

## Handoff To Implementation

Future implementation must wait for retained package material from the
appropriate owner. A docs-only request, schema contract, close-out note,
synthetic fixture, screenshot, public source list, or environment inventory
does not provide the retained owner evidence needed to change runtime behavior,
viewer claims, acceptance rows, or authority-gated reviewer states.

After owner material arrives, the next slice should first run the matching
reviewer command against the explicit local package path, record any incomplete
or rejected gaps, and only then plan implementation against the reviewed
package scope.
