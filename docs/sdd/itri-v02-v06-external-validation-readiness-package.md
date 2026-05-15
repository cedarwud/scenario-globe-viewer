# customer V-02..V-06 External Validation Readiness Package

Date: 2026-05-12

Status: pre-execution readiness package. This document prepares the external
testbed run; it does not claim that external validation has passed.

## Authority And Inputs

Read order used for this package:

1. `/home/u24/papers/AGENTS.md`
2. `/home/u24/papers/itri/README.md`
3. `docs/sdd/itri-demo-route-requirement-closure-sdd.md`
4. `docs/sdd/itri-v02-v06-external-validation-evidence-package-plan.md`
5. `output/validation/external-v02-v06/2026-05-11T16-59-27.404Z-external-validation/`

Availability note:

- `/home/u24/papers/itri/v4-quickstart.md`,
  `/home/u24/papers/itri/v4.md`, and `/home/u24/papers/itri/v3.md` are named by
  the workspace authority order, but they are absent in this checkout.
- The clean Phase 5 reviewer package remains the latest route-local bounded
  demo closure evidence:
  `output/itri-v4-demo-redesign-phase5-reviewer-evidence/2026-05-12T04:21:45.118Z`.
  This readiness package does not edit or supersede it.

## Scope And Nonclaim Boundary

This package covers only external validation readiness for:

| ID | External surface |
| --- | --- |
| V-02 | Windows + WSL support evidence |
| V-03 | Tunnel / bridge evidence |
| V-04 | NAT / ESTNeT / INET bridge evidence |
| V-05 | Virtual DUT evidence |
| V-06 | Physical DUT / NE-ONE evidence |

Nonclaims that must remain true until a later retained external evidence
package exists:

- no claim that all original customer requirements are complete;
- no claim that the V4 demo route closes external validation;
- no claim that V-02 through V-06 pass;
- no claim that F-13 is route-native 13-actor closure; the current `>=500 LEO`
  evidence is separate Phase 7.1 evidence only;
- no claim that F-09 is measured throughput, that F-10 is live policy control,
  that F-11 is an arbitrary rule editor, or that F-16 is an external reporting
  system;
- no runtime UI behavior change, no route actor-count change, and no Phase 5
  evidence-package overwrite.

The V4 route may continue to state these surfaces as external gaps. It must not
state live ESTNeT/INET, NAT, tunnel, bridge, DUT, NE-ONE, `ping`, or `iperf`
truth from this readiness package.

## Required Retained Artifact Layout

Each actual external execution should produce a new timestamped package:

```text
output/validation/external-v02-v06/<ISO8601>-external-validation/
  summary.json
  review.md
  topology.md
  topology.json
  environment.json
  interfaces/
    windows.json
    wsl.json
    estnet-inet.json
    dut.json
  routes/
    windows.json
    wsl.json
    estnet-inet.json
  nat-rules/
    windows.txt
    linux-nft.txt
    linux-iptables.txt
    inet-estnet-gateway.txt
  bridge-rules/
    tunnel-endpoints.json
    bridge-processes.json
    bridge-configs/
    bridge-logs/
  commands/
    transcript.jsonl
    raw/
  traffic-results/
    ping/
    iperf/
    packet-captures/
  dut-results/
    virtual/
    physical/
  ne-one/
    profiles/
    outputs/
  redactions.md
```

Every retained file path referenced by `summary.json` must be relative to the
package directory. Raw command, `ping`, `iperf`, DUT, and NE-ONE outputs should
be retained in their original format whenever possible; normalized JSON may be
added, but must not replace raw logs.

## Topology Diagram And Data Fields

The package must include both a human-readable diagram in `topology.md` and a
machine-readable topology inventory in `topology.json`.

`topology.md` must include either a Mermaid diagram, an embedded exported image
reference, or an ASCII diagram that shows:

- Windows host;
- WSL distribution and namespace;
- ESTNeT / OMNeT++ simulation node or process;
- INET NAT node and gateway mapping;
- tunnel endpoints, ports, and direction;
- bridge processes and bridge rules;
- virtual interfaces and real host interfaces;
- virtual DUT when used;
- physical DUT and NE-ONE traffic generator when used;
- expected packet path for `ping` and `iperf`.

`topology.json` must include these fields:

| Field | Required content |
| --- | --- |
| `topologyId` | Stable run-local ID. |
| `generatedAt` | ISO-8601 UTC timestamp. |
| `owner` | External testbed owner or operator. |
| `nodes[]` | `nodeId`, `role`, `host`, `os`, `processName`, `version`, `wslDistro`, `estnetModule`, `inetNode`, `dutId`, `neOneProfileId` as applicable. |
| `interfaces[]` | `nodeId`, `interfaceName`, `kind`, `macAddress`, `ipCidrs[]`, `mtu`, `state`, `namespace`, `sourceCommandRef`. |
| `links[]` | `linkId`, `fromNodeId`, `toNodeId`, `medium`, `subnet`, `expectedDirection`, `tunnelPort`, `bridgeName`, `natRuleRef`. |
| `routes[]` | `nodeId`, `destination`, `gateway`, `interfaceName`, `metric`, `sourceCommandRef`. |
| `natRules[]` | `ruleId`, `nodeId`, `tool`, `table`, `chain`, `match`, `action`, `sourceCommandRef`. |
| `bridgeRules[]` | `ruleId`, `processRef`, `localEndpoint`, `remoteEndpoint`, `bindAddress`, `protocol`, `logRef`. |
| `trafficPaths[]` | `pathId`, `sourceNodeId`, `targetNodeId`, `tool`, `expectedRouteRefs[]`, `logRefs[]`, `result`. |

## Command Transcript Requirements

Retain commands in `commands/transcript.jsonl`. Each line should be one command
record with:

- `commandId`
- `requirementIds`
- `host`
- `shell`
- `cwd`
- `startedAt`
- `endedAt`
- `timezone`
- `command`
- `exitCode`
- `stdoutRef`
- `stderrRef`
- `operator`
- `notes`

Timestamps must be ISO-8601. Preserve both UTC and local timezone context in
the package-level `summary.json`.

## Requirement Evidence Requirements

### V-02 Windows + WSL

Required evidence:

- Windows edition, version, build, architecture, hostname, and timezone.
- WSL version, default distribution, distro release, kernel, and WSL network
  mode if known.
- Interface inventory from Windows and WSL.
- Route table from Windows and WSL.
- Tool inventory for `ping`, `iperf` or `iperf3`, tunnel tooling, bridge
  processes, packet-capture tooling, and NAT tooling.
- Command transcripts proving the inventories and the validation run were
  executed on the intended host.

Pass requires more than environment discovery. It also requires a successful
external validation transcript that uses the Windows + WSL setup.

### V-03 Tunnel / Bridge

Required evidence:

- Tunnel endpoint configuration including interface names, IP/CIDR, port,
  bind address, remote address, and owning process.
- Bridge process command line, config file, version or commit, and logs.
- Packet path evidence for the expected direction, preferably packet capture or
  equivalent bridge logs.
- At least one successful `ping` or `iperf` transcript crossing the expected
  tunnel / bridge path.
- Failure logs if the path does not work.

Pass requires a configured tunnel / bridge path and retained traffic proof
across the expected endpoints.

### V-04 NAT / ESTNeT / INET

Required evidence:

- ESTNeT / OMNeT++ scenario identity, version, module map, and run parameters.
- INET NAT node identity, gateway mapping, and virtual interface mapping.
- Host physical interface mapping and real network gateway.
- NAT rules from the relevant platform, such as Windows `Get-NetNat`, Linux
  `nft`, Linux `iptables`, INET config, or ESTNeT gateway config.
- Route tables from host, WSL, ESTNeT / INET nodes, and DUT-facing namespaces
  where applicable.
- Raw `ping` and `iperf` logs proving simulated-to-real path behavior.

Pass requires topology, NAT rules, gateway mapping, route state, and successful
traffic logs tied to the ESTNeT / INET bridge.

### V-05 Virtual DUT

Required evidence:

- Virtual DUT identity, version, image, container or VM ID, and owner.
- Testbench source, version or commit, config, and command transcript.
- DUT-facing interface inventory and route table.
- Traffic profile, including endpoints, protocol, ports, duration, packet size
  or bandwidth settings, and expected path.
- Raw DUT logs and raw testbench outputs.
- Pass/fail result with timestamps and artifact references.

Pass requires a retained virtual DUT run with input, command output, DUT logs,
traffic result, and explicit verdict.

### V-06 Physical DUT / NE-ONE

Required evidence:

- Physical DUT model, firmware/software version, serial or redacted asset ID,
  port mapping, and operator.
- Physical topology diagram with cabling, switch ports, host interfaces, and
  traffic-generator attachment.
- NE-ONE profile, scenario file, traffic profile, version, timestamps, and raw
  output when NE-ONE is used.
- Raw DUT logs, NE-ONE outputs, packet captures, `ping` logs, and `iperf` logs
  where applicable.
- Redaction notes that preserve auditability while removing sensitive IDs.

Pass requires retained physical DUT or NE-ONE measured output with enough
configuration, timing, and topology evidence to replay the judgment.

## `summary.json` Schema Sketch

Use
`docs/sdd/itri-v02-v06-external-validation-summary.schema.json` as the
parseable schema sketch for the next retained `summary.json` package. The
schema is intentionally readiness-focused and may be tightened after the first
real external run.

At minimum, the retained summary must carry:

- schema version and generation timestamps;
- validation owner and package path;
- authority documents read;
- covered requirement IDs;
- preserved canonical route and Phase 5 package references;
- environment, topology, interface, route, NAT, bridge, traffic, DUT, and
  NE-ONE artifact references;
- per-ID classification as `pass`, `fail`, or `gap`;
- raw log references for `ping`, `iperf`, DUT, and NE-ONE when applicable;
- nonclaims and known gaps.

## Pass / Fail / Gap Classification Rules

Classify each requirement independently:

| Classification | Rule |
| --- | --- |
| `pass` | All required artifacts for that ID are retained, command transcripts show successful execution, raw logs support the claim, timestamps are coherent, and no critical evidence field is missing. |
| `fail` | The external run was attempted and retained evidence shows the requirement did not work, a command exited unsuccessfully, traffic failed, DUT validation failed, or NE-ONE output failed the test profile. |
| `gap` | The run was not attempted, the target system was unavailable, artifacts are missing, logs were redacted beyond auditability, timestamps cannot be reconciled, or the evidence is only local/readiness evidence. |

Overall package classification:

- `pass` only if V-02, V-03, V-04, V-05, and V-06 are all `pass`.
- `fail` if at least one ID is `fail` and there are no `gap` IDs hiding
  unexecuted surfaces.
- `gap` if any ID is `gap`.

The existing retained package
`output/validation/external-v02-v06/2026-05-11T16-59-27.404Z-external-validation/`
remains a negative/gap package. It must not be relabeled as pass.

## Handoff Checklist For External Testbed Owner

Before execution:

- Confirm the exact Windows host, WSL distro, ESTNeT / OMNeT++ build, INET
  build, virtual DUT image, physical DUT, and NE-ONE version.
- Confirm the expected topology and packet path for V-03 and V-04.
- Confirm the redaction policy before running tests.
- Confirm time synchronization across host, WSL, ESTNeT / INET, DUT, and
  NE-ONE devices.
- Create a fresh timestamped package directory under
  `output/validation/external-v02-v06/`.
- Copy this readiness package and schema reference into the run notes.

During execution:

- Record command transcripts with start/end timestamps and exit codes.
- Save raw interface inventory, route tables, NAT rules, bridge configs, and
  bridge logs before and after the run.
- Save raw `ping` logs, raw `iperf` or `iperf3` logs, packet captures if
  permitted, DUT logs, and NE-ONE outputs.
- Record every deviation from the planned topology.

After execution:

- Fill `summary.json` using the schema sketch.
- Write `review.md` with per-ID pass/fail/gap reasons.
- Verify all artifact references in `summary.json` resolve within the package.
- Verify raw logs are retained and redactions are documented.
- Do not update V4 route copy or runtime UI based only on readiness evidence.
- Hand the package to the repo owner for review before any claim changes.

## Relationship To Future F-09 And F-16 Work

This package can feed later measured F-09 work only after a real external run
retains successful traffic evidence:

- `traffic-results/iperf/` can become the measured throughput source.
- `traffic-results/ping/` can become a measured latency and reachability source.
- `packet-captures/` can support path integrity and bridge/NAT diagnosis.
- The normalized fields should include endpoint IDs, direction, orbit/scenario
  context if available, interval, bandwidth, jitter, packet loss, RTT, command
  ID, and raw log reference.

Until that evidence exists, current F-09 remains a bounded route representation
or repo-owned proxy surface, not measured throughput.

This package can feed later F-16 external reporting only after the external run
is retained and reviewed:

- `summary.json` can become the report manifest.
- `review.md` can become the human-readable validation section.
- raw `ping`, `iperf`, DUT, and NE-ONE logs can be attached or referenced by a
  future report bundle.
- redaction notes and nonclaims must travel with the report.

Until that reporting work is explicitly implemented, current F-16 remains a
bounded route/export representation and not an external reporting system.
