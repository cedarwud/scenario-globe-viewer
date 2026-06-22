# ESTNeT packet-trace pipeline (CHT × SANSA GEO)

Produces a **real ESTNeT/OMNeT++ packet trace** for the demo's
GS-A → Satellite → GS-B path and renders it as a 2D time-series panel.

This directory is the **tracked source-of-truth** for the whole chain. ESTNeT
itself (the simulator) lives in a separate, un-tracked bootstrap repo; only the
small custom scenario + the adapter + the fixture + the panel live here.

```
scenario (ESTNeT .ini/.incl/.tle)         <- scripts/estnet/scenario/   (tracked here)
   │  run in estnet-bootstrap-kit
   ▼
results/General-0.vec  (SQLite)           <- in the kit, gitignored, regenerable
   │  estnet_trace_adapter.py
   ▼
PacketTrace JSON                          <- public/fixtures/estnet/cht-sansa-abs2a-packet-trace.json
   │  fetch()
   ▼
2D panel                                  <- public/estnet-trace-panel.html
```

The viewer/panel only needs the **static JSON fixture** at runtime. The
ESTNeT kit is only needed to **regenerate** the trace (provenance / re-run),
never to run the demo. Acceptance opens this repo only.

## Files

| File | Role |
|---|---|
| `scenario/omnetpp_cht_sansa.ini` | the scenario (two real RF legs, see its header) |
| `scenario/configs/orbit_cht_sansa_geo.incl` | single GEO sat ABS-2A from the pinned snapshot |
| `scenario/configs/gs_cht_sansa.incl` | CHT + SANSA, internet off, `TargetTracking` → sat |
| `scenario/configs/radio_geo_strong.incl` | sat 20 W so the ~38,500 km link closes |
| `scenario/configs/tles/abs2a_geo.tle` | ABS-2A TLE (verbatim from the pinned commercial-geo snapshot) |
| `estnet_trace_adapter.py` | `.vec` (SQLite) → PacketTrace JSON; derives jitter (RFC-3550) + loss |

The scenario `include`s three more files (`basic.incl`, `antenna_sat_isotropic.incl`,
`antenna_gs_yagi.incl`, `mac_simple.incl`) that ship **stock** with the ESTNeT
template — they are NOT copied here (upstream, unmodified).

## Why two legs (the architecture finding)

Stock ESTNeT cannot relay one packet GS-A → Sat → GS-B: `RadioHost` floods every
ground station directly on broadcast (instant `sendDirect`), ignoring
`internetConnection=false`, so the satellite is bypassed. We therefore simulate
the path as **two genuine one-hop unicast RF legs** and compose them:

- Leg 1 uplink:   CHT (node 2) → SAT (node 1)
- Leg 2 downlink: SAT (node 1) → SANSA (node 3)
- end-to-end latency = uplink + downlink ; loss = 1 − (1−Lup)(1−Ldn)

## Regenerate the trace

ESTNeT kit (separate repo): `github.com/cedarwud/estnet-bootstrap-kit`
(local: `/home/u24/papers/estnet-bootstrap-kit`).

```bash
KIT=/home/u24/papers/estnet-bootstrap-kit
# 1. copy this scenario into the kit's simulations dir (kit gitignores it)
cp scripts/estnet/scenario/omnetpp_cht_sansa.ini          "$KIT/estnet-template/simulations/"
cp scripts/estnet/scenario/configs/*.incl                 "$KIT/estnet-template/simulations/configs/"
cp scripts/estnet/scenario/configs/tles/abs2a_geo.tle     "$KIT/estnet-template/simulations/configs/tles/"

# 2. run the sim (headless, instant wall-clock)
cd "$KIT" && source ./activate_env.sh
cd estnet-template/simulations
bash run_sim.sh release omnetpp_cht_sansa.ini General Cmdenv --cmdenv-express-mode=true
# -> results/General-0.vec  (CHT->sat 59/59, sat->SANSA 59/59, loss-free)

# 3. adapt -> PacketTrace JSON (run from the viewer repo root)
cd /home/u24/papers/scenario-globe-viewer
python3 scripts/estnet/estnet_trace_adapter.py \
  --vec "$KIT/estnet-template/simulations/results/General-0.vec" \
  --out public/fixtures/estnet/cht-sansa-abs2a-packet-trace.json

# 4. view: dev server, then open /estnet-trace-panel.html
```

## Honesty (R12)

`sourceClass = "external-simulator-derived"`, tool `estnet-inet`. This is a
**SIMULATION, not operator-measured** (not Tier-A). jitter + loss are
adapter-derived (no native ESTNeT jitter signal). The end-to-end is a
**composition of two independent one-hop legs**, not a single relayed packet.
The 20 W sat EIRP and 9600 bps PHY are **assumed** link parameters chosen so the
GEO link closes (latency ≈ 257 ms GEO propagation + ~236 ms serialization at
9600 bps). ESTNeT (published Würzburg v1.0) is used **unmodified**. These
disclosures are also embedded in the JSON (`nonClaims` / `assumptionSet`).

## Status / next

Opt-in preview; does **not** touch the accepted 19/19 surface. The panel is a
**standalone** page, not yet mounted into the v4 side panel (a future opt-in
slice). The GEO trace is flat (the honest GEO signature); a LEO single-hop pass
would exercise the panel's loss/outage rendering with real dynamics.
