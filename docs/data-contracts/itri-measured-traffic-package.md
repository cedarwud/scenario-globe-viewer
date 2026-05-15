# customer Measured Traffic Package Data Contract

Date: 2026-05-13

Status: docs-only reviewer/import schema for future retained F-07/F-08/F-09
measured traffic packages. This document does not create runtime
implementation, tests, package files, retained output evidence, or JSON
fixtures. It does not assert that a retained measured traffic package exists.

Related roadmap:
[../sdd/itri-requirement-completion-roadmap.md](../sdd/itri-requirement-completion-roadmap.md).

Related plans and contracts:

- [../sdd/itri-f07-f09-measured-traffic-evidence-package-plan.md](../sdd/itri-f07-f09-measured-traffic-evidence-package-plan.md)
- [../sdd/itri-v02-v06-external-validation-readiness-package.md](../sdd/itri-v02-v06-external-validation-readiness-package.md)
- [itri-synthetic-fallback-fixtures.md](./itri-synthetic-fallback-fixtures.md)
- [soak-evidence.md](./soak-evidence.md)
- [../sdd/phase-6-plus-requirement-centered-plan.md](../sdd/phase-6-plus-requirement-centered-plan.md)

## Purpose

This contract defines the import and reviewer schema for a future retained
measured traffic package under:

```text
output/validation/external-f07-f09/<timestamp>-measured-traffic/
```

The schema lets a future importer or reviewer decide whether a submitted
package is structurally reviewable, incomplete, redacted but still reviewable,
rejected, or eligible for an authority-backed pass verdict for a named
requirement. It is a data contract only.

Schema/import readiness does not close measured traffic truth. A package can be
well-formed and still carry no authority verdict if raw artifacts, topology,
thresholds, or owner review are missing.

## Authority Boundary

The authority ladder from the roadmap applies:

- Tier 1 retained authority evidence may support measured F-07/F-08/F-09
  verdicts only for the exact retained scope.
- Tier 2 public or official method/context sources may guide fields, parser
  behavior, and runbook wording, but do not supply project results.
- Tier 3 synthetic fixtures are governed by S11 and may support only
  UI/schema/parser rehearsal or negative-gap rehearsal.
- Tier 4 readiness surfaces expose gaps and handoff requests only.

This schema must not be used to infer:

- measured latency, jitter, loss, throughput, or continuity from modeled route
  state;
- V-02..V-06 authority verdicts from F-07/F-08/F-09 traffic results alone;
- DUT, NAT, tunnel, bridge, traffic-generator, or packet-path success without
  retained topology and raw artifacts;
- customer orbit-model integration;
- radio-layer handover;
- full customer acceptance.

## Covered Requirements

| Requirement | Reviewer meaning in this contract | Minimum retained evidence for authority review |
| --- | --- | --- |
| F-07 | Communication-time display backed by retained traffic timing artifacts. | Raw `ping` or owner-approved timing logs, endpoint identity, direction, run window, sample count, parsed RTT fields, topology, redaction notes, and threshold authority when a pass/fail verdict is requested. |
| F-08 | Communication-time statistics backed by retained raw logs and computed distributions. | Raw log references, parsed sample count, duration, RTT distribution, jitter source, packet-loss source, computation method, and reviewer notes for each statistic. |
| F-09 | Communication-rate display backed by retained throughput artifacts. | Raw `iperf3` client/server logs or approved traffic-generator output, direction, protocol, duration, intervals, retransmits or loss where applicable, topology proof, and threshold authority when a pass/fail verdict is requested. |

## Relation To V-02..V-06

F-07/F-08/F-09 measured traffic packages may depend on V-02..V-06 evidence, but
they do not automatically close those validation lanes.

| Related ID | When it is in scope for this package | Required relation fields |
| --- | --- | --- |
| V-02 | The run uses Windows, WSL, or a Windows-to-WSL path. | Host, WSL distro, network mode, tool inventory, interface refs, route refs, command transcript refs, and Windows/WSL environment artifact refs. |
| V-03 | Traffic crosses a tunnel, bridge, TAP/TUN path, or bridge process. | Tunnel endpoint refs, bridge process refs, bridge config refs, bridge log refs, traffic path refs, and packet-path evidence or a policy-backed alternate. |
| V-04 | Traffic crosses ESTNeT/INET, NAT, gateway mapping, or simulated-to-real bridge state. | ESTNeT/OMNeT++ scenario identity, INET node refs, NAT rule refs, gateway mapping refs, route refs, interface refs, and raw traffic refs tied to the path. |
| V-05 | A virtual DUT is part of the traffic path or testbench. | Virtual DUT identity, image/version, testbench source/version, DUT-facing interface refs, route refs, raw DUT log refs, and verdict refs from the DUT owner. |
| V-06 | A physical DUT, NE-ONE, or other traffic generator is part of the run. | Physical DUT or generator identity, model/version/profile, topology/cabling/port mapping refs, raw output refs, packet-capture policy, and lab owner notes. |

If a topology indicator marks one of these surfaces as used, the related
validation requirement must be listed in `relatedValidationRequirements`. If
required relation fields are missing, the reviewer state cannot be
`authority-pass`.

## Package Metadata

Every future manifest must carry these package-level fields:

| Field | Required rule |
| --- | --- |
| `schemaVersion` | Must identify this contract, for example `itri.f07-f09.measured-traffic-package.v1`. |
| `packageId` | Stable package identifier. It must be unique across retained measured traffic packages. |
| `runId` | Stable run identifier supplied by the validation owner or testbed operator. |
| `packagePath` | Package-relative or repo-relative retained directory path. |
| `capturedAt` | ISO-8601 timestamp for the measurement capture start or primary capture event. |
| `capturedUntil` | ISO-8601 timestamp for the measurement capture end when known. |
| `timezone` | Timezone used by command transcripts and human review notes. |
| `validationOwner` | Owner object with organization or lab, role, contact channel if retained, reviewer role, and authority scope. |
| `redactionPolicy` | Policy object naming redaction owner, policy id/version, redaction level, auditability effect, and packet-capture allowance. |
| `topologyId` | Stable ID linking the manifest to retained topology artifacts. |
| `canonicalRoute` | Route context when applicable, such as `/?scenePreset=regional&m8aV4GroundStationScene=1`; route context is not measured evidence by itself. |
| `toolVersions` | Tool version object described below. |
| `coveredRequirements` | Array containing one or more of `F-07`, `F-08`, and `F-09`. |
| `relatedValidationRequirements` | Array of V-02..V-06 relation records when the topology uses those surfaces. |
| `nonClaims` | Machine-readable nonclaim object described below. |

`toolVersions` must preserve every tool that produced, transformed, or reviewed
evidence:

| Tool field | Examples |
| --- | --- |
| `ping` | OS `ping` implementation and version, command source, platform notes. |
| `iperf3` | `iperf3 --version`, client/server host IDs, protocol support notes. |
| `trafficGenerator` | NE-ONE or other generator model, software version, profile version, export format. |
| `packetCapture` | `tcpdump`, Wireshark, pktmon, or equivalent version when captures are allowed. |
| `os` | Windows, Linux, WSL distro, kernel, host build, or container image version. |
| `estnetInet` | ESTNeT, OMNeT++, INET, scenario, module, and build identifiers when used. |
| `tunnelBridge` | Tunnel/bridge process name, version/commit, config version, and owner. |
| `dut` | Virtual or physical DUT model, image, firmware, software, or redacted asset version. |
| `importer` | Future importer/parser version when a manifest is imported. |
| `schemaValidator` | Future validator version when one exists. |

## Endpoint And Topology Fields

The manifest must describe endpoint identity and packet path without relying on
the viewer route as a substitute for retained topology evidence.

| Field | Required content |
| --- | --- |
| `topology.topologyId` | Same value as package-level `topologyId`. |
| `topology.source` | Endpoint object for the traffic source: endpoint ID, host ID, role, hostname or redacted hostname, IP/CIDR refs, interface refs, namespace, OS, and command transcript refs. |
| `topology.target` | Endpoint object for the traffic target with the same identity fields as `source`. |
| `topology.direction` | `source-to-target`, `target-to-source`, `bidirectional`, or an owner-defined value with notes. |
| `topology.expectedPathRefs` | Package-relative refs to topology diagram, topology JSON, route tables, interface inventories, NAT rules, tunnel/bridge records, DUT records, and packet-path notes. |
| `topology.pathIndicators.usesWindowsWsl` | Boolean plus V-02 relation ref when true. |
| `topology.pathIndicators.usesTunnel` | Boolean plus V-03 relation ref and tunnel artifact refs when true. |
| `topology.pathIndicators.usesBridge` | Boolean plus V-03 relation ref and bridge artifact refs when true. |
| `topology.pathIndicators.usesNat` | Boolean plus V-04 relation ref and NAT artifact refs when true. |
| `topology.pathIndicators.usesEstnetInet` | Boolean plus V-04 relation ref and ESTNeT/INET artifact refs when true. |
| `topology.dutInvolvement.mode` | `none`, `virtual-dut`, `physical-dut`, `traffic-generator-only`, or `physical-dut-and-generator`. |
| `topology.dutInvolvement.refs` | V-05 or V-06 relation refs, DUT identity refs, profile refs, raw output refs, and reviewer notes when mode is not `none`. |
| `topology.clockSync` | Clock source, sync method, max known skew, and refs proving or explaining time alignment. |

Endpoint IPs, hostnames, serials, and asset IDs may be redacted only under the
retained `redactionPolicy`. Redaction must not remove the ability to verify
which source, target, direction, path, and run window produced the raw logs if
an authority verdict is requested.

## Raw Artifact References

Raw artifacts are the evidence source of record. Parsed metrics may never
replace them.

| Artifact field | Required rule |
| --- | --- |
| `artifactRefs.commandsTranscript` | Package-relative ref to command records with command IDs, timestamps, host, shell, command, exit code, stdout/stderr refs, and operator. |
| `artifactRefs.pingLogs[]` | Raw `ping` log refs with command ID, source, target, direction, sample count expected, run window, platform, and parser status. |
| `artifactRefs.iperf3ClientLogs[]` | Raw `iperf3 -J` client JSON refs when `iperf3` is used, including protocol, port, direction, duration, interval, parallel streams, and command ID. |
| `artifactRefs.iperf3ServerLogs[]` | Raw server-side refs paired to client logs, including host ID, port, run window, and command ID. |
| `artifactRefs.trafficGeneratorOutputs[]` | Raw output refs from NE-ONE or another approved traffic generator, plus profile/config refs and owner notes. |
| `artifactRefs.packetCaptures` | Capture refs when allowed. If captures are not allowed, include policy ref, omission reason, and alternate path evidence refs. |
| `artifactRefs.topology` | Topology diagram, topology JSON, interface inventory, route table, NAT rule, tunnel/bridge, DUT, and redaction refs. |
| `artifactRefs.redactions` | Ref to redaction notes explaining each redacted field category and whether auditability remains. |

All artifact refs must resolve inside the package directory. External URLs may
be supplemental context only; they cannot replace retained raw logs.

## Parsed Metrics

Parsed metrics must link back to raw artifacts through `sourceArtifactRefs`.
Missing raw references make the metric non-authoritative.

| Metric field | Required rule |
| --- | --- |
| `sampleCount` | Count of retained samples used by the metric. Separate attempted, received, lost, and excluded counts when available. |
| `duration` | Planned and observed duration, start/end timestamps, timezone, and source command IDs. |
| `rttDistributionMs` | Minimum, maximum, average, median when computable, percentiles when computable, standard deviation when computable, and distribution source. |
| `jitter` | Numeric jitter fields plus `jitterSource`, such as `iperf3-udp`, approved traffic generator, or owner-approved log. Do not infer jitter from TCP throughput logs unless the threshold owner approves that method. |
| `loss` | Lost packets, total packets, loss percentage, source tool, and raw refs. |
| `throughputIntervals` | Per-interval start/end, bits per second or bytes, protocol, stream count, direction, and raw interval source. |
| `retransmitsOrLoss` | TCP retransmits when TCP is used, UDP lost packets/loss when UDP is used, or traffic-generator equivalent with method notes. |
| `computationMethod` | Parser/importer version or manual review method, including excluded rows and redaction effects. |

## Threshold Authority

Thresholds are external authority inputs, not parser constants.

| Field | Required rule |
| --- | --- |
| `thresholdAuthority.thresholdOwner` | Person, role, organization, or lab owner authorized to define pass/fail rules. |
| `thresholdAuthority.thresholdVersion` | Version, memo ID, document ID, or approval record for the threshold set. |
| `thresholdAuthority.approvedAt` | ISO-8601 approval timestamp when available. |
| `thresholdAuthority.requirementRules[]` | Per-requirement rules naming metric, comparator, value, unit, direction, duration, sample-count assumptions, and artifact refs. |
| `thresholdAuthority.unresolvedThresholdState` | `none`, `owner-missing`, `version-missing`, `rules-missing`, `scope-mismatch`, or `pending-review`. |
| `thresholdAuthority.unresolvedThresholdNotes[]` | Required when state is not `none`. |

Any reviewer state of `authority-pass` requires:

- retained raw artifacts for the requirement;
- parsed metrics linked to those raw artifacts;
- topology and endpoint fields sufficient for the claim scope;
- threshold owner and threshold version;
- explicit pass/fail rules covering the relevant metric, direction, duration,
  loss, and sample-count assumptions;
- redaction status that remains auditable;
- human reviewer notes tying the rule to the retained evidence.

## Reviewer Verdict States

Reviewer verdicts are package-review states, not runtime states.

| State | Meaning | May be used when |
| --- | --- | --- |
| `importable` | The package is structurally complete enough for a reviewer or future parser to ingest. It is not a pass verdict. | Required metadata exists, artifact refs resolve, topology fields are coherent, and no import-blocking schema errors are present. Thresholds may still be unresolved. |
| `incomplete` | The package is present but missing required metadata, raw artifacts, topology fields, metrics, threshold fields, or relation fields. | Missing fields are specific and correctable. |
| `redacted-reviewable` | Redactions exist but the retained package still lets a reviewer evaluate source, target, direction, timing, topology, raw logs, and thresholds. | Redaction policy is retained, all redacted categories are listed, and auditability remains sufficient for the requested scope. |
| `rejected` | The package must not be imported as measured evidence. | Raw logs are absent, refs do not resolve, topology is unverifiable, redaction blocks auditability, source tier is synthetic for a measured package, thresholds are fabricated, or artifacts contradict the claimed scope. |
| `authority-pass` | A named requirement has an authority-backed pass verdict for the exact retained evidence scope. | Only when the retained evidence and threshold authority rules above are satisfied. This state must be assigned per requirement, not globally by default. |

Recommended per-requirement review shape:

```ts
interface ItriMeasuredTrafficRequirementReview {
  requirementId: "F-07" | "F-08" | "F-09";
  reviewerState:
    | "importable"
    | "incomplete"
    | "redacted-reviewable"
    | "rejected"
    | "authority-pass";
  evidenceScope: string;
  sourceArtifactRefs: ReadonlyArray<string>;
  parsedMetricRefs: ReadonlyArray<string>;
  thresholdRuleRefs: ReadonlyArray<string>;
  relatedValidationRequirementRefs: ReadonlyArray<
    "V-02" | "V-03" | "V-04" | "V-05" | "V-06"
  >;
  reviewer: {
    nameOrRole: string;
    reviewedAt: string;
    notes: ReadonlyArray<string>;
  };
}
```

## Import Schema Sketch

The following TypeScript shape is a schema sketch for a future importer. It is
not an implementation and not a fixture.

```ts
type ItriMeasuredTrafficRequirementId = "F-07" | "F-08" | "F-09";
type ItriRelatedValidationRequirementId =
  | "V-02"
  | "V-03"
  | "V-04"
  | "V-05"
  | "V-06";

type ItriMeasuredTrafficReviewerState =
  | "importable"
  | "incomplete"
  | "redacted-reviewable"
  | "rejected"
  | "authority-pass";

interface ItriMeasuredTrafficPackageManifest {
  schemaVersion: "itri.f07-f09.measured-traffic-package.v1";
  packageId: string;
  runId: string;
  packagePath: string;
  capturedAt: string;
  capturedUntil: string | null;
  timezone: string;
  validationOwner: ItriValidationOwner;
  redactionPolicy: ItriMeasuredTrafficRedactionPolicy;
  topologyId: string;
  canonicalRoute: string | null;
  toolVersions: ItriMeasuredTrafficToolVersions;
  coveredRequirements: ReadonlyArray<ItriMeasuredTrafficRequirementId>;
  relatedValidationRequirements: ReadonlyArray<ItriRelatedValidationRequirement>;
  topology: ItriMeasuredTrafficTopology;
  artifactRefs: ItriMeasuredTrafficArtifactRefs;
  parsedMetrics: ReadonlyArray<ItriMeasuredTrafficParsedMetricSet>;
  thresholdAuthority: ItriMeasuredTrafficThresholdAuthority;
  reviewerVerdicts: ReadonlyArray<ItriMeasuredTrafficRequirementReview>;
  syntheticFallbackBoundary: ItriMeasuredTrafficSyntheticFallbackBoundary;
  nonClaims: ItriMeasuredTrafficNonClaims;
}

interface ItriValidationOwner {
  organization: string;
  role: string;
  authorityScope: ReadonlyArray<string>;
  contactRef: string | null;
}

interface ItriMeasuredTrafficRedactionPolicy {
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
}

interface ItriMeasuredTrafficToolVersions {
  ping?: string;
  iperf3?: string;
  trafficGenerator?: string;
  packetCapture?: string;
  os: ReadonlyArray<string>;
  estnetInet?: string;
  tunnelBridge?: string;
  dut?: string;
  importer?: string;
  schemaValidator?: string;
}

interface ItriRelatedValidationRequirement {
  requirementId: ItriRelatedValidationRequirementId;
  inScope: boolean;
  reason: string;
  artifactRefs: ReadonlyArray<string>;
  reviewerNotes: ReadonlyArray<string>;
}

interface ItriMeasuredTrafficEndpoint {
  endpointId: string;
  hostId: string;
  role: "source" | "target" | "server" | "client" | "generator" | "dut";
  hostnameRef: string | null;
  ipCidrsRef: string | null;
  interfaceRefs: ReadonlyArray<string>;
  namespace: string | null;
  osRef: string | null;
  commandTranscriptRefs: ReadonlyArray<string>;
}

interface ItriMeasuredTrafficTopology {
  topologyId: string;
  source: ItriMeasuredTrafficEndpoint;
  target: ItriMeasuredTrafficEndpoint;
  direction:
    | "source-to-target"
    | "target-to-source"
    | "bidirectional"
    | string;
  expectedPathRefs: ReadonlyArray<string>;
  pathIndicators: {
    usesWindowsWsl: boolean;
    usesTunnel: boolean;
    usesBridge: boolean;
    usesNat: boolean;
    usesEstnetInet: boolean;
  };
  dutInvolvement: {
    mode:
      | "none"
      | "virtual-dut"
      | "physical-dut"
      | "traffic-generator-only"
      | "physical-dut-and-generator";
    refs: ReadonlyArray<string>;
    notes: ReadonlyArray<string>;
  };
  clockSync: {
    source: string;
    maxKnownSkewMs: number | null;
    artifactRefs: ReadonlyArray<string>;
    notes: ReadonlyArray<string>;
  };
}

interface ItriMeasuredTrafficArtifactRefs {
  commandsTranscript: string;
  pingLogs: ReadonlyArray<ItriPingLogRef>;
  iperf3ClientLogs: ReadonlyArray<ItriIperf3ClientLogRef>;
  iperf3ServerLogs: ReadonlyArray<ItriIperf3ServerLogRef>;
  trafficGeneratorOutputs: ReadonlyArray<ItriTrafficGeneratorOutputRef>;
  packetCaptures: {
    allowed: boolean;
    captureRefs: ReadonlyArray<string>;
    policyRef: string;
    omissionReason: string | null;
    alternatePathEvidenceRefs: ReadonlyArray<string>;
  };
  topology: ReadonlyArray<string>;
  redactions: string;
}

interface ItriPingLogRef {
  ref: string;
  commandId: string;
  sourceEndpointId: string;
  targetEndpointId: string;
  direction: string;
  runWindow: { startedAt: string; endedAt: string | null };
  expectedSampleCount: number | null;
}

interface ItriIperf3ClientLogRef {
  ref: string;
  commandId: string;
  protocol: "tcp" | "udp" | string;
  direction: string;
  port: number | null;
  durationSeconds: number | null;
  intervalSeconds: number | null;
  parallelStreams: number | null;
}

interface ItriIperf3ServerLogRef {
  ref: string;
  commandId: string;
  serverEndpointId: string;
  port: number | null;
  runWindow: { startedAt: string; endedAt: string | null };
}

interface ItriTrafficGeneratorOutputRef {
  ref: string;
  tool: string;
  profileRef: string | null;
  configRefs: ReadonlyArray<string>;
  ownerNotes: ReadonlyArray<string>;
}

interface ItriMeasuredTrafficParsedMetricSet {
  metricId: string;
  requirementIds: ReadonlyArray<ItriMeasuredTrafficRequirementId>;
  sourceArtifactRefs: ReadonlyArray<string>;
  direction: string;
  sampleCount: {
    attempted: number | null;
    received: number | null;
    lost: number | null;
    excluded: number | null;
  };
  duration: {
    plannedSeconds: number | null;
    observedSeconds: number | null;
    startedAt: string | null;
    endedAt: string | null;
  };
  rttDistributionMs?: {
    min: number | null;
    avg: number | null;
    median: number | null;
    p95: number | null;
    p99: number | null;
    max: number | null;
    stddev: number | null;
    source: "ping" | "approved-timing-log" | string;
  };
  jitter?: {
    minMs: number | null;
    avgMs: number | null;
    maxMs: number | null;
    jitterSource: "iperf3-udp" | "traffic-generator" | "owner-approved-log" | string;
    methodNotes: ReadonlyArray<string>;
  };
  loss?: {
    lostPackets: number | null;
    totalPackets: number | null;
    lossPct: number | null;
    source: string;
  };
  throughputIntervals?: ReadonlyArray<{
    startedAt: string | null;
    endedAt: string | null;
    seconds: number | null;
    bitsPerSecond: number | null;
    bytesTransferred: number | null;
    protocol: "tcp" | "udp" | string;
    streamCount: number | null;
    retransmits: number | null;
    lostPackets: number | null;
    lossPct: number | null;
  }>;
  computationMethod: {
    parserVersion: string | null;
    manualReviewMethod: string | null;
    excludedRows: ReadonlyArray<string>;
    redactionEffects: ReadonlyArray<string>;
  };
}

interface ItriMeasuredTrafficThresholdAuthority {
  thresholdOwner: string | null;
  thresholdVersion: string | null;
  approvedAt: string | null;
  requirementRules: ReadonlyArray<{
    ruleId: string;
    requirementId: ItriMeasuredTrafficRequirementId;
    metricName: string;
    comparator: "<" | "<=" | ">" | ">=" | "==" | "between" | string;
    value: number | string | null;
    unit: string | null;
    direction: string | null;
    durationAssumption: string | null;
    sampleCountAssumption: string | null;
    artifactRefs: ReadonlyArray<string>;
  }>;
  unresolvedThresholdState:
    | "none"
    | "owner-missing"
    | "version-missing"
    | "rules-missing"
    | "scope-mismatch"
    | "pending-review";
  unresolvedThresholdNotes: ReadonlyArray<string>;
}

interface ItriMeasuredTrafficSyntheticFallbackBoundary {
  s11ContractRef: "docs/data-contracts/itri-synthetic-fallback-fixtures.md";
  measuredPackageAllowsSyntheticSource: false;
  allowedSyntheticUses: ReadonlyArray<
    "schema-rehearsal" | "parser-shape-test" | "negative-gap-rehearsal"
  >;
  rejectMeasuredImportWhenSourceTierIsSynthetic: true;
}

interface ItriMeasuredTrafficNonClaims {
  schemaImportReadinessIsMeasuredTrafficTruth: false;
  externalValidationTruthFromImport: false;
  v02ThroughV06VerdictFromTrafficOnly: false;
  dutNatTunnelPathSuccessFromSchemaOnly: false;
  itriOrbitModelIntegration: false;
  radioLayerHandover: false;
  fullItriAcceptance: false;
}
```

## Import Readiness Rules

A future importer should fail closed with `incomplete` or `rejected` when any
of these conditions is true:

- `packageId`, `runId`, `capturedAt`, `validationOwner`, `redactionPolicy`,
  `topologyId`, or `toolVersions` is missing.
- A package-relative artifact ref does not resolve.
- Parsed metrics exist without raw artifact refs.
- `coveredRequirements` omits the requirement named by a reviewer verdict.
- `source`, `target`, `direction`, or `expectedPathRefs` is missing.
- A tunnel, bridge, NAT, ESTNeT/INET, Windows/WSL, virtual DUT, physical DUT,
  or traffic-generator indicator is true but the related V-02..V-06 record is
  absent.
- Redaction level is `audit-blocking` for a requested authority verdict.
- `thresholdAuthority.unresolvedThresholdState` is not `none` for a requested
  `authority-pass`.
- The package source tier is synthetic or raw logs are hand-authored shape
  examples.
- A pass/fail rule is embedded in parser code or package summary without a
  threshold owner and threshold version.

An `importable` state means only that the package can be reviewed. It does not
convert bounded repo-owned communication-time or rate surfaces into retained
traffic evidence.

## S11 Synthetic Fallback Boundary

S11 remains the only allowed home for synthetic F-07/F-08/F-09 fixture rules:
[itri-synthetic-fallback-fixtures.md](./itri-synthetic-fallback-fixtures.md).

Synthetic fallback material may be used for:

- schema rehearsal;
- parser shape tests;
- chart or reviewer-manifest rehearsal;
- negative/gap package rehearsal.

Synthetic fallback material must not be imported as a retained measured traffic
package. If a future manifest declares synthetic provenance, generated rows,
hand-authored shape examples, or `tier-3-synthetic` source tier, the reviewer
state for measured evidence must be `rejected` or kept outside the measured
package importer.

## Review Checklist

Before assigning any authority-backed requirement verdict, the reviewer must
confirm:

1. The package has a unique `packageId` and `runId`.
2. `capturedAt`, run window, command timestamps, and clock-sync notes are
   coherent.
3. `validationOwner`, `redactionPolicy`, `topologyId`, and `toolVersions` are
   present.
4. Source, target, direction, and packet path are traceable through retained
   topology artifacts.
5. Raw `ping`, `iperf3`, traffic-generator, DUT, and packet-capture artifacts
   are retained when applicable.
6. Parsed sample count, RTT distribution, jitter source, loss, throughput
   intervals, retransmits or loss, and duration link back to raw refs.
7. Related V-02..V-06 fields are present for every topology indicator in use.
8. Threshold owner, threshold version, and pass/fail rules cover the exact
   metric scope being reviewed.
9. Redactions are documented and do not block auditability for the requested
   scope.
10. S11 synthetic fallback material has not been substituted for retained raw
    traffic artifacts.
11. The package notes preserve that schema/import readiness is separate from
    measured traffic truth and external validation authority.
