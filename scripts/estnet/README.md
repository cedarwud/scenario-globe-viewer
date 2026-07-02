# ESTNeT packet-trace pipeline (CHT × SANSA GEO)

Produces an **ESTNeT/OMNeT++-generated packet trace** (simulation output, not
a measurement) for the demo's GS-A → Satellite → GS-B path and renders it as
a 2D time-series panel.

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
| **Handover variant (GEO↔MEO):** | |
| `scenario/omnetpp_cht_sansa_handover.ini` | full-6h GEO↔MEO timeline (6 serving phases / 5 cross-orbit migrations, contact-plan antenna re-point) |
| `scenario/configs/orbit_cht_sansa_handover.incl` | APSTAR-7 (GEO) + 3 Galileo MEO (GSAT0102/0232/0209); explicit UTC sim epoch |
| `scenario/configs/gs_cht_sansa_handover.incl` | CHT + SANSA, `ContactPlanBasedNodeTracking` (re-points on handover) |
| `scenario/configs/cht_sansa_handover.cp` | hand-authored non-overlapping contact plan (12 rows = 6 phases × 2 GS) that drives the re-point |
| `scenario/configs/tles/geo_meo_handover.tle` | 4-block TLE: APSTAR-7 → sat[0], GSAT0102/0232/0209 → sat[1..3] |
| `estnet_handover_trace_adapter.py` | composes the 6 phases; tags each sample with serving sat + orbit |
| `precheck_2hop_geometry.mjs` | viewer-model ground-truth: which sats 2-hop CHT×SANSA + the handover sequence |
| `precheck_2hop_geometry_independent.py` | independent python-sgp4 co-visibility cross-check (R12) |
| **Requirement-data readiness layer:** | |
| `PACKET-TRACE-CONTRACT.md` | the ingestion contract: PacketTrace schema, provenance tiers, mandatory nonClaims, and the delivery checklist to hand the requirement side |
| `external_trace_ingest.py` | generic multi-format ingestion: ESTNeT `.vec` single-flow / `opp_scavetool` CSV-R / `ping` text / `iperf3 --json` → PacketTrace JSON (refuses `operator-measured`) |
| `regen.sh` | one command (`npm run estnet:regen`): scenario → kit → both sims → adapters → fixture drift report → gate |
| `crosscheck_estnet_vs_sgp4.py` | `npm run estnet:crosscheck` — dual-model consistency: every delivered sample's latency must equal independent-SGP4 range/c + one fitted serialization constant; MEO segments must sit inside independently computed co-visibility (agreement = implementation cross-proof, never a measurement claim) |
| `testdata/` | ingest format samples for the gate (test-only, see its README) |
| `../verify-estnet-trace-contract.mjs` | `npm run verify:estnet` — fixture contract + honesty invariants + ingest regression + provenance-refusal guard |

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

## Handover variant (GEO↔MEO)

The flat GEO trace is the honest steady-state signature. The **handover variant**
enriches it into a *handover-dynamics* trace whose end-to-end latency STEPS each
time the active relay hands over between the GEO and a Galileo MEO. It is the
**faithful full 6-hour demo timeline**: 6 serving phases / 5 cross-orbit
migrations + 1 initial GEO acquisition = the 6 handover events of golden D1.

**Why this pair has a real handover (verified, not assumed).** CHT and SANSA are
~104° apart, so a 2-hop relay needs ONE satellite seeing BOTH. The viewer's own
`computeRuntimeProjection` (run via `precheck_2hop_geometry.mjs`) and an
independent python-sgp4 pass (`precheck_2hop_geometry_independent.py`) agree
exactly:

- **LEO cannot 2-hop this pair** (0 mutual windows — the half-angle wall). A
  LEO→MEO→GEO handover is geometrically impossible here; don't build one.
- **APSTAR-7 (GEO)** is mutually visible the whole 6-hour window.
- Three **Galileo MEOs** rise into mutual visibility in turn:
  GSAT0102 `00:49:30..01:30:00Z`, GSAT0232 `03:08:30..03:47:00Z`,
  GSAT0209 `05:53:00..06:00:00Z`. The demo's `demo-balanced-v1` policy hands the
  link GEO→MEO→GEO across each one (vis 17 / 6 handover / 5 cross-orbit /
  MEO 86 min / GEO 274 min).

**How the handover is modeled.** A directional GS yagi can only point one way at
a time, so it cannot track the GEO and a MEO at once — the re-pointing IS the
handover. Stock ESTNeT steers it with `ContactPlanBasedNodeTracking` + a
**non-overlapping** contact plan (`cht_sansa_handover.cp`, t=0 ≡
2026-06-15T00:00:00Z): GEO `[0,2970]` → MEO0102 `[2970,5400]` → GEO `[5400,11310]`
→ MEO0232 `[11310,13620]` → GEO `[13620,21180]` → MEO0209 `[21180,21600]`
sim-seconds. Each phase routes through the then-active sat via its own windowed
uplink/downlink `BasicApp` pair (a single app's `destinationNodes` is not
time-varying). The adapter composes the two one-hop legs per phase and
concatenates the six phases.

Result: latency ≈ **493.9 ms (GEO) ↔ 412.9 ms (MEO, ~81 ms step down)**, stepping
down at each of the 5 cross-orbit migrations and back up between them; each MEO
segment slopes as the satellite moves; a short handover gap appears at each
re-point. 2140 samples, loss-free. Panel: `public/estnet-handover-trace-panel.html`.

```bash
# regen the handover trace (after copying scenario/*handover* into the kit)
cd "$KIT" && source ./activate_env.sh && cd estnet-template/simulations
bash run_sim.sh release omnetpp_cht_sansa_handover.ini General Cmdenv --cmdenv-express-mode=true
cd /home/u24/papers/scenario-globe-viewer
python3 scripts/estnet/estnet_handover_trace_adapter.py \
  --vec "$KIT/estnet-template/simulations/results/General-0.vec" \
  --out public/fixtures/estnet/cht-sansa-handover-packet-trace.json
# view: dev server, then open /estnet-handover-trace-panel.html
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

For the **flat GEO trace** there is one extra disclosure (surfaced by the
`estnet:crosscheck` C7 mask-policy comparison): ABS-2A sits at ~30.8–31.0°
CHT elevation, marginally below the viewer demo's 31° effective CHT mask
(10° base + 21° terrain) — the viewer's own visibility policy would not
select this GEO for the pair. The pick predates the mask alignment; it is
kept as the steady-state PHY signature, disclosed in the fixture's
`nonClaims`, while the handover trace's APSTAR-7 complies with the mask.

For the **handover variant** there is one extra disclosure: the GEO↔MEO handover
is a **showcase route preference** (it mirrors the viewer's `demo-balanced-v1`
policy), NOT an RF-failure-driven handover — the GEO stays visible the whole run.
The satellites are genuinely mutually visible at the handover times (independently
SGP4-verified); the re-point models the single-dish constraint, not a dropped GEO.

## Status / next

Opt-in preview; does **not** touch the accepted 19/19 surface. The two
standalone pages (`estnet-trace-panel.html`, `estnet-handover-trace-panel.html`)
remain as quick previews, and the same two traces are **now also mounted into
the V4 ground-station side panel** as an opt-in `?estnet=1` disclosure section
(`src/features/multi-station-selector/estnet-trace-panel-section.ts`): a
collapsible "ESTNeT packet trace" row whose in-body toggle switches between the
GEO steady-state and GEO↔MEO handover traces (one generalized SVG renderer
consumes both fixture schemas). Absent `?estnet=1` nothing is appended, so the
accepted 19/19 surface is untouched — view at
`/?stationA=cht-yangmingshan&stationB=sansa-hartebeesthoek&estnet=1`.

The flat GEO trace (`cht-sansa-abs2a-packet-trace.json` /
`estnet-trace-panel.html`) is the honest steady-state signature; the **handover
variant** (`cht-sansa-handover-packet-trace.json` /
`estnet-handover-trace-panel.html`) is the faithful **full 6-hour timeline** —
all 6 demo handover events (5 cross-orbit migrations across GSAT0102/0232/0209 +
the initial GEO acquisition), aligned exactly to the viewer's golden D1.

## Requirement-data readiness

The requirement side has not yet delivered its own ESTNeT data
(irreducible-1 "Requirement ESTNeT trace pending"; R1-F3 iperf/ping sub-item;
K-B1 bridge). This pipeline doubles as the **rehearsal** for that delivery:

- `PACKET-TRACE-CONTRACT.md` — the single JSON contract every producer maps
  into, the provenance-tier ladder (delivery ≠ measurement, R12), and the
  checklist of artifacts + context to request from the requirement side.
- `external_trace_ingest.py` — already ingests the four plausible delivery
  shapes (`.vec`, scavetool CSV, ping, iperf3). When requirement data lands
  in one of those shapes, integration should reduce to a gated data-review
  step — ingest → stage → review → curated fixture commit — subject to the
  parser gate; an unlisted format still means adapter work.
- `npm run estnet:regen` regenerates our own traces end-to-end;
  `npm run verify:estnet` gates the contract, the honesty invariants, and the
  ingest parsers (including the `operator-measured` refusal guard).
