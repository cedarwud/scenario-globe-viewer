# PacketTrace ingestion contract (requirement ESTNeT-data readiness)

The viewer's ESTNeT packet-trace panel consumes **one JSON shape** — the
PacketTrace fixture. Everything upstream (our own ESTNeT runs today, a
requirement-side ESTNeT delivery tomorrow, a K-B1 tun-bridge ping/iperf capture
later) must be adapted into this shape and pass `npm run verify:estnet`.

This file is the contract: schema, provenance tiers, mandatory disclosures,
and the delivery checklist to hand the requirement side so their
export is ingestible on day one.

Requirement hooks: **irreducible-1** (the requirement-side ESTNeT packet
trace — its latency / jitter time series), **R1-F3** (iperf / ping test
integration — currently the one A-bucket sub-item not done), **K-B1** (the
"ESTNeT Real-Traffic Satellite Bridge" topology, quoting the requirement's
own title).

## 1. Pipeline position

```
producer artifact                         adapter                        fixture
-----------------                         -------                        -------
our scenario .vec  ──────────────────►  estnet_trace_adapter.py  ┐
our handover .vec  ──────────────────►  estnet_handover_..._py   ├──►  PacketTrace JSON ──► panel
delivered .vec / CSV / ping / iperf3 ►  external_trace_ingest.py ┘      (public/fixtures/estnet/)
```

Ingested output is **staged, reviewed, then placed** — never auto-promoted
into `public/fixtures/estnet/` or the panel. Placement is a curated commit.

## 2. PacketTrace schema

Top-level (schemaVersion **1** = single steady flow; **2** = handover trace):

| field | type | notes |
|---|---|---|
| `schemaVersion` | 1 \| 2 | |
| `pathLabel` | string | human label, rendered in the panel header |
| `sourceClass` | enum | provenance tier, §3 |
| `toolProvenance` | string | what produced the INPUT (`estnet-inet`, `iputils-ping`, `iperf3`) |
| `latencySemantic` | `one-way` \| `rtt` \| `none` | REQUIRED on ingested output; absent on the two committed adapters' output (= `one-way` composed) |
| `assumptionSet` | string | model/config assumptions, rendered verbatim |
| `nonClaims` | string[] | mandatory honesty disclosures, §4 |
| `metadata` | object | epoch, endpoints, `inputArtifact{name,sha256,bytes}` (audit chain), `deliveredBy`, `ingestFormat`/`ingestTool` on ingested output |
| `summary` | object | `sentPackets`, `deliveredEndToEnd`, `overallPacketLossRatio`, `meanLatencyMs`, `minLatencyMs`, `maxLatencyMs`, `finalJitterMs` (+ v2: `handoverCount`, `meanLatencyByOrbitMs`) |
| `samples` | object[] | the time series, below |
| `handover` / `segments` | v2 only | `segments[] = {label, orbitClass, satellite, startMs, endMs, deliveredPackets}`, ordered, non-overlapping |

Per sample:

| field | type | notes |
|---|---|---|
| `tMs` | number | non-decreasing; ms from trace start (sim time or capture time) |
| `latencyMs` | number \| null | null when the packet was lost, or when `latencySemantic="none"` |
| `jitterMs` | number \| null | RFC 3550 running estimate unless the tool reports its own (iperf3) |
| `throughputMbps` | number \| null | null when the tool has no throughput signal (ping) |
| `packetLossRatio` | number \| null | rolling window [0,1] |
| `linkUp` | boolean | delivered / link considered up |
| `hops` | number \| null | |
| `servingSatellite`, `orbitClass` | v2 only | must match a `segments[]` entry |

Consumers MUST tolerate `null` metric fields. Summary identities are enforced
by the gate: `deliveredEndToEnd == count(linkUp)`, `overallPacketLossRatio ==
1 − delivered/sent`, mean/min/max recomputed from samples (per-packet traces;
iperf3 samples are per-interval aggregates and exempt from the packet
identities).

## 3. Provenance tiers (`sourceClass`)

R12 rule: ingestion NEVER upgrades a tier. Delivery ≠ measurement.

| sourceClass | meaning | example |
|---|---|---|
| `external-simulator-derived` | ESTNeT/OMNeT++ run **by us** (rehearsal kit) | the two committed fixtures |
| `requirement-provided-estnet` | ESTNeT artifact **delivered by the requirement side** — still a SIMULATION | future irreducible-1 delivery |
| `network-test-derived` | ping/iperf-class tool output; real traffic but through a **simulated** network (K-B1 tun bridge) or a local capture — not an operator RF measurement | future K-B1 bridge output; rehearsal loopback samples |
| `operator-measured` | **REFUSED by the ingest tool.** Reserved for real RF-path measurement, which this chain cannot produce | — |

`metadata.deliveredBy` (`local-rehearsal` / `requirement` / …) plus
`metadata.inputArtifact.sha256` carry the audit chain (retained artefact +
executed command + evidence).

Format × class matrix (tool-enforced): `.vec` / scavetool CSV may carry
`external-simulator-derived` or `requirement-provided-estnet`; `ping` /
`iperf3` may carry only `network-test-derived` — a network-test capture is
never an ESTNeT artifact, whoever delivered it. iperf3 is UDP-mode only
(TCP shapes are refused: no per-packet loss/jitter semantics here).

## 4. Mandatory nonClaims

Every trace: a "not operator-measured" / "not an operator RF measurement"
statement (gate-enforced). Per format, additionally:

- **vec-single / scavetool-csv** — loss denominator provenance (sender vector
  vs max-sequence heuristic); jitter adapter-derived.
- **ping** — `latencyMs` is RTT, not one-way; jitter adapter-derived over RTT;
  no throughput signal.
- **iperf3** — no latency signal at all; jitter/loss are the tool's own UDP
  report fields.
- **requirement-provided-estnet** — still a simulation; our derivations
  labelled as ours.

## 5. What to request from the requirement side (delivery checklist)

Any ONE of these artifact kinds is ingestible as-is:

1. **OMNeT++ SQLite `.vec`** (preferred — richest). Must include, for the
   app(s) on the path, vector recording ON for: `rcvdPkLifetime:vector`,
   `rcvdPk:vector(pktSequenceNumber)`, `rcvdThroughput:vector`,
   `rcvdPkNumHops:vector`, and the sender's
   `sentPk:vector(pktSequenceNumber)`. (Stock ESTNeT ships
   `recording_off.incl` — recording must be explicitly enabled.)
2. **`opp_scavetool export -F CSV-R`** of the same vectors.
3. **`ping` text output** through the K-B1 tun bridge — ideally `-D` (epoch
   timestamps) and a fixed `-c` count. Gives RTT + loss only.
4. **`iperf3 --json`** (UDP mode) through the bridge. Gives throughput +
   jitter + loss, NO latency — pair with a ping capture; the two tools
   together cover the R1-F3 metric set.

Alongside the artifact, request the context that cannot be recovered from it:

- sim epoch (UTC instant of t = 0) and scenario time window;
- node ↔ station/satellite mapping (module names or node ids);
- the two ENDPOINT ground stations as registry station ids (fills
  `metadata.stationA/B` and the manifest pair hints — this is what binds the
  trace to a viewer route, pre-selects it there, and lets the viewer-model
  overlay render; an endpoint-less trace still renders but never reconciles);
- scenario config (`.ini` + TLE) or at least orbit/station identities;
- tool/framework version (ESTNeT / OMNeT++ / INET);
- RF assumptions in force (EIRP, bitrate, antenna model) — needed to label
  the trace honestly, not to re-run it.

## 6. Runbook

```bash
# our own scenarios end-to-end (scenario → sim → adapter → fixture → gate)
npm run estnet:regen

# contract + honesty gate alone
npm run verify:estnet

# ingest an external delivery (examples)
python3 scripts/estnet/external_trace_ingest.py \
  --format vec-single --in delivery/General-0.vec \
  --module '%cg[1]%appWrapper[0].app' --sent-module '%cg[0]%appWrapper[0].app' \
  --source-class requirement-provided-estnet --delivered-by requirement \
  --sim-epoch-utc 2026-06-15T00:00:00Z \
  --out staging/requirement-trace.json

python3 scripts/estnet/external_trace_ingest.py \
  --format ping --in delivery/bridge-ping.txt \
  --source-class network-test-derived --delivered-by requirement \
  --out staging/requirement-ping-trace.json
```

Then: validate the staged JSON (`verify:estnet` covers committed fixtures;
run the ingest-layer checks by placing the file and extending the gate pins),
review the numbers against the delivery context, and only then commit a
fixture + panel wiring as its own reviewed change.
