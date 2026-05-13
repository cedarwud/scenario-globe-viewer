# ITRI External Validation Manifest Contract

Date: 2026-05-13

Status: docs-only reviewer/import schema for future retained V-02..V-06
external validation packages. This document does not create runtime
implementation, tests, package files, retained output evidence, fixture JSON
files, or any assertion that external validation succeeded.

Related roadmap:
[../sdd/itri-requirement-completion-roadmap.md](../sdd/itri-requirement-completion-roadmap.md).

Related plans and contracts:

- [../sdd/itri-v02-v06-external-validation-readiness-package.md](../sdd/itri-v02-v06-external-validation-readiness-package.md)
- [../sdd/itri-v02-v06-external-validation-evidence-package-plan.md](../sdd/itri-v02-v06-external-validation-evidence-package-plan.md)
- [itri-measured-traffic-package.md](./itri-measured-traffic-package.md)
- [itri-synthetic-fallback-fixtures.md](./itri-synthetic-fallback-fixtures.md)
- [soak-evidence.md](./soak-evidence.md)
- [../sdd/phase-6-plus-requirement-centered-plan.md](../sdd/phase-6-plus-requirement-centered-plan.md)

## Purpose

This contract defines the common manifest envelope for future retained external
validation packages under:

```text
output/validation/external-v02-v06/<timestamp>-external-validation/
```

The manifest lets a future importer or reviewer decide whether a retained
package is structurally importable, incomplete, redacted but still reviewable,
rejected, or eligible for an authority-backed pass verdict for a named V
requirement. The schema is a data contract only. A well-formed manifest can
still have no authority pass verdict when raw artifacts, topology proof,
redaction review, or owner verdicts are missing.

## Authority Boundary

The roadmap authority ladder applies:

- Tier 1 retained authority evidence may support V-02..V-06 verdicts only for
  the exact retained package scope.
- Tier 2 public or official method/context sources may guide field names,
  parser behavior, and runbook wording, but do not supply project-specific run
  results.
- Tier 3 synthetic fixtures remain governed by S11 and may support only
  schema, parser, UI, or negative-gap rehearsal.
- Tier 4 readiness surfaces expose gaps and handoff requests only.

This manifest must not be used to infer:

- a pass verdict for V-02..V-06 from schema shape alone;
- NAT, tunnel, bridge, virtual DUT, physical DUT, or traffic-generator success
  without retained raw artifacts and owner review;
- measured traffic truth for F-07/F-08/F-09 without the measured traffic
  package contract;
- ITRI orbit-model integration;
- native radio-frequency handover behavior;
- full ITRI acceptance.

## Covered Lanes

Every future manifest must include one lane record for each covered requirement
and should include all five V lanes when the package claims to cover the full
external validation set.

| Requirement | Lane name | Minimum retained authority material for review |
| --- | --- | --- |
| V-02 | Windows / WSL | Windows host inventory, WSL distro and mode, interfaces, routes, tools, command transcripts, and traffic proof for the intended Windows-to-WSL setup. |
| V-03 | Tunnel / bridge | Tunnel endpoints, bridge process command/config/logs, packet-path evidence, and traffic crossing the expected tunnel or bridge path. |
| V-04 | NAT / ESTNeT / INET | ESTNeT or OMNeT++ scenario identity, INET NAT or gateway mapping, host interface mapping, route tables, NAT tables, and raw traffic logs tied to the simulated-to-real path. |
| V-05 | Virtual DUT | Virtual DUT identity, image/version, testbench source/version, DUT-facing interfaces/routes, traffic profile, raw DUT logs, raw testbench output, and owner verdict. |
| V-06 | Physical DUT / traffic generator | Physical DUT or generator identity, model/firmware/software, topology/cabling/port mapping, NE-ONE or traffic-generator profile, raw outputs, packet-capture policy, and lab owner verdict. |

## Manifest Metadata

Every manifest must carry these package-level fields:

| Field | Required rule |
| --- | --- |
| `schemaVersion` | Must identify this contract, for example `itri.v02-v06.external-validation-manifest.v1`. |
| `packageId` | Stable package identifier unique across retained external validation packages. |
| `runId` | Stable run identifier supplied by the validation owner, lab, or external testbed operator. |
| `capturedAt` | ISO-8601 timestamp for the primary capture start or the first retained command in the run. |
| `capturedUntil` | ISO-8601 timestamp for the capture end when known. |
| `timezone` | Timezone used by command transcripts and human review notes. |
| `validationOwner` | Owner object with organization or lab, role, authority scope, and retained contact reference when allowed. |
| `packagePath` | Repo-relative retained package directory path. All package artifact refs must resolve inside this directory unless explicitly marked supplemental. |
| `redactionPolicy` | Policy object naming owner, policy id/version, redaction level, packet-capture allowance, redacted categories, and auditability effect. |
| `reviewer` | Reviewer object with name or role, review time, review scope, and notes. A reviewer may mark structure importable without assigning an authority pass verdict. |
| `coveredRequirements` | Array containing one or more of `V-02`, `V-03`, `V-04`, `V-05`, and `V-06`. Full-package review should contain all five. |
| `relatedMeasuredTrafficPackages` | Optional relation records to F-07/F-08/F-09 measured traffic packages when the same run produces measured timing or throughput artifacts. |
| `nonClaims` | Machine-readable nonclaim object described below. |

## Environment Fields

Environment records must preserve the host, guest, simulation, DUT-facing, and
tool versions that produced the package artifacts. Unknown values must be
explicitly `null` or carried as a known gap; they must not be inferred from a
developer workstation.

| Field | Required content |
| --- | --- |
| `environment.windows` | Edition, version, build number, architecture, hostname or redacted hostname ref, timezone, Hyper-V or virtualization notes, and command refs proving the values. |
| `environment.wsl` | WSL version, distro name, distro release, WSL mode (`wsl1`, `wsl2`, `mirrored`, `nat`, or owner-defined), kernel version, namespace notes, and command refs. |
| `environment.linux` | Linux distribution, release, kernel, container or VM identity when applicable, namespace, and command refs. |
| `environment.interfaces[]` | Interface id, host id, interface name, kind, MAC or redacted MAC ref, IP/CIDR refs, MTU, state, namespace, and source command ref. |
| `environment.routes[]` | Host id, destination, gateway, interface name, metric, table, namespace, and source command ref. |
| `environment.toolVersions` | Versions and command refs for `ping`, `iperf` or `iperf3`, packet-capture tooling, NAT tooling, tunnel tooling, bridge processes, ESTNeT, OMNeT++, INET, DUT testbench, NE-ONE or other generator, importer, and schema validator when present. |
| `environment.clockSync` | Clock source, sync method, maximum known skew, time authority refs, and notes for hosts, WSL, simulation nodes, DUTs, and generators. |

## Topology Fields

The manifest must describe endpoint identity and packet path through retained
topology artifacts. Viewer route state, screenshots, or readiness copy cannot
replace topology evidence.

| Field | Required content |
| --- | --- |
| `topology.topologyId` | Stable run-local topology id. |
| `topology.diagramRefs` | Package-relative refs to `topology.md`, exported diagrams, or diagram source files. |
| `topology.endpoints[]` | Endpoint id, role, host id, hostname or redacted ref, IP/CIDR refs, interface refs, namespace, OS ref, DUT/generator role when applicable, and command transcript refs. |
| `topology.tunnelRefs[]` | Tunnel endpoint refs, bind address, remote address, protocol, port, owning process, config refs, and logs. |
| `topology.bridgeRefs[]` | Bridge process id, command line ref, config refs, interface refs, namespace, version or commit, log refs, and expected direction. |
| `topology.natRoutingRefs[]` | NAT table refs, route table refs, gateway refs, rule ids, source commands, table/chain names, match/action summary, and platform/tool identity. |
| `topology.estnetInetScenarioRefs[]` | ESTNeT, OMNeT++, and INET scenario ids, module map refs, run parameter refs, build/version refs, INET node refs, and scenario log refs. |
| `topology.gatewayMapping[]` | Gateway id, source subnet, destination subnet, NAT rule refs, route refs, host interface refs, simulated node refs, and owner notes. |
| `topology.trafficPaths[]` | Path id, source endpoint, target endpoint, tool, protocol, expected route refs, tunnel/bridge/NAT refs, DUT refs, generator refs, raw log refs, and result classification. |

## DUT And Traffic Generator Fields

DUT and generator records are required when V-05 or V-06 is covered or when a
traffic path uses those surfaces.

| Field | Required content |
| --- | --- |
| `dut.virtual` | Virtual DUT id, owner, image or VM/container ref, image version, testbench source/version/commit, config refs, command refs, DUT-facing interface refs, route refs, traffic profile refs, output refs, and owner verdict refs. |
| `dut.physical` | Physical DUT id or redacted asset ref, model, firmware/software version, serial policy, port mapping, cabling/topology refs, operator, DUT log refs, and owner verdict refs. |
| `trafficGenerator.neOne` | NE-ONE model, software version, profile id, profile refs, scenario refs, timing refs, output refs, and redaction notes when NE-ONE is used. |
| `trafficGenerator.other` | Generator name/model/version, profile/config refs, export format, source/target endpoint refs, raw output refs, and owner notes for any non-NE-ONE generator. |
| `trafficProfile` | Protocol, ports, direction, duration, packet size or bandwidth settings, interval settings, payload notes, success criteria refs, and threshold owner refs when a pass verdict is requested. |

## Raw Artifact References

Raw artifacts are the evidence source of record. Normalized JSON, summaries,
and screenshots may supplement review, but they must not replace raw logs or
configuration files.

| Artifact field | Required rule |
| --- | --- |
| `artifactRefs.commandsTranscript` | Package-relative ref to command records with command ids, requirement ids, host, shell, cwd, timestamps, timezone, command, exit code, stdout/stderr refs, operator, and notes. |
| `artifactRefs.configs[]` | Config refs for tunnel, bridge, NAT, ESTNeT, OMNeT++, INET, DUT, generator, and traffic profiles. |
| `artifactRefs.logs[]` | Raw process, bridge, simulation, DUT, generator, packet-path, failure, and review logs. |
| `artifactRefs.routeTables[]` | Raw Windows, WSL, Linux, ESTNeT/INET, DUT-facing, and namespace route-table refs. |
| `artifactRefs.natTables[]` | Raw Windows NAT, Linux `nft`, Linux `iptables`, INET NAT, ESTNeT gateway, or owner-equivalent NAT/routing refs. |
| `artifactRefs.packetCaptures` | Capture refs when allowed. If captures are not allowed, include policy ref, omission reason, and alternate path-evidence refs. |
| `artifactRefs.trafficResults` | Raw `ping`, `iperf`, `iperf3`, traffic-generator, and owner-approved traffic output refs, each linked to command id, endpoints, direction, timing, and path refs. |
| `artifactRefs.dutOutputs[]` | Raw virtual DUT, physical DUT, testbench, firmware/software log, and owner verdict refs. |
| `artifactRefs.screenshots[]` | Supplemental screenshot refs only. Each screenshot must state which raw artifact or reviewer note it illustrates. |
| `artifactRefs.redactions` | Ref to redaction notes explaining each redacted category and whether auditability remains. |

All artifact refs that support a reviewer verdict must resolve inside the
retained package directory. External URLs may provide method or product context
only; they cannot replace retained command transcripts, configs, logs, route
tables, NAT tables, DUT outputs, traffic output, or packet captures when those
are required for the requested scope.

## Relation To F-07/F-08/F-09 Measured Traffic

This contract and
[itri-measured-traffic-package.md](./itri-measured-traffic-package.md) are
related but separate.

| Relation | Required rule |
| --- | --- |
| Same run produces measured traffic artifacts | Add `relatedMeasuredTrafficPackages[]` with package id, path, run id, covered F requirements, raw traffic refs shared with this package, and reviewer notes. |
| Measured package depends on V surfaces | The measured traffic package must list V-02..V-06 relation records for every Windows/WSL, tunnel, bridge, NAT, ESTNeT/INET, DUT, or generator surface used by its topology. |
| External validation package uses measured logs | This manifest may reference the same raw `ping`, `iperf`, or generator outputs, but must still retain the topology, environment, NAT/tunnel/DUT, redaction, and owner-verdict fields required by the V lane. |
| Verdict separation | A measured traffic `authority-pass` for F-07/F-08/F-09 does not automatically assign an authority verdict to V-02..V-06. A V-lane `authority-pass` does not automatically assign measured traffic truth unless the measured traffic contract is also satisfied. |

## Reviewer Verdict States

Reviewer verdicts are package-review states, not runtime states. Assign them per
requirement. A package-level rollup may summarize the per-requirement states,
but it must not promote an unreviewed lane.

| State | Meaning | May be used when |
| --- | --- | --- |
| `importable` | The package is structurally complete enough for a reviewer or future parser to ingest. It is not a pass verdict. | Required metadata exists, artifact refs resolve, environment and topology fields are coherent, and no import-blocking schema errors are present. Owner verdicts may still be unresolved. |
| `incomplete` | The package is present but missing required metadata, raw artifacts, topology fields, environment fields, DUT/generator fields, redaction notes, or owner verdicts. | Missing fields are specific and correctable. |
| `redacted-reviewable` | Redactions exist but the retained package still lets a reviewer evaluate host identity class, source, target, direction, timing, topology, raw logs, configs, routes, NAT/routing state, DUT/generator output, and owner verdict for the requested scope. | Redaction policy is retained, all redacted categories are listed, and auditability remains sufficient for the requested scope. |
| `rejected` | The package must not be imported as external validation evidence. | Raw logs are absent, refs do not resolve, topology is unverifiable, source tier is synthetic for a validation package, redaction blocks auditability, owner verdicts are fabricated or absent for a requested authority review, or artifacts contradict the claimed scope. |
| `authority-pass` | A named V requirement has an authority-backed pass verdict for the exact retained evidence scope. | Only when retained raw evidence, lane-required topology/environment/DUT fields, auditability-preserving redactions, and a validation-owner verdict exist for that requirement. |

Recommended per-requirement review shape:

```ts
type ItriExternalValidationRequirementId =
  | "V-02"
  | "V-03"
  | "V-04"
  | "V-05"
  | "V-06";

type ItriExternalValidationReviewerState =
  | "importable"
  | "incomplete"
  | "redacted-reviewable"
  | "rejected"
  | "authority-pass";

interface ItriExternalValidationRequirementReview {
  requirementId: ItriExternalValidationRequirementId;
  reviewerState: ItriExternalValidationReviewerState;
  evidenceScope: string;
  sourceArtifactRefs: ReadonlyArray<string>;
  ownerVerdictRefs: ReadonlyArray<string>;
  relatedMeasuredTrafficPackageRefs: ReadonlyArray<string>;
  reviewer: {
    nameOrRole: string;
    reviewedAt: string;
    notes: ReadonlyArray<string>;
  };
}
```

## Redaction And Auditability Rules

Redaction is allowed only when the retained `redactionPolicy` preserves enough
context for the requested review scope.

- Redacted IPs, hostnames, MAC addresses, serials, lab asset IDs, topology
  screenshots, configs, and packet captures must have category-level notes.
- Redaction must not remove the ability to verify source endpoint, target
  endpoint, direction, timing, topology path, command provenance, and owner
  verdict when `authority-pass` is requested.
- Packet captures may be omitted only when the policy says captures are not
  allowed or require unavailable owner approval. The manifest must then name
  alternate path evidence such as bridge logs, NAT counters, route state, or
  DUT/generator logs.
- `audit-blocking` redaction forces `incomplete` or `rejected` for any lane
  that needs the redacted facts for authority review.
- Screenshots of terminals, lab equipment, DUT consoles, or topology diagrams
  must be treated as supplemental unless paired with retained raw command,
  config, log, or output refs.
- Every redaction decision must be attributable to a policy owner, policy
  version, reviewed time, and reviewer note.

## S11 Synthetic Fallback Boundary

S11 remains the only allowed home for synthetic V-02..V-06 fixture rules:
[itri-synthetic-fallback-fixtures.md](./itri-synthetic-fallback-fixtures.md).

Synthetic fallback material may be used for:

- schema rehearsal;
- parser shape tests;
- UI or reviewer-manifest rehearsal;
- negative/gap package rehearsal.

Synthetic fallback material must not be imported as retained external
validation evidence. If a future manifest declares synthetic provenance,
generated rows, hand-authored shape examples, or `tier-3-synthetic` source
tier, the reviewer state for external validation evidence must be `rejected` or
kept outside this importer.

## Import Schema Sketch

The following TypeScript shape is a schema sketch for a future importer. It is
not an implementation and not a fixture.

```ts
interface ItriExternalValidationManifest {
  schemaVersion: "itri.v02-v06.external-validation-manifest.v1";
  packageId: string;
  runId: string;
  packagePath: string;
  capturedAt: string;
  capturedUntil: string | null;
  timezone: string;
  validationOwner: ItriExternalValidationOwner;
  redactionPolicy: ItriExternalValidationRedactionPolicy;
  reviewer: ItriExternalValidationReviewer;
  coveredRequirements: ReadonlyArray<ItriExternalValidationRequirementId>;
  environment: ItriExternalValidationEnvironment;
  topology: ItriExternalValidationTopology;
  dut: ItriExternalValidationDut;
  trafficGenerator: ItriExternalValidationTrafficGenerator;
  trafficProfile: ItriExternalValidationTrafficProfile;
  artifactRefs: ItriExternalValidationArtifactRefs;
  relatedMeasuredTrafficPackages: ReadonlyArray<ItriMeasuredTrafficRelation>;
  reviewerVerdicts: ReadonlyArray<ItriExternalValidationRequirementReview>;
  syntheticFallbackBoundary: ItriExternalValidationSyntheticFallbackBoundary;
  nonClaims: ItriExternalValidationNonClaims;
}

interface ItriExternalValidationOwner {
  organization: string;
  role: string;
  authorityScope: ReadonlyArray<ItriExternalValidationRequirementId>;
  contactRef: string | null;
  ownerVerdictRefs: ReadonlyArray<string>;
}

interface ItriExternalValidationRedactionPolicy {
  policyId: string;
  policyVersion: string;
  owner: string;
  redactionLevel: "none" | "partial" | "heavy" | "audit-blocking";
  redactedCategories: ReadonlyArray<string>;
  packetCapturePolicy:
    | "allowed-retained"
    | "allowed-redacted"
    | "not-allowed"
    | "owner-approval-required";
  auditability: "full" | "reviewable" | "blocked";
  policyRef: string;
}

interface ItriExternalValidationReviewer {
  nameOrRole: string;
  reviewedAt: string | null;
  reviewScope: ReadonlyArray<ItriExternalValidationRequirementId>;
  notes: ReadonlyArray<string>;
}

interface ItriExternalValidationEnvironment {
  windows: ItriEnvironmentHost | null;
  wsl: ItriEnvironmentWsl | null;
  linux: ItriEnvironmentHost | null;
  interfaces: ReadonlyArray<ItriInterfaceInventoryRef>;
  routes: ReadonlyArray<ItriRouteInventoryRef>;
  toolVersions: ItriExternalValidationToolVersions;
  clockSync: {
    source: string | null;
    maxKnownSkewMs: number | null;
    artifactRefs: ReadonlyArray<string>;
    notes: ReadonlyArray<string>;
  };
}

interface ItriEnvironmentHost {
  hostId: string;
  osName: string;
  osVersion: string | null;
  build: string | null;
  architecture: string | null;
  hostnameRef: string | null;
  timezone: string | null;
  sourceCommandRefs: ReadonlyArray<string>;
}

interface ItriEnvironmentWsl extends ItriEnvironmentHost {
  distroName: string;
  distroRelease: string | null;
  wslVersion: string | null;
  wslMode: "wsl1" | "wsl2" | "mirrored" | "nat" | string | null;
  kernelVersion: string | null;
}

interface ItriInterfaceInventoryRef {
  interfaceId: string;
  hostId: string;
  interfaceName: string;
  kind: string;
  macAddressRef: string | null;
  ipCidrsRef: string | null;
  mtu: number | null;
  state: string | null;
  namespace: string | null;
  sourceCommandRef: string;
}

interface ItriRouteInventoryRef {
  routeId: string;
  hostId: string;
  destination: string;
  gateway: string | null;
  interfaceName: string | null;
  metric: number | null;
  table: string | null;
  namespace: string | null;
  sourceCommandRef: string;
}

interface ItriExternalValidationToolVersions {
  ping?: string;
  iperf?: string;
  iperf3?: string;
  packetCapture?: string;
  natTooling?: ReadonlyArray<string>;
  tunnelBridge?: ReadonlyArray<string>;
  estnet?: string;
  omnetpp?: string;
  inet?: string;
  dutTestbench?: string;
  neOne?: string;
  trafficGenerator?: string;
  importer?: string;
  schemaValidator?: string;
}

interface ItriExternalValidationTopology {
  topologyId: string;
  diagramRefs: ReadonlyArray<string>;
  endpoints: ReadonlyArray<ItriEndpointRef>;
  tunnelRefs: ReadonlyArray<ItriTunnelRef>;
  bridgeRefs: ReadonlyArray<ItriBridgeRef>;
  natRoutingRefs: ReadonlyArray<ItriNatRoutingRef>;
  estnetInetScenarioRefs: ReadonlyArray<ItriEstnetInetScenarioRef>;
  gatewayMapping: ReadonlyArray<ItriGatewayMappingRef>;
  trafficPaths: ReadonlyArray<ItriTrafficPathRef>;
}

interface ItriEndpointRef {
  endpointId: string;
  role:
    | "source"
    | "target"
    | "client"
    | "server"
    | "windows-host"
    | "wsl"
    | "simulation-node"
    | "virtual-dut"
    | "physical-dut"
    | "traffic-generator"
    | string;
  hostId: string;
  hostnameRef: string | null;
  ipCidrsRef: string | null;
  interfaceRefs: ReadonlyArray<string>;
  namespace: string | null;
  osRef: string | null;
  commandTranscriptRefs: ReadonlyArray<string>;
}

interface ItriTunnelRef {
  tunnelId: string;
  localEndpoint: string;
  remoteEndpoint: string;
  bindAddressRef: string | null;
  remoteAddressRef: string | null;
  protocol: string;
  port: number | null;
  processRef: string;
  configRefs: ReadonlyArray<string>;
  logRefs: ReadonlyArray<string>;
}

interface ItriBridgeRef {
  bridgeId: string;
  processRef: string;
  commandLineRef: string;
  configRefs: ReadonlyArray<string>;
  interfaceRefs: ReadonlyArray<string>;
  namespace: string | null;
  versionOrCommit: string | null;
  logRefs: ReadonlyArray<string>;
  expectedDirection: string;
}

interface ItriNatRoutingRef {
  ruleId: string;
  hostId: string;
  tool: "Get-NetNat" | "nft" | "iptables" | "inet-config" | "estnet-gateway" | string;
  table: string | null;
  chain: string | null;
  matchSummary: string;
  actionSummary: string;
  sourceCommandRef: string;
  rawRef: string;
}

interface ItriEstnetInetScenarioRef {
  scenarioId: string;
  estnetVersion: string | null;
  omnetppVersion: string | null;
  inetVersion: string | null;
  moduleMapRefs: ReadonlyArray<string>;
  runParameterRefs: ReadonlyArray<string>;
  nodeRefs: ReadonlyArray<string>;
  logRefs: ReadonlyArray<string>;
}

interface ItriGatewayMappingRef {
  gatewayId: string;
  sourceSubnetRef: string | null;
  destinationSubnetRef: string | null;
  natRuleRefs: ReadonlyArray<string>;
  routeRefs: ReadonlyArray<string>;
  hostInterfaceRefs: ReadonlyArray<string>;
  simulatedNodeRefs: ReadonlyArray<string>;
  ownerNotes: ReadonlyArray<string>;
}

interface ItriTrafficPathRef {
  pathId: string;
  requirementIds: ReadonlyArray<ItriExternalValidationRequirementId>;
  sourceEndpointId: string;
  targetEndpointId: string;
  tool: "ping" | "iperf" | "iperf3" | "traffic-generator" | string;
  protocol: string | null;
  expectedRouteRefs: ReadonlyArray<string>;
  tunnelRefs: ReadonlyArray<string>;
  bridgeRefs: ReadonlyArray<string>;
  natRoutingRefs: ReadonlyArray<string>;
  dutRefs: ReadonlyArray<string>;
  generatorRefs: ReadonlyArray<string>;
  rawLogRefs: ReadonlyArray<string>;
  resultClassification: "not-run" | "success" | "failure" | "gap" | string;
}

interface ItriExternalValidationDut {
  virtual: ItriVirtualDutRef | null;
  physical: ItriPhysicalDutRef | null;
}

interface ItriVirtualDutRef {
  dutId: string;
  owner: string;
  imageRef: string;
  imageVersion: string | null;
  testbenchRef: string;
  testbenchVersionOrCommit: string | null;
  configRefs: ReadonlyArray<string>;
  commandRefs: ReadonlyArray<string>;
  interfaceRefs: ReadonlyArray<string>;
  routeRefs: ReadonlyArray<string>;
  outputRefs: ReadonlyArray<string>;
  ownerVerdictRefs: ReadonlyArray<string>;
}

interface ItriPhysicalDutRef {
  dutIdOrRedactedAssetRef: string;
  model: string;
  firmwareVersion: string | null;
  softwareVersion: string | null;
  serialPolicy: string;
  portMappingRefs: ReadonlyArray<string>;
  cablingRefs: ReadonlyArray<string>;
  operator: string;
  logRefs: ReadonlyArray<string>;
  ownerVerdictRefs: ReadonlyArray<string>;
}

interface ItriExternalValidationTrafficGenerator {
  neOne: ItriTrafficGeneratorRef | null;
  other: ReadonlyArray<ItriTrafficGeneratorRef>;
}

interface ItriTrafficGeneratorRef {
  generatorId: string;
  toolName: string;
  model: string | null;
  softwareVersion: string | null;
  profileRef: string | null;
  scenarioRefs: ReadonlyArray<string>;
  configRefs: ReadonlyArray<string>;
  timingRefs: ReadonlyArray<string>;
  outputRefs: ReadonlyArray<string>;
  ownerNotes: ReadonlyArray<string>;
}

interface ItriExternalValidationTrafficProfile {
  profileId: string;
  protocol: string;
  ports: ReadonlyArray<number>;
  direction: string;
  durationSeconds: number | null;
  packetSizeBytes: number | null;
  bandwidthSetting: string | null;
  intervalSeconds: number | null;
  payloadNotes: ReadonlyArray<string>;
  successCriteriaRefs: ReadonlyArray<string>;
  thresholdOwnerRefs: ReadonlyArray<string>;
}

interface ItriExternalValidationArtifactRefs {
  commandsTranscript: string;
  configs: ReadonlyArray<string>;
  logs: ReadonlyArray<string>;
  routeTables: ReadonlyArray<string>;
  natTables: ReadonlyArray<string>;
  packetCaptures: {
    allowed: boolean;
    captureRefs: ReadonlyArray<string>;
    policyRef: string;
    omissionReason: string | null;
    alternatePathEvidenceRefs: ReadonlyArray<string>;
  };
  trafficResults: ReadonlyArray<string>;
  dutOutputs: ReadonlyArray<string>;
  screenshots: ReadonlyArray<{
    ref: string;
    supplementalOnly: true;
    illustratesRefs: ReadonlyArray<string>;
  }>;
  redactions: string;
}

interface ItriMeasuredTrafficRelation {
  measuredPackageId: string;
  measuredPackagePath: string;
  measuredRunId: string;
  coveredRequirements: ReadonlyArray<"F-07" | "F-08" | "F-09">;
  sharedRawTrafficRefs: ReadonlyArray<string>;
  relationNotes: ReadonlyArray<string>;
}

interface ItriExternalValidationSyntheticFallbackBoundary {
  s11ContractRef: "docs/data-contracts/itri-synthetic-fallback-fixtures.md";
  externalManifestAllowsSyntheticSource: false;
  allowedSyntheticUses: ReadonlyArray<
    "schema-rehearsal" | "parser-shape-test" | "negative-gap-rehearsal"
  >;
  rejectExternalImportWhenSourceTierIsSynthetic: true;
}

interface ItriExternalValidationNonClaims {
  externalValidationTruthFromSchema: false;
  schemaAloneCreatesV02V06Pass: false;
  natTunnelBridgeDutSuccessFromSchema: false;
  natTunnelBridgeDutValidationFromSchema: false;
  measuredTrafficTruth: false;
  itriOrbitModelIntegration: false;
  nativeRadioFrequencyHandover: false;
  fullItriAcceptance: false;
}
```

## Explicit Nonclaims

Every manifest must carry the `nonClaims` object above with literal `false`
values. These fields are required even when the human review also contains
disclaimers.

The manifest schema alone provides no:

- external validation truth;
- schema-only pass verdict for V-02 through V-06;
- NAT, tunnel, bridge, DUT, or traffic-generator validation result;
- measured traffic truth for F-07/F-08/F-09;
- ITRI orbit-model integration;
- native radio-frequency handover behavior;
- full ITRI acceptance.

A future package may change a reviewer state to `authority-pass` only for the
named V requirement that has retained evidence, auditability-preserving
redactions, and a validation-owner verdict for the exact reviewed scope.

## Import Readiness Rules

A future importer should fail closed with `incomplete` or `rejected` when any
of these conditions is true:

- `packageId`, `runId`, `capturedAt`, `validationOwner`, `packagePath`,
  `redactionPolicy`, `reviewer`, or `coveredRequirements` is missing.
- A package-relative artifact ref does not resolve.
- A covered requirement lacks its lane-specific environment, topology, DUT, or
  generator fields.
- Raw traffic results exist without endpoint, direction, timing, command, and
  topology refs.
- A V-03 path indicator is true but tunnel or bridge refs are absent.
- A V-04 path indicator is true but NAT/routing refs, ESTNeT/OMNeT++/INET
  scenario refs, or gateway mapping refs are absent.
- A V-05 or V-06 path indicator is true but DUT or generator identity, output
  refs, and owner verdict refs are absent.
- Redaction level is `audit-blocking` for a requested authority verdict.
- The package source tier is synthetic or raw logs are hand-authored shape
  examples.
- A pass/fail rule is embedded in parser code or package summary without a
  validation owner verdict and retained success-criteria refs.

An `importable` state means only that the package can be reviewed. It does not
convert the current viewer validation-state seam, readiness package, or
negative/gap package into external validation authority.

## Review Checklist

Before assigning any authority-backed V requirement verdict, the reviewer must
confirm:

1. The package has a unique `packageId` and `runId`.
2. `capturedAt`, run window, command timestamps, and clock-sync notes are
   coherent.
3. `validationOwner`, `packagePath`, `redactionPolicy`, `reviewer`, and
   `coveredRequirements` are present.
4. Windows, WSL, Linux, interfaces, routes, and tool versions are retained when
   the lane depends on them.
5. Endpoints, direction, tunnel/bridge refs, NAT/routing refs, ESTNeT/OMNeT++/
   INET scenario refs, and gateway mapping are traceable through retained
   topology artifacts when in scope.
6. Virtual DUT, physical DUT, NE-ONE, or other traffic-generator identity,
   profile, output, and owner verdict refs are retained when in scope.
7. Raw command transcripts, configs, logs, route tables, NAT tables, packet
   captures when allowed, traffic results, and DUT outputs are retained and
   linked to the requirement being reviewed.
8. Screenshots are supplemental and point back to raw refs.
9. Redactions are documented and do not block auditability for the requested
   scope.
10. Related F-07/F-08/F-09 measured traffic packages are linked only when their
    own manifest contract is also satisfied.
11. S11 synthetic fallback material has not been substituted for retained raw
    external validation artifacts.
12. The package notes preserve that schema/import readiness is separate from
    authority truth, measured traffic truth, and full acceptance.
