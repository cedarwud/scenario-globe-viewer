# ITRI F-07/F-08/F-09 Measured Traffic Evidence Package Plan

Date: 2026-05-12

Status: docs-only evidence-package baseline. This document does not claim that
F-07, F-08, or F-09 has passed measured validation. It does not modify runtime
code, tests, or retained output evidence.

## Authority Context

This plan is grounded in these current repo facts:

- The canonical route is
  `/?scenePreset=regional&m8aV4GroundStationScene=1`.
- `docs/intake/itri-unclosed-requirement-evidence-intake-matrix.md` says the
  route does not contain measured `ping`, `iperf`, latency, jitter, throughput,
  or continuity truth.
- `docs/intake/itri-public-source-research-register-2026-05-12.md` retains
  INET and iPerf sources only as method/context material. They are not project
  closure evidence.
- `output/validation/itri-demo-route-final-closure-2026-05-12.md` classifies
  F-07 and F-08 as bounded repo-owned seams, F-09 as bounded route
  representation plus external-validation-required, and V-02 through V-06 as
  external-validation-required.
- The retained package at
  `output/validation/external-v02-v06/2026-05-11T16-59-27.404Z-external-validation/`
  is negative/gap evidence. It does not retain successful `ping`, `iperf`,
  ESTNeT/INET, NAT, tunnel, bridge, DUT, or NE-ONE traffic proof.

## Scope / Non-scope

Scope:

- Define a future measured traffic evidence package for F-07, F-08, and F-09.
- Cover measured communication time, `ping`, `iperf3`, throughput, latency,
  jitter, packet loss, and handover continuity evidence.
- Define a consistent artifact tree for external testbed submissions under
  `output/validation/external-f07-f09/<timestamp>-measured-traffic/`.
- Provide a raw command capture runbook that external testbed owners can adapt.
- Draft a `summary.json` shape for retained evidence review.
- Preserve the distinction between modeled/demo surfaces and external retained
  measured artifacts.

Non-scope:

- No claim that measured latency, jitter, throughput, packet loss, or handover
  continuity evidence already exists.
- No claim that live ESTNeT, INET, NAT, tunnel, bridge, virtual DUT, physical
  DUT, or NE-ONE validation has passed.
- No parser implementation, no source changes, no test changes, no route UI
  changes, and no overwrite of existing output evidence.
- No hardcoded pass threshold. Latency, jitter, throughput, packet-loss,
  duration, and continuity thresholds require ITRI authority.
- No conversion of modeled route windows, modeled rate classes, or bounded
  `networkSpeedMbps` values into measured truth.

## Requirement Mapping

| ID | Current repo status | External artifacts required before measured evidence can be reviewed |
| --- | --- | --- |
| F-07 | Bounded repo-owned seam. The route can show modeled timing context only. | A retained communication-time run with topology, source/target endpoints, execution window, clock source, raw `ping` logs, optional long-running `iperf3` logs, handover event timestamps, packet path proof if allowed, and redaction notes. |
| F-08 | Bounded repo-owned seam. Existing report structures are not measured statistics. | A retained statistics package that references raw logs, sample count, test duration, packet loss, RTT latency distribution, jitter source, throughput intervals where applicable, handover continuity events, and the method used to compute each statistic. |
| F-09 | Bounded route representation plus external-validation-required. Current rate display is modeled/proxy only. | Retained `iperf3` or approved traffic-generator output with endpoint identity, traffic direction, protocol, duration, port, parallel-stream settings, interval statistics, retransmits/loss where applicable, raw server/client logs, and topology proof. |

Relationship to V-02 through V-04:

- V-02 provides host and Windows/WSL environment evidence when the measured run
  uses Windows + WSL. F-07/F-08/F-09 measured verdicts cannot imply V-02 pass
  unless the corresponding environment and command transcripts are retained.
- V-03 provides tunnel/bridge proof. If traffic crosses a tunnel or bridge, the
  measured package must reference tunnel endpoint configuration, bridge process
  logs, and packet path evidence. A successful `ping` or `iperf3` result without
  tunnel/bridge artifacts is not enough to close V-03.
- V-04 provides NAT and simulated-to-real bridge proof. If traffic crosses
  ESTNeT/INET, NAT, or gateway mapping, the measured package must retain NAT
  rules, route tables, virtual interface mappings, and topology proof. Public
  INET documentation is method context only and cannot prove project traffic.
- V-05 and V-06 are out of direct scope for this F-07/F-09 package, but any
  virtual DUT, physical DUT, or NE-ONE involvement must be disclosed and linked
  rather than implied.

## Required Artifact Tree

Each future external measured run should create a new timestamped package:

```text
output/validation/external-f07-f09/<timestamp>-measured-traffic/
  summary.json
  review.md
  topology.md
  environment.json
  interfaces.json
  routes.txt
  nat-rules.txt
  tunnel-bridge.md
  commands/
    transcript.jsonl
    raw/
  ping/
    README.md
    <source>-to-<target>-<window>.txt
  iperf3/
    README.md
    <source>-to-<target>-tcp-client.json
    <source>-to-<target>-tcp-server.txt
    <source>-to-<target>-udp-client.json
    <source>-to-<target>-udp-server.txt
  handover-events.json
  packet-captures/
    README.md
  redactions.md
```

Minimum required file semantics:

- `topology.md`: human-readable diagram and packet path. Must name source
  host, target host, intermediate ESTNeT/INET/NAT/tunnel/bridge/DUT/NE-ONE
  nodes when used.
- `environment.json`: OS, kernel, WSL status if applicable, tool versions,
  clock source, timezone, operator, and testbed owner.
- `interfaces.json`: interface inventory for every relevant host/namespace.
- `routes.txt`: route tables for every relevant host/namespace.
- `nat-rules.txt`: NAT and forwarding state, or an explicit not-used note.
- `tunnel-bridge.md`: tunnel endpoints, bridge processes, configs, logs, and
  not-used notes.
- `commands/transcript.jsonl`: one command record per executed command, with
  start/end timestamp, host, shell, command, exit code, stdout/stderr refs, and
  operator.
- `ping/*.txt`: raw `ping` output, not only normalized summaries.
- `iperf3/*.json`: raw client JSON output from `iperf3 -J` when `iperf3` is the
  measurement tool. Retain server raw logs alongside client JSON.
- `handover-events.json`: event timestamps, source/target link IDs, trigger
  label, expected continuity window, and raw event/log references.
- `summary.json`: review manifest and per-requirement verdict draft.
- `redactions.md`: what was redacted, why, and whether auditability remains.

Optional files may include packet captures, traffic-generator exports, DUT or
NE-ONE outputs, screenshots of external tools, and normalized CSV/JSON tables.
Optional normalized files must not replace raw logs.

## Raw Command Capture Guidance

This is a runbook template only. Do not run external tests from this plan.
Replace all placeholders with ITRI/testbed-owner approved values.

### Baseline inventory

Linux or WSL host:

```bash
hostnamectl
uname -a
timedatectl
ip -br addr
ip route show table all
ip rule show
ip neigh show
ss -tulpn
ip tunnel show
bridge link
ip tuntap show
nft list ruleset
iptables-save
sysctl net.ipv4.ip_forward
iperf3 --version
ping -V
```

Windows host, when V-02 is in scope:

```powershell
Get-ComputerInfo
wsl.exe --status
wsl.exe --list --verbose
Get-NetAdapter
Get-NetIPConfiguration
Get-NetRoute -AddressFamily IPv4
Get-NetNat
Get-NetFirewallRule
```

ESTNeT/INET/tunnel/bridge/DUT/NE-ONE owners should add tool-specific version,
scenario, profile, config, and log commands. Record exact commands in
`commands/transcript.jsonl`.

### Ping capture

Linux or WSL:

```bash
ping -D -c <sample-count> -i <interval-seconds> -s <payload-bytes> <target-ip-or-name>
```

Windows:

```powershell
ping -n <sample-count> -l <payload-bytes> <target-ip-or-name>
```

For handover continuity, run the approved `ping` command across the full
pre-handover, handover, and post-handover window. The retained output must show
timestamps or be tied to command transcript timestamps and `handover-events.json`.

### iPerf3 server and client capture

Server side:

```bash
iperf3 -s -p <port>
```

Client side, TCP throughput:

```bash
iperf3 -c <server-ip-or-name> -p <port> -t <duration-seconds> -i <interval-seconds> -P <parallel-streams> -J --get-server-output
```

Client side, reverse TCP direction when approved:

```bash
iperf3 -c <server-ip-or-name> -p <port> -t <duration-seconds> -i <interval-seconds> -P <parallel-streams> -R -J --get-server-output
```

Client side, UDP jitter/loss when approved:

```bash
iperf3 -c <server-ip-or-name> -p <port> -u -b <target-rate> -t <duration-seconds> -i <interval-seconds> -J --get-server-output
```

Notes:

- TCP `iperf3` is throughput-oriented; UDP `iperf3` is the usual `iperf3`
  source for jitter and packet-loss fields.
- Direction, duration, stream count, protocol, port, bandwidth target, and
  acceptable packet loss must come from ITRI/testbed authority.
- Keep raw client JSON and raw server output. Do not summarize only.

### Route, interface, NAT, tunnel, and packet path capture

Use the baseline inventory before and after the traffic run. If packet captures
are allowed, record owner-approved bounded captures such as:

```bash
tcpdump -i <interface> -nn -s 0 host <source-ip> and host <target-ip>
```

Packet captures are optional unless ITRI/testbed authority requires them. If
captures are not allowed, `packet-captures/README.md` must explain the policy
and identify the alternate path evidence.

## Summary JSON Schema Draft

This schema is a draft manifest shape for future retained packages. It is not a
validator implementation and not pass evidence by itself.

```json
{
  "schemaVersion": "itri.f07-f09.measured-traffic-evidence.v1-draft",
  "generatedAt": "2026-05-12T00:00:00.000Z",
  "timezone": "Asia/Taipei",
  "packagePath": "output/validation/external-f07-f09/<timestamp>-measured-traffic/",
  "validationOwner": "<external-testbed-owner>",
  "authority": {
    "docsRead": [],
    "thresholdAuthority": null,
    "thresholdNotes": "Latency, jitter, throughput, packet-loss, duration, sample-count, and continuity pass thresholds require ITRI authority."
  },
  "requirements": [
    {
      "requirementId": "F-07",
      "verdict": "gap",
      "evidenceFiles": [],
      "timeWindow": {
        "startedAt": null,
        "endedAt": null,
        "timezone": "Asia/Taipei"
      },
      "sourceHost": {
        "hostId": null,
        "ip": null,
        "interface": null
      },
      "targetHost": {
        "hostId": null,
        "ip": null,
        "interface": null
      },
      "latencyMs": {
        "min": null,
        "avg": null,
        "max": null,
        "source": "ping"
      },
      "jitterMs": {
        "avg": null,
        "max": null,
        "source": "iperf3-udp-or-authority-approved-source"
      },
      "packetLossPct": null,
      "throughputMbps": {
        "avg": null,
        "minInterval": null,
        "maxInterval": null,
        "source": "iperf3"
      },
      "handoverContinuity": {
        "eventRefs": [],
        "outageMs": null,
        "lostPackets": null,
        "source": "ping-or-authority-approved-source"
      },
      "redactionStatus": "unreviewed",
      "notes": []
    }
  ],
  "knownGaps": [],
  "forbiddenClaimsChecked": [],
  "nonClaims": []
}
```

Required per-result fields:

- `requirementId`: `F-07`, `F-08`, or `F-09`.
- `verdict`: `pass`, `fail`, `gap`, or `unreviewed`. `pass` is forbidden
  unless retained raw artifacts exist and ITRI authority supplies the threshold
  or interpretation for that requirement.
- `evidenceFiles`: package-relative paths to raw logs and review artifacts.
- `timeWindow`: measured run interval, with timezone context.
- `sourceHost` and `targetHost`: endpoint identity and interface context.
- `latencyMs`: parsed from retained raw evidence when applicable.
- `jitterMs`: parsed from retained raw evidence when applicable.
- `packetLossPct`: parsed from retained raw evidence when applicable.
- `redactionStatus`: `none`, `partial`, `heavy`, `unreviewed`, or
  `audit-blocking`.
- `notes`: reviewer notes, known limitations, and threshold authority notes.

Threshold rule:

- Thresholds are not defined in this repo-local plan. Do not hardcode pass
  values for latency, jitter, throughput, packet loss, sample count, traffic
  duration, or handover outage. Only ITRI authority may define or change those
  pass/fail criteria.

## Parser / Normalizer Feasibility

Future parser work is feasible but intentionally not implemented here.

Suggested future parser behavior:

- Parse Linux/Windows `ping` raw logs into RTT min/avg/max, packet count,
  packet loss, and timestamp coverage.
- Parse `iperf3 -J` JSON into protocol, direction, duration, intervals,
  throughput, retransmits, UDP jitter, UDP lost packets, and packet loss.
- Parse `handover-events.json` and align it with `ping`/`iperf3` time windows.
- Fail closed when raw logs are missing, redacted beyond auditability, or not
  referenced from `summary.json`.
- Preserve every raw log and link normalized values back to package-relative
  `evidenceFiles`.
- Treat thresholds as external authority inputs, not parser constants.

Current repo pattern:

- The repo has schema sketches and retained evidence-package docs for
  V-02..V-06 and Phase 7.1 validation evidence.
- No explicit existing `ping`/`iperf3` parser tooling pattern was found that
  should be extended in this docs-only task.
- Therefore this plan records parser feasibility only and leaves implementation
  for a later prompt after retained raw logs and ITRI thresholds exist.

## Pending External Source Delta

This document can serve as the baseline evidence-package plan before new
external source material arrives. Later source updates must be classified before
they change any claim:

- Public method/context source: may update the public source register or the
  runbook rationale only. It must not become closure evidence for F-07, F-08,
  or F-09.
- ITRI authority source: may change schema requirements, thresholds,
  requirement interpretation, accepted endpoints, traffic directions, or
  verdict rules.
- Retained testbed artifact: may support measured pass/fail verdicts if raw
  logs, topology, command transcripts, redaction notes, and threshold authority
  are retained in the package.
- Non-official or non-first-party source: rejected by default, or listed only
  as unverified context. It must not support a project claim.

The existence of external public material does not mean this project has
completed F-07, F-08, or F-09.

## Open Questions For ITRI / Testbed Owner

1. Which source and target endpoints are authoritative for F-07/F-08/F-09?
2. What topology should be used: direct host-to-host, ESTNeT/INET, NAT bridge,
   tunnel/bridge, virtual DUT, physical DUT, NE-ONE, or a combination?
3. What IP plan, interface mapping, gateway mapping, and route table are
   expected?
4. Which traffic direction or directions are required?
5. Which tools are authoritative: OS `ping`, INET PingApp, `iperf3`, NE-ONE, or
   another traffic generator?
6. What duration, sample count, interval, payload size, protocol, port, stream
   count, and UDP target rate should be used?
7. What pass/fail thresholds apply for latency, jitter, throughput, packet
   loss, outage, and continuity?
8. What redaction policy is allowed for IPs, hostnames, serials, operator names,
   DUT identifiers, screenshots, configs, and packet captures?
9. How will clocks be synchronized across hosts, WSL, ESTNeT/INET, DUT, and
   traffic generators?
10. Are packet captures allowed, and if so on which interfaces and for how long?
11. How should handover events be generated, timestamped, and correlated with
   traffic logs?
12. What is the required relationship between this measured package and DUT or
   NE-ONE evidence for V-05/V-06?

## Forbidden Claims

Until a future retained package contains the required artifacts and authority,
the project must not claim:

- active satellite or active gateway truth;
- measured throughput;
- measured latency or measured jitter;
- measured handover continuity;
- native RF handover;
- live ESTNeT validation passed;
- live INET validation passed;
- live NAT validation passed;
- live tunnel, bridge, or simulated-to-real path validation passed;
- live DUT, physical DUT, traffic-generator, or NE-ONE validation passed;
- live `ping` measured;
- live `iperf` or `iperf3` measured;
- F-07, F-08, or F-09 external measured closure from modeled/demo surfaces;
- F-07, F-08, or F-09 completion from public context or method sources alone.
