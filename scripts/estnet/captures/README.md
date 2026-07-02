# Local network-test rehearsal captures (ping / iperf3)

REAL captures of the two requirement-named functional-test tools (R1-F3
"iperf / ping test integration" — the one A-bucket sub-item without a
delivered artifact), run **machine-locally over the loopback interface** and
ingested through `../external_trace_ingest.py` into committed PacketTrace
fixtures. They exercise the full ingest → review → fixture → manifest → panel
consumer chain with real tool output.

## Honesty (R12 — read before citing)

- **Tier: `network-test-derived`, `deliveredBy: local-rehearsal`.** These are
  loopback captures on the dev machine (WSL2). They involve **no satellite
  path, no RF link, no operator network** — they are NOT Tier-A evidence and
  are never presented as such. The fixtures' own `nonClaims` carry the same
  disclosures.
- The point demonstrated is the **consumer side**: the ingest tool, the
  contract gate, and the panel can eat real `ping` / `iperf3 --json` output
  end-to-end. The numbers themselves (sub-ms loopback RTT, 5 Mbps loopback
  UDP) carry no link-model meaning.
- A future capture through the requirement side's "Real-Traffic Satellite
  Bridge" (K-B1) topology would land in this same shape and tier — delivery
  does not upgrade provenance.

## Artifacts

| file | role | sha256 |
|---|---|---|
| `loopback-ping.txt` | ingest input (`--format ping`) | `a20bde3117c85a8810f27ad0abe814109dd5c76541e11cd721eeb3964a7399a2` |
| `loopback-iperf3-udp.json` | ingest input (`--format iperf3`) | `9c6c981edfb798ac5e1bb73f06766de704a433c91edf53237c6121bb0bda8669` |
| `loopback-iperf3-udp-server.log` | context only (server-side view of the same run, not an ingest input) | — |

Fixtures produced: `public/fixtures/estnet/loopback-ping-packet-trace.json`
(100 echoes, 0 % loss, mean RTT 0.0533 ms) and
`public/fixtures/estnet/loopback-iperf3-udp-packet-trace.json` (30 × 1 s
intervals, 573 datagrams, 0 lost, ≈5.0 Mbps). Each fixture embeds its input's
sha256 under `metadata.inputArtifact` (audit chain).

## Exact commands (2026-07-02, WSL2)

Tools: `ping` from iputils 20240117 (system); `iperf 3.16 (cJSON 1.7.15)`
(Ubuntu noble `iperf3`/`libiperf0`/`libsctp1` .debs, `dpkg -x` into a local
prefix — no system install; any iperf3 ≥3.x reproduces the shape).

```bash
# capture 1: ping, epoch timestamps (-D), 100 echoes at 0.2 s
LC_ALL=C ping -D -c 100 -i 0.2 127.0.0.1 > loopback-ping.txt

# capture 2: iperf3 UDP 5 Mbps, 30 s, one-shot server on loopback
iperf3 -s -1 -p 5211 > loopback-iperf3-udp-server.log 2>&1 &
sleep 1
iperf3 -c 127.0.0.1 -p 5211 -u -b 5M -t 30 -i 1 --json > loopback-iperf3-udp.json
```

## Ingest (re-runnable; output is byte-identical for the same input)

```bash
python3 scripts/estnet/external_trace_ingest.py \
  --format ping --in scripts/estnet/captures/loopback-ping.txt \
  --source-class network-test-derived --delivered-by local-rehearsal \
  --sim-epoch-utc 2026-07-02T03:53:32Z \
  --path-label "127.0.0.1 loopback — ping RTT rehearsal" \
  --out public/fixtures/estnet/loopback-ping-packet-trace.json

python3 scripts/estnet/external_trace_ingest.py \
  --format iperf3 --in scripts/estnet/captures/loopback-iperf3-udp.json \
  --source-class network-test-derived --delivered-by local-rehearsal \
  --sim-epoch-utc 2026-07-02T03:54:07Z \
  --path-label "127.0.0.1 loopback — iperf3 UDP throughput rehearsal" \
  --out public/fixtures/estnet/loopback-iperf3-udp-packet-trace.json
```

`--sim-epoch-utc` values are the captures' own first-packet epochs (ping `-D`
timestamp / iperf3 `start.timestamp.timesecs`), so the traces sit on their
true wall-clock axis — which lies OUTSIDE the pinned demo window; the panel's
replay cursor correctly hides itself on these traces.

`npm run verify:estnet` pins both fixtures (sample counts, zero loss, tier,
latency semantics, audit-chain fields). Re-capturing produces a NEW artifact:
update the pins consciously and re-review — never in the same breath as an
unrelated change.
