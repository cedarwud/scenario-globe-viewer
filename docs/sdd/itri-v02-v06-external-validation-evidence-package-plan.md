# ITRI V-02..V-06 External Validation Evidence Package Plan

## Status

Planning boundary with one retained negative-evidence package. No route UI or
runtime ownership is changed by this plan.

## Purpose

Define the evidence package needed to close ITRI V-02 through V-06 outside the
V4 demo route.

The V4 route `/?scenePreset=regional&m8aV4GroundStationScene=1` may name these
requirements as external gaps, but it must not claim live validation truth.

## Retained Evidence Checkpoint

Checkpoint, 2026-05-12:

- Package path:
  `output/validation/external-v02-v06/2026-05-11T16-59-27.404Z-external-validation/`.
- Machine-readable verdict:
  `output/validation/external-v02-v06/2026-05-11T16-59-27.404Z-external-validation/summary.json`.
- Human review:
  `output/validation/external-v02-v06/2026-05-11T16-59-27.404Z-external-validation/review.md`.
- Covered IDs: V-02, V-03, V-04, V-05, V-06.
- Result: all five IDs fail external validation in this package.
- Evidence retained: Windows 11 + WSL2 environment context, local interface and
  route inventory, NAT inventory statement, command transcript, topology note,
  redaction note, and explicit placeholders for missing tunnel/bridge logs,
  traffic results, DUT results, and NE-ONE evidence.
- Non-claim boundary: the package does not claim live ESTNeT/INET, NAT,
  tunnel, bridge, DUT, NE-ONE, `ping`, or `iperf` truth, and does not modify or
  validate the V4 demo route UI/runtime.
- Next required external action: run the actual Windows+WSL + ESTNeT/INET
  validation testbed and retain topology, tunnel/bridge config/logs, NAT rules,
  route/interface inventories, successful traffic transcripts, virtual DUT logs,
  and physical DUT or NE-ONE measured outputs.

## Requirement Scope

| ID | Evidence target | Required proof |
| --- | --- | --- |
| V-02 | Windows + WSL support | Host OS, WSL distro/version, interface inventory, routing table, bridge/tunnel process inventory, and command transcript. |
| V-03 | Tunneling / bridging | Topology, tunnel endpoints, bridge process config/logs, packet path evidence, and at least one successful traffic transcript. |
| V-04 | NAT routing / simulated-to-real network bridge | INET/ESTNeT topology, NAT rules, virtual interface IPs, routing tables, gateway mapping, and traffic transcript. |
| V-05 | Virtual DUT scenario | Testbench identity/version, virtual DUT topology, traffic profile, command output, pass/fail summary, and logs. |
| V-06 | Physical DUT / traffic generator scenario | DUT or NE-ONE configuration, physical topology, traffic profile, captured results, timing, and redaction notes. |

## Non-Goals

- no F-13 `>=500 LEO` scale evidence; that belongs to the Phase 7.1 viewer
  validation boundary;
- no V4 demo route actor-count or UI change;
- no route-local claim of live ESTNeT/INET, NAT, tunnel, DUT, NE-ONE, `ping`,
  or `iperf` truth;
- no synthetic screenshot as a substitute for external command/log evidence.

## Artifact Layout

Each validation run should retain a timestamped directory:

```text
output/validation/external-v02-v06/<timestamp>-external-validation/
  summary.json
  topology.md
  environment.json
  commands.log
  interfaces.json
  routes.json
  nat-rules.txt
  tunnel-bridge-logs/
  traffic-results/
  dut-results/
  redactions.md
```

`summary.json` should include:

- schema/version;
- generation timestamp;
- validation owner;
- requirement IDs covered;
- environment identifiers;
- topology references;
- command list and exit statuses;
- packet/traffic result references;
- pass/fail per requirement;
- known gaps;
- explicit non-claims.

## Acceptance Rules

- V-02 passes only when Windows + WSL environment details and route/interface
  state are retained with a successful validation transcript.
- V-03 passes only when the tunnel/bridge path is configured and traffic is
  observed across the expected endpoints.
- V-04 passes only when NAT/routing evidence names the INET/ESTNeT topology,
  virtual interfaces, gateway mapping, and successful traffic path.
- V-05 passes only when a virtual DUT/testbench run is retained with inputs,
  outputs, and pass/fail status.
- V-06 passes only when a physical DUT or NE-ONE traffic-generator run is
  retained with configuration and measured output.
- Any missing external surface must be recorded as a known gap, not hidden by
  route UI copy.

## Forbidden Claims

These phrases may appear only as explicit non-claims or known-gap labels until
the corresponding retained artifact exists:

- live ESTNeT/INET validation passed;
- Windows/WSL tunnel validated;
- NAT routing validated;
- virtual DUT validated;
- physical DUT validated;
- NE-ONE traffic generator validated;
- live `ping` measured;
- live `iperf` measured.

## Relationship To Route SDD

The canonical route SDD remains
`docs/sdd/itri-demo-route-requirement-closure-sdd.md`.

This document is a separate evidence-package plan for V-02 through V-06. It
does not supersede the route SDD and does not grant the route permission to
claim external validation truth.
