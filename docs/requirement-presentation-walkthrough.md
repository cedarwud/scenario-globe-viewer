# Requirement Presentation Walkthrough (Phase 1 — text content)

Status date: 2026-06-22
Reconciled against: merge `1496a03` (2026-06-13 public-data-gap closure),
`docs/data-source-index.md` (the governing honesty contract), and the track-B
pinned-local-snapshot default (commit `cfc6471`): the default demo geometry is the
pinned 2026-06-15 snapshots (882 actors); the CelesTrak network catalog is opt-in
(`?tleSource=network`).

> Building/maintaining the `.pptx` deck and seeing red spell-check squiggles?
> See [`pptx-spell-check-squiggles.md`](pptx-spell-check-squiggles.md)
> (fix: `python3 scripts/fix-pptx-proofing.py <file.pptx>`).

This document is the detailed, per-requirement walkthrough that backs a future
slide deck. It is **text content only** — not slides, not layout, not a `.pptx`.
For each of the 34 canonical requirements in `requirements-consolidated.md`, it
records: what the requirement asks, how this project satisfies it (named module
/ file / demo route), the exact data source and its source class, the citation,
the honesty boundary, and the status.

The compact `deliverable/slide-content-inventory.md` remains the index; this file
is its expanded and corrected long form. Where the two disagree, **this file and
`docs/data-source-index.md` are current** and the 2026-06-12 inventory is stale
(see the correction log at the end).

---

## How to read every row (the honesty rule)

Apply two questions to every number on a slide:

1. **Where did the displayed value come from?** (a public artifact, a standards
   model, TLE geometry, or a gap)
2. **What claim can that source actually support?**

A value can be useful in the viewer while still being only a model, a public
inference, an assumed parameter, or a legacy cache. **Functional demonstration is
not the same as source authority.** Many requirements are functionally
demonstrated by the viewer while their stronger "measured / operator-validated"
wording remains a gap. The deck must never present a model, an assumed parameter,
or a public-derived value as measured or operator-validated.

### Source classes (from `docs/data-source-index.md`)

| Class | Meaning | Valid claim | Not a valid claim |
|---|---|---|---|
| Public source | Public operator pages, filings, standards, CelesTrak snapshots, public geodata used by repo fixtures. | Value is traceable to a public artifact/citation. | Operator-private validation, active route, measured service quality. |
| Standards-derived | A model output from a 3GPP/ITU-R standard implemented in repo code. | Value follows the disclosed model and standard reference. | Packet-test, live RF handover, SLA, operator telemetry. |
| Geometric-derived | TLE + SGP4 geometry + selected-pair visibility logic. | Orbit geometry, visibility windows, model-selected handover candidates. | Active serving satellite, gateway assignment, throughput/latency/routing truth. |
| Assumed-Tier-B | A disclosed placeholder parameter set feeding a standards model, pending operator data. | The model runs on a declared assumption that is labeled as such. | Operator hardware truth (dish, EIRP, polarization, beam, antenna model). |
| Display transform | Camera, label, panel, report presentation. | The UI/report shows data readably. | New source evidence or stronger truth. |
| Legacy cache | Data from an earlier service/cache without full provenance. | The repo preserves the cached value and marks its limits. | Official DEM/RF/operator/measurement truth. |
| Source gap | Needed evidence absent or not attached. | The project knows what is missing and does not upgrade the claim. | Any requirement that depends on the missing evidence. |

### Source-authority tiers (from `requirements-consolidated.md`)

- **Tier A — operator-validated**: operator's own retained data. **0 delivered.**
  All Bucket B rows await a Tier A swap.
- **Tier B — public-disclosed**: 3GPP / ITU-R public standards, self-implemented
  in `src/runtime/link-budget/`. Retained PDFs + checksums in
  `deliverable/3gpp-itu-references/README.md`.
- **Tier C — geometric-derived**: SGP4 + local TLE.

### Status vocabulary

- **complete** — the slide-ready claim is fully supported if the stated boundary
  is kept.
- **partial (Tier B substitute)** — a narrower standards/public substitute is
  supported; the stronger operator/measured wording is not.
- **source gap** — the needed proof is absent from the retained package.
- **out-of-demo-scope** — external infrastructure or report-layer delivery, not
  the selected-pair viewer demo.

---

## Source catalog (compact citation IDs)

Reuse `[1]`–`[13]` from `deliverable/slide-content-inventory.md`; `[14]`–`[16]`
are added here for the 2026-06-13 merge artifacts.

| ID | Source | Can support | Cannot support |
|---|---|---|---|
| [1] | `requirements-consolidated.md` | Canonical 34-row list, bucket counts, IDs, tier policy. | Runtime proof, packet/RF measurement, acceptance. **Note: the spine's Bucket B rows + standards §-sections were synced to the merged state on 2026-06-14 (both repo + `/home/u24/papers/itri/` copies); `docs/data-source-index.md` [2] remains the governing contract.** |
| [2] | `docs/data-source-index.md` | Data-source classes, presentation source map, gap repair plan, "models stay models". | Original evidence store, acceptance certificate. **Current authority over [1] on antenna wiring + standards sections.** |
| [3] | `deliverable/selected-pair-source-evidence/README.md` | Retained selected-pair package, route, generated time, file hashes, package claim boundary. | Packet/RF/operator validation, final written acceptance. |
| [4] | `…/runtime-projection-evidence-cht-yangmingshan-sansa-hartebeesthoek-20260615T000000Z-360m.html` | Readable report: requirements, sources, models, handover, visibility, audit & evidence, raw data. Regenerated 2026-06-22 from the pinned local-snapshot default (882 actors) on the WS-F propagated-geometry link budget (sha `6e6546e3…`). | Original evidence store, rerun proof, packet/RF measurement, formal acceptance. |
| [5] | `…/runtime-projection-cht-yangmingshan-sansa-hartebeesthoek-20260615T000000Z-360m.csv` | Row-level export: fields, source tier, station precision, model outputs, gaps, non-claims. Regenerated 2026-06-22 from the pinned local-snapshot default after the WS-F propagated-geometry link budget (sha `17fff9d9…`). | Narrative beyond payload, packet logs, acceptance. |
| [6] | `…/external-source-reconciliation.md` | Public-source reconciliation for CHT/SANSA values, conflicts, verdicts, repair paths, non-observable gaps. | Exact CHT facility coordinate, active route, native RF handover, packet measurement, acceptance. |
| [7] | `deliverable/3gpp-itu-references/README.md` + PDFs | Retained 3GPP/ITU-R PDF map, section citations, checksums. | Operator-validated data, measured quality, local weather, hardware, packet/RF results. **Note: the README's "38811 §6.7 propagation delay" descriptor was corrected 2026-06-14 to §6.6.2 (slant range) + clause 5.3.1.1 (one-way delay) — see K-A2.** |
| [8] | `public/fixtures/ground-stations/multi-orbit-public-registry-sources.md` | Public station capability notes, source URLs, coordinate/elevation/band notes, non-claims. | Commercial pair routing, active serving satellite, private facility geometry, RF hardware completeness. |
| [9] | `…/open-elevation-selected-pair-query-2026-06-12.json` | Reproduces selected-pair **legacy** elevation cache values from Open-Elevation. | Official DEM tile/cell/datum/version/license; terrain mask; exact CHT coordinate. |
| [10] | `…/copernicus-dem-selected-pair-sample-2026-06-12.json` | Selected-pair Copernicus GLO-30 comparison cells with tile/row/col/CRS/datum/license. | Full-registry replacement; packet/RF/route/acceptance. |
| [11] | `…/rain-source-repair-candidates-2026-06-12.json` | Candidate public rain sources (NASA GPM IMERG, CWA Anbu/Zhuzihu) for calibration repair. | Any sampled rain value, measured weather, rain validation. |
| [12] | `README.md` | Repo scope, data-boundary rule, command list. | Requirement-coverage detail or original proof. |
| [13] | `public/fixtures/satellites-network/manifest.json` (opt-in `?tleSource=network`; the default demo loads the pinned `public/fixtures/satellites/…` snapshots per `demo-scenario-config.json`) | CelesTrak-sourced orbit manifest, generated time, orbit-class counts, epoch ranges. | Live upstream catalog, active serving satellite, operator assignment, or the default delivery geometry (that is the pinned snapshot). |
| **[14]** | `…/local-rain-calibration-2026-06-13.json` | Retained public CWA statistic (stations 46691 Anpu, 46693 Yangmingshan), raw `curl` commands + `rawResponseSha256` ×2, 149 samples each, peak 10-min increment → ×6 hourly equivalent → 5 mm/h preset mapping. Source class public-source; model-input `assumed-Tier-B`. | Measured-for-link weather, SANSA rainfall, 2026-06-15 scenario-window weather, long-term R0.01 calibration, rain-attenuation validation. |
| **[15]** | `…/copernicus-dem-selected-pair-terrain-mask-2026-06-13.json` | Selected-pair Copernicus GLO-30 elevation adoption (CHT 489 m; tile `Copernicus_DSM_COG_10_N25_00_E121_00_DEM`, cell row-3041-col-1979, EGM2008/EPSG:3855, 2021 release, 1 arcsec) and terrain-mask algorithm `radial-nearest-cell-horizon-v1` (5 km radius, 500 m step, 15° azimuth, ceil rule) → CHT 21°, SANSA 1°, with per-station ring checksums. Source class `public-DEM-derived`. | Surveyed RF horizon, clutter/vegetation/building obstruction, operator-measured CHT altitude, full 69-row registry replacement. |
| **[16]** | `src/features/multi-station-selector/runtime-antenna-assumptions.ts` | The disclosed `assumed-tier-b-antenna-params-selected-pair-v1` per-orbit antenna parameters wired into selected-pair RSRP/throughput. | Operator dish size, EIRP, polarization, beamwidth, antenna model, or measured antenna gain. |

**Selected-pair demo route (used throughout):**
`/?stationA=cht-yangmingshan&stationB=sansa-hartebeesthoek&startUtc=2026-06-15T00%3A00%3A00.000Z&durationMinutes=360`
Short form `/?stationA=<id>&stationB=<id>` auto-activates the V4 scene
(`isM8aV4GroundStationRuntimeRequested` in
`src/runtime/m8a-v4-ground-station-handover-scene-controller.ts`;
`resolveBootstrapScenePreset` in `src/runtime/bootstrap/composition.ts`).

The retained report renders **34 requirement rows**, source tier
`geometric-derived`, evidence kind `cross-family-geometric`. An independent label
scan of the HTML found **39 "Standards-derived" + 12 "geometric-derived"** chips
and **zero** "operator-validated" / "public-disclosed" labels — i.e. the
generator does not upgrade any modeled/geometric value to operator authority.

---

# Bucket A — project demo rows (19)

**Intro.** Bucket A is the project's main axis: the Cesium globe viewer plus the
selected-pair V4 ground-station projection. These rows are functionally
demonstrated in the live demo route. Their honest source class is
**geometric-derived** (TLE + SGP4 + visibility) and **standards-derived** (link
budget), surfaced through **display transforms** (panel, report, CSV). None of
these rows claims an active serving route, packet measurement, or operator
telemetry.

### R1-T1 / K-A1 — Integrate LEO/MEO/GEO orbit models + multi-orbit switching
*(Bucket A · complete)*
- **Asks:** Integrate the three orbit classes and produce multi-orbit signal
  switching.
- **Satisfied by:** SGP4 propagation of the three orbit classes from the pinned
  local snapshots (`public/fixtures/satellites/…`, the default per
  `src/features/multi-station-selector/demo-scenario-config.json`; the CelesTrak
  network catalog `public/fixtures/satellites-network/manifest.json` is an opt-in
  `?tleSource=network` refresh source); selected-pair switching candidates from
  `src/features/multi-station-selector/runtime-projection.ts` feeding
  `src/runtime/link-budget/handover-policy.ts`. Visible on the demo route.
- **Data source:** 882 actors loaded by default (600 OneWeb LEO + 33 Galileo MEO +
  249 commercial GEO) from the pinned 2026-06-15 snapshots · **geometric-derived** ·
  TLE/SGP4 · [1] [4] [13]. (Opt-in `?tleSource=network` instead loads the 1258-actor
  CelesTrak 2026-06-13 snapshot: 651 OneWeb LEO + 33 Galileo MEO + 574 GEO group.)
  (Runtime ranks by selected-pair visibility then caps per orbit: LEO 200 / MEO 100 / GEO 60.)
- **Boundary:** Model-selected switching candidates, **not** active serving-route
  migration or an operator event log.

### R1-T2 / K-D1 — Integrate satellite orbit data
*(Bucket A · complete)*
- **Asks:** Bring real orbit data into the model.
- **Satisfied by:** Retained CelesTrak GP/TLE manifest + propagated actor rows;
  traced in the report Sources/Raw-data tabs.
- **Data source:** `manifest.json` orbit-class record counts + epoch ranges ·
  **public source** (snapshot) · [1] [4] [5] [13].
- **Boundary:** A snapshot does not prove live upstream catalog state or operator
  assignment.

### R1-T3 / K-D2 — Equivalent visual scenario presentation (Blender or equivalent)
*(Bucket A · complete)*
- **Asks:** Visualize the scenario (Cesium accepted as the equivalent of the
  Blender tool named in the source).
- **Satisfied by:** Cesium globe + selected-pair endpoint markers, camera framing,
  and the retained HTML report.
- **Data source:** Presentation of the projection payload · **display transform** ·
  [1] [2] [4] [12].
- **Boundary:** Display transforms create no new source truth.

### R1-T4 / K-D3 — Interactive UI
*(Bucket A · complete)*
- **Asks:** Provide an interactive control interface.
- **Satisfied by:** V4 side panel (selector, rain slider, stats, disclosures),
  list picker, hover tooltip, copy-link; HTML report tabs + CSV download.
- **Data source:** App-surface interaction · **display transform** · [1] [4] [12].
- **Boundary:** The retained report is not a complete UI interaction trace.

### R1-T5 / K-D4 — Handover rule + adjustable parameters
*(Bucket A · complete)*
- **Asks:** Design the handover rules and the parameters that drive them.
- **Satisfied by:** `src/runtime/link-budget/handover-policy.ts` (four policies +
  adjustable gates); the demo route runs the `demo-balanced-v1` policy
  (`SELECTED_PAIR_DEMO_HANDOVER_POLICY_ID`) while `cross-orbit-live` is the generic
  non-demo default; thresholds + events disclosed in the report Handover tab.
- **Data source:** Policy gates referencing TR 38.821 §7.3.2.2 · **standards-derived
  / model policy** · [1] [4] [5] [7].
- **Boundary:** Modeled controls, **not** operator SLA or packet trace.

### R1-T6 / K-D5 — Communication-rate visualization design
*(Bucket A · complete)*
- **Asks:** Visualize communication rate / link quality.
- **Satisfied by:** `src/runtime/link-budget/` (FSPL + gas + rain + antenna) →
  `runtime-projection.ts` throughput estimate; side-panel stats + CSV.
- **Data source:** Clear-sky reference capacity with atmospheric fade and assumed
  antenna off-axis de-rating · **standards-derived + assumed-Tier-B** · [2] [4]
  [5] [7] [16].
- **Boundary:** Latency/jitter/throughput are **model estimates**; full operator
  station RF hardware truth (EIRP, dish, polarization) is still a gap.

### R1-F1 / K-E1 — Support ≥ 500 LEO simulation actors (Starlink, OneWeb)
*(Bucket A · complete)*
- **Asks:** Simulate at least 500 LEO satellites.
- **Satisfied by:** Default load of **600 OneWeb LEO** (plus 33 Galileo MEO, 249
  commercial GEO) from the pinned 2026-06-15 local snapshots. (Opt-in
  `?tleSource=network` refreshes from the CelesTrak snapshot
  `GROUP=oneweb|galileo|geo` → 651 OneWeb LEO.)
- **Data source:** 600 OneWeb LEO ≥ 500 target · **public source / geometric-derived**
  · [1] [4] [5] [13]. The pinned LEO snapshot is
  `…/leo-scale/oneweb-2026-06-15T00-00-00Z.tle`; a sibling 600-record Starlink
  fixture (`…/leo-scale/starlink-…tle`) exists in the same directory but is **not
  default-loaded**.
- **Boundary:** "≥ 500 LEO" is met by OneWeb; the runtime LEO set is OneWeb, not
  Starlink. The "~11015 satellites" figure was the **upstream CelesTrak catalog
  size**, not the default local load (882; or 1258 under the opt-in network
  snapshot) — corrected 2026-06-13.

### R1-F2 / K-E2 — Adjustable simulation speed (real-time vs prerecorded TLE)
*(Bucket A · complete)*
- **Asks:** Adjustable playback speed and real-time / prerecorded scenario
  switching.
- **Satisfied by:** Operator HUD three bounded presets **30× / 60× / 120×**
  (`src/runtime/m8a-v4-product-ux-model.ts:29-31`); real-time window default
  `[now, now+360 min]`; prerecorded fixed window on the demo route.
- **Data source:** Preset constants + 6-hour prerecorded window in the report ·
  **display transform / app surface** · [1] [4] [5].
- **Boundary:** Playback-preset evidence is app-surface, not a row-level CSV
  metric. The underlying clock accepts arbitrary multipliers; the visible UI is
  gated to the three presets.

### R1-F3 / K-E3 — Real-time communicable time (originally citing iperf/ping)
*(Bucket A · partial (Tier B substitute))*
- **Asks:** Show real-time communicable time; the source text mentions iperf/ping
  testing.
- **Satisfied by:** Visibility windows + selected-pair link-selection policy in
  `runtime-projection.ts`; communicable time shown in the report Summary and
  exported in CSV.
- **Data source:** Model-calculated available time · **geometric-derived /
  standards-derived** · [1] [2] [4] [5].
- **Boundary:** This is **model-calculated** availability, **not** successful
  connection time, ping/iperf uptime, or operator availability. The iperf/ping
  measurement sub-item is a source gap (see irreducible-1).
- **Status note:** Complete at the model/visibility level; the measured-connection
  portion of the original wording is a gap.

### R1-F4 / K-E4 / K-F4 — Handover strategy switching by latency/jitter/speed
*(Bucket A · complete)*
- **Asks:** Switch handover strategy between high/mid/low orbit on latency / jitter
  / network-speed conditions.
- **Satisfied by:** Link-budget metrics feed the handover engine; model-selected
  switches + cross-orbit migrations in the report Handover tab.
- **Data source:** Policy gates referencing TR 38.821 §7.3.2.2 + V-MO1 ·
  **standards-derived / model policy** · [1] [4] [5] [7].
- **Boundary:** No operator event log, active serving route, or RF handover trace.

### R1-F5 / K-E5 — Statistical report export
*(Bucket A · complete)*
- **Asks:** Export statistics.
- **Satisfied by:** V4 side-panel CSV export (RFC-4180) via
  `runtime-projection-csv.ts`; standalone HTML report via
  `runtime-projection-evidence-report.ts`; both retained with SHA-256 in [3].
- **Data source:** Report HTML (1670097 B, sha `9061837b…`) + CSV (104747 B, sha
  `e07359f8…`) · **display transform / external evidence** · [1] [3] [4] [5].
- **Boundary:** HTML/CSV are evidence surfaces, **not** a final acceptance
  certificate.

### K-A4 — Input TLE data and track satellite motion
*(Bucket A · complete)*
- **Asks:** Ingest TLE data and track satellites.
- **Satisfied by:** TLE/OMM manifest rows propagated into actor provenance; the
  chrome TLE-telemetry chip now derives its displayed date from the newest
  retained TLE timestamp (`dataCompleteness.tleSources[].sourceTimestampUtc` /
  snapshot timestamp via `resolveTleDate` in
  `src/features/multi-station-selector/chrome-telemetry.ts`), with a dated filename
  only as fallback.
- **Data source:** Chip shows `2026-05-31`; live CelesTrak cross-check confirms
  NORAD 44057 = ONEWEB-0012 in the shipped fixture · **public source** · [1] [4]
  [5] [13].
- **Boundary:** The browser reads bundled files; it does not prove a live catalog
  connection. No operator-validation claim. (This row was the prior lone G1
  failure; fixed by Task 1 of the merge.)

### K-E6 — Show rain attenuation impact
*(Bucket A · complete)*
- **Asks:** Demonstrate rain-fade impact.
- **Satisfied by:** `src/runtime/link-budget/rain-attenuation.ts` + the V4 rain
  slider; downlink throughput de-rates with rain (e.g. LEO −45% / GEO −80%
  reductions render at high rain rate).
- **Data source:** ITU-R P.618-14 §2.2.1.1 path method, e.g. 20 GHz / 50 mm/h /
  45° → 27.3 dB; latitude-sensitive (lat 0° → 30.5 dB, lat 78° → 8.3 dB) ·
  **standards-derived** · [1] [2] [4] [5] [7].
- **Boundary:** Driven by the **interactive instantaneous rain rate** (a what-if
  input), **not** measured local weather or a calibrated rain-rate time series.

### K-F7 — Produce a demo (prerecorded scenario or real-time simulation)
*(Bucket A · complete)*
- **Asks:** Deliver a runnable demo.
- **Satisfied by:** The selected-pair V4 demo route + retained evidence package.
- **Data source:** Route + projection output · **display transform / external
  evidence** · [1] [3] [4] [5].
- **Boundary:** Representative demo evidence is **not** an external acceptance
  threshold script.

### R1-D1 — 11/30 milestone: orbit model import succeeded
*(Bucket A · complete)*
- **Asks:** Deliverable-table milestone for orbit-model import.
- **Satisfied by:** Imported orbit-source artifacts + propagated actors disclosed
  in the report.
- **Data source:** Manifest + actor rows · **public source / geometric-derived** ·
  [1] [4] [5] [13].
- **Boundary:** This row does not, by itself, reproduce the full historical
  milestone package.

### R1-D2 — 11/30 milestone: dynamic parameter UI
*(Bucket A · complete)*
- **Asks:** Deliverable-table milestone for an adjustable-parameter interface.
- **Satisfied by:** V4 side panel retains time window, rain input, active policy.
- **Data source:** Snapshot parameters · **display transform** · [1] [4] [5].
- **Boundary:** Snapshot parameters are not a complete live-control interaction log.

### R1-D3 — 11/30 milestone: communication-time statistics
*(Bucket A · complete)*
- **Asks:** Deliverable-table milestone for communication-time statistics.
- **Satisfied by:** Communication-time statistics shown in the report and exported
  via CSV.
- **Data source:** `communicationStats` payload · **geometric-derived (model)** ·
  [1] [4] [5].
- **Boundary:** Statistics are model-derived, **not** ping/iperf or measured
  throughput.

### R1-D4 — 11/30 milestone: stable operation ≥ 24 hours
*(Bucket A · complete)*
- **Asks:** Run stably for at least 24 hours.
- **Satisfied by:** Retained 24-hour soak artifact.
- **Data source:**
  `output/soak/2026-05-15T05-42-07-506Z-phase7-0-full/summary.json` —
  `passed=true`, `durationMs=86400000` (24 h), `sampleCount=1289`,
  `failureCount=0`, 2026-05-15 → 2026-05-16 · **external evidence** · [1] [4].
- **Boundary:** Opening the report does not rerun the soak; the claim rests on the
  retained artifact.

### V-MO1 — Cross-orbit LIVE handover (verbal addendum refining K-A1)
*(Bucket A · complete)*
- **Asks:** A single service continuously handed over LEO → MEO → GEO — a real
  live handover, not an orbit-type picker.
- **Satisfied by:** `handover-policy.ts` implements four policies; the demo route
  runs the `demo-balanced-v1` policy (`SELECTED_PAIR_DEMO_HANDOVER_POLICY_ID`),
  while `cross-orbit-live` is the generic non-demo default. The replay event pill
  carries `data-v-mo1="true"` on each cross-orbit (GEO⇄MEO) migration.
- **Data source:** Model-selected cross-orbit migration events · **geometric-derived
  / model policy** · [1] [4] [5] [7].
- **Boundary:** Do **not** call this native RF handover, active serving-route
  migration, or an operator event proof. It is a model-policy migration over TLE
  geometry. For the CHT×SANSA demo pair, LEO mutual-visibility is zero
  (`leoCommunicatingMs=0`), so the delivered migration is **GEO⇄MEO** only; the
  full LEO→MEO→GEO chain would need a pair with LEO co-visibility. Demo policy =
  `demo-balanced-v1`.

---

# Bucket B — Tier B public-standard substitutes (7)

**Intro.** Bucket B rows each need operator data to reach Tier A authority. The
project has implemented a **Tier B public-standard substitute** for each, in
`src/runtime/link-budget/`, backed by retained ITU-R/3GPP PDFs with checksums
[7]. Four substitutes are wired into the selected-pair runtime; three
("irreducible") items have a reasonable public substitute but remain source gaps
for their strongest wording. **The 2026-06-13 merge changed three of these rows**
— antenna is now runtime-wired, a public local-rain statistic now exists, and the
DEM/terrain provenance is adopted for the selected pair. Each is written below in
its current (post-merge) honest form.

### K-A2 — Link-quality rules (latency / jitter / network-speed switching policy)
*(Bucket B · partial (Tier B substitute))*
- **Asks:** Operator link-quality rules driving orbit switching.
- **Satisfied by:** Latency model in `runtime-projection.ts` + jitter model in
  `runtime-modeled-output.ts` + `handover-policy.ts`. Implemented as a Tier B
  substitute.
- **Data source:** One-way propagation latency from **TR 38.811 §6.6.2** (spherical-
  earth slant range, Eq 6.6-3) **+ clause 5.3.1.1** (one-way propagation delay);
  jitter = orbit baseline with rain scale · **standards-derived** · [1] [2] [4]
  [5] [7]. A `+2 ms` fixed processing term is disclosed as **non-standard**.
- **Boundary:** No operator packet traces or private link-quality time series.
  Latency is a model anchor, not ping/RTT/jitter measurement.
- **Citation note:** The corrected latency citation is **§6.6.2 + clause 5.3.1.1**.
  The spine [1] and the catalog README [7] were synced to this citation on
  2026-06-14; `docs/data-source-index.md` [2] is the governing contract and was
  verified against the standard structure (§6.7 is the fast-fading section, not
  propagation delay).

### K-A3-a — Antenna parameters (peak gain, beamwidth, pattern)
*(Bucket B · partial (Tier B substitute — now runtime-wired))*
- **Asks:** Antenna peak gain, beamwidth, and radiation pattern.
- **Satisfied by:** `src/runtime/link-budget/antenna-pattern.ts`
  (`computeSatelliteAntennaGainDb` + `computeEarthStationAntennaGainDb`) is now
  **wired into** `runtime-projection.ts` (call sites at lines 610 and 616) via the
  disclosed assumption set `runtime-antenna-assumptions.ts`
  (`assumed-tier-b-antenna-params-selected-pair-v1`). Antenna gain feeds
  `combinedAntennaGainDb`, `antennaOffAxisLossDb`, RSRP proxy, and throughput.
- **Data source:** **ITU-R S.1528-0 Annex 1** (non-GSO satellite pattern) +
  **ITU-R S.465-6** (earth-station pattern), with assumed per-orbit parameters
  (LEO sat 35 / earth 43 dBi; MEO 38 / 48; GEO 42 / 52). Combined gains ≈
  75.7 / 83.9 / 91.9 dB with 2.1–2.3 dB off-axis loss · **standards-derived
  formula + assumed-Tier-B parameters** · [1] [2] [4] [5] [7] [16].
  Earth-station S.465 validation uses the carrier when within 2–31 GHz; MEO
  L-band uses the 2 GHz lower-bound reference for pattern validation only (not for
  FSPL carrier truth).
- **Boundary:** RSRP is exported as `receivedPowerProxyDbm` (a **relative proxy**
  because EIRP is unknown). The assumed gains/beamwidths/dish sizes are **not**
  operator RF hardware, real dish size, EIRP, polarization, beam assignment, or
  measured antenna gain. `bootstrap-physical-input-seeds.ts` still uses the older
  `itu-r-f699-antenna-pattern.ts` for input seeds — unrelated to this runtime path.
- **Correction vs stale inventory:** The 2026-06-12 inventory and the spine [1]
  call this module "standalone, not wired." That is **stale** — it is wired as of
  the merge; the remaining gap is operator hardware truth (renamed gap
  `operator-rf-hardware-truth`), not the wiring.

### K-A3-b — Rain attenuation model
*(Bucket B · partial (Tier B substitute))*
- **Asks:** A rain-fade model.
- **Satisfied by:** `rain-attenuation.ts` (full P.618-14 path method) with P.838-3
  coefficients delegated to `src/features/itu-r-physics/itu-r-p838-rain-attenuation.ts`
  (single source of truth for the coefficient table).
- **Data source:** **ITU-R P.618-14 §2.2.1.1** path method — γR = k·R^α (Step 5) +
  horizontal reduction r0.01 (Eq 5) + vertical adjustment ν0.01 (Eq 6, uses station
  latitude) + effective path LE = LR·ν0.01 (Step 8) + A = γR·LE (Step 9). P.838-3
  coefficients verified exact vs Table 5 · **standards-derived** · [1] [2] [4] [5]
  [7].
- **Boundary:** Driven by the **instantaneous** rain-rate input, **not** the R0.01
  long-term statistic; no percentage-of-time extrapolation (Step 10); P.839 rain
  height simplified. Not measured local weather or Taiwan local calibration. See
  irreducible-3 for the public local-rain statistic that now seeds the demo preset.

### K-F2 — Integrate the V-team simulation program (antenna + rain + ITU rules)
*(Bucket B · partial (Tier B substitute))*
- **Asks:** Integrate the partner V-team simulation components.
- **Satisfied by:** Self-written ITU calculator across the five
  `src/runtime/link-budget/` modules (FSPL + rain + gas + antenna +
  handover-policy), all wired into `runtime-projection.ts` as of the merge.
- **Data source:** P.618 / P.676 / S.1528 / S.465 / TR 38.811 / TR 38.821 ·
  **standards-derived (+ assumed-Tier-B antenna params)** · [1] [2] [4] [5] [7]
  [16].
- **Boundary:** This is the project's **substitute** for the V-team program, not
  the V-team program itself; standards cannot fill missing station hardware truth.
  Swap to Tier A when the V-team program / operator data is delivered.
- **Correction vs stale inventory:** Spine [1] still says "antenna-pattern is
  standalone, not wired." **Stale** — now wired (see K-A3-a).

### irreducible-1 — Real packet trace (latency / jitter time series)
*(Bucket B · source gap)*
- **Asks:** A real ESTNeT packet trace with latency/jitter time series.
- **Satisfied by:** Only a synthetic/model baseline from the TR 38.811 generic
  model; truth-boundary tag `"ESTNeT trace pending"`.
- **Data source:** Model baseline · **standards-derived (substitute)** · [1] [2]
  [4] [5] [6].
- **Boundary:** No retained ping/iperf or equivalent packet-test time series. Do
  not claim measured latency/jitter.

### irreducible-2 — External acceptance scenario script + pass/fail thresholds
*(Bucket B · source gap)*
- **Asks:** The acceptance test script (which case passes, at what threshold).
- **Satisfied by:** Five representative selected-pair baseline routes retained in
  `src/features/multi-station-selector/v4-projection-wave1-baselines.ts` (support
  demo-case discussion).
- **Data source:** Retained baselines · **external evidence (repo baseline)** · [1]
  [2] [4] [6].
- **Boundary:** Representative routes are **not** an external acceptance threshold
  script, scenario package, or reviewer verdict.

### irreducible-3 — Taiwan local rain-statistic calibration (R0.01)
*(Bucket B · partial (Tier B substitute) — was source gap)*
- **Asks:** Local Taiwan rainfall statistics (e.g. Hsinchu/Pingtung R0.01) for
  calibration.
- **Satisfied by:** Retained public CWA station-observation sample mapped to a
  bounded demo preset.
- **Data source:** CWA stations **46691 Anpu** and **46693 Yangmingshan**, 24-hour
  observation HTML, 149 samples each, window 2026-06-12 → 2026-06-13, raw `curl`
  commands + `rawResponseSha256` ×2. Peak 10-minute increment 0.5 mm → ×6 = 3 mm/h
  hourly equivalent → rounded to the slider step → **5 mm/h demo preset** ·
  **public source** (model input `assumed-Tier-B`) · [1] [2] [6] [11] [14].
- **Boundary:** **Not** measured weather for the CHT-SANSA link, **not** SANSA
  rainfall, **not** 2026-06-15 scenario-window weather, and **not** an
  R0.01/availability calibration under the P.837/P.618 workflow. The clear-sky
  report still uses rain rate 0 unless the slider is moved.
- **Correction vs stale inventory:** The 2026-06-12 inventory marks this a pure
  source gap ("no sampled local rain-rate data"). **Stale** — a public sample now
  exists; only the measured-for-link / R0.01 strength remains a gap.

---

# Bucket C — external infrastructure / report-layer rows (8)

**Intro.** Bucket C is **not** in the selected-pair viewer's UI scope. Six rows are
external network/test infrastructure owned outside this project; two are
report-layer deliverables the project writes separately. They are listed for
requirement-list completeness. The selected-pair projection is a globe/runtime
model artifact and cannot, by itself, prove any of these.

### K-F1 — Physical network bridge via the external simulator (INET ↔ ESTNeT)
*(Bucket C · out-of-demo-scope)*
- **Asks:** Connect the simulator to the physical network.
- **Project relation:** External infrastructure; no selected-pair runtime content.
- **Data source / boundary:** Modeled visibility/handover cannot prove a physical
  bridge · **source gap (external)** · [1] [2] [4].

### K-A5 — Linux main environment + Windows + WSL backup
*(Bucket C · out-of-demo-scope)*
- **Asks:** Host-environment readiness.
- **Project relation:** Belongs to external validation, not the report.
- **Data source / boundary:** Not a UI/runtime projection value · **external** ·
  [1] [4].

### K-B1 — Windows tunneling / ESTNeT real-traffic satellite bridge
*(Bucket C · out-of-demo-scope)*
- **Asks:** `ping 10.2.0.1 → tun0 → GS-A → Satellite → GS-B → tun1` topology.
- **Project relation:** Topology diagram, not a UI spec.
- **Data source / boundary:** No tunnel/interface/real-traffic bridge evidence is
  attached · **source gap (external)** · [1] [2] [4].

### K-C1 — INET NAT routing + veth bridge
*(Bucket C · out-of-demo-scope)*
- **Asks:** NAT routing + veth0/veth1 simulated-real bridge.
- **Project relation:** External topology artifact.
- **Data source / boundary:** Raw projection JSON cannot prove NAT routing ·
  **source gap (external)** · [1] [2] [4].

### K-F5 — Virtual DUT testbench program
*(Bucket C · out-of-demo-scope)*
- **Asks:** A virtual device-under-test testbench.
- **Project relation:** Not part of the selected-pair package.
- **Data source / boundary:** Projection data is not a testbench program ·
  **source gap (external)** · [1] [2] [4].

### K-F6 — Physical DUT / NE-ONE traffic-generator scenario
*(Bucket C · out-of-demo-scope)*
- **Asks:** A physical DUT / traffic-generator run.
- **Project relation:** No physical DUT or traffic result retained.
- **Data source / boundary:** Do not claim measured throughput or traffic-generator
  success · **source gap (external)** · [1] [2] [4].

### K-F8 — Final written report
*(Bucket C · source gap (report layer))*
- **Asks:** The final written project report.
- **Project relation:** The project writes this at the report layer; the
  selected-pair HTML is an **appendix candidate**, not the final report.
- **Data source / boundary:** No final written report package is attached · **source
  gap** · [1] [2] [3] [4].

### R1-D5 — Technical WP1 evaluation report
*(Bucket C · source gap (report layer))*
- **Asks:** A WP1 technical evaluation report.
- **Project relation:** The selected-pair report can support a future WP1 report
  but cannot replace it.
- **Data source / boundary:** No complete technical evaluation report artifact is
  attached · **source gap** · [1] [2] [3] [4].

---

# Gaps that need operator / external data (genuinely blocked)

These remain disclosed gaps after the 2026-06-13 merge — the items that need
customer-supplied operator data, external test infrastructure, or a formal
acceptance package this project does not own. **Do not claim any of them in the
deck.** Each is openly marked "cannot prove" in `docs/data-source-index.md` and
the report's gap register. No Tier A / operator-validated upgrade has been
attempted — correctly.

| Gap | Blocks (requirement IDs) | What would close it |
|---|---|---|
| Packet latency, jitter, throughput, loss | R1-F3 / K-E3; K-A2; irreducible-1 | Retained ping/iperf logs: endpoints, directions, timestamps, raw output, parsed metrics, reviewer verdict. |
| Native RF handover / active serving route | R1-F4 / K-E4 / K-F4; V-MO1 | Operator/RF event logs, terminal logs, lab RF trace, or active-route telemetry. |
| Operator station RF hardware | R1-T6 / K-D5; K-A3-a; K-F2 | Row-level retained EIRP, gain, beamwidth, polarization, frequency band, antenna model. (Gap `operator-rf-hardware-truth`.) |
| Surveyed RF horizon / full-registry DEM | Station precision; K-F2 context | Surveyed horizon data, or extend the reviewed DEM sampling algorithm beyond the selected pair (currently CHT + SANSA only). |
| Measured-for-link weather + long-term R0.01 | K-A3-b; K-E6; irreducible-3 | Long-term station/grid statistics or scenario-window weather; R0.01 availability calibration. |
| External acceptance thresholds + final acceptance | irreducible-2; K-F8; R1-D5 | Accepted scenario package: case list, thresholds, command, raw output, pass/fail verdict; formal written report. |
| Physical bridge / NAT / DUT / traffic generator | K-F1; K-B1; K-C1; K-F5; K-F6 | Topology inventory, interface/NAT/route config, bridge/tunnel logs, DUT identity, traffic output, redaction policy, reviewer verdict. |
| Tier A operator data (Bucket B swap) | K-A2; K-A3-a; K-A3-b; K-F2 | Operator-supplied retained data + validation logs + swap policy Tier B → Tier A. |

---

# Corrections applied vs the stale 2026-06-12 inventory

Rows changed against `deliverable/slide-content-inventory.md` (2026-06-12) and the
spine `requirements-consolidated.md`, after reconciling with merge `1496a03` and
`docs/data-source-index.md`:

1. **K-A3-a / K-F2 (antenna wiring).** Inventory + spine say the antenna module is
   "standalone, not wired into runtime." **Corrected:** wired into
   `runtime-projection.ts` (lines 610/616) via
   `runtime-antenna-assumptions.ts` (`assumed-tier-b-antenna-params-selected-pair-v1`).
   RSRP stays a relative proxy; operator RF hardware remains the gap.
2. **irreducible-3 / K-A3-b / K-E6 (local rain).** Inventory marks "no sampled local
   rain-rate data." **Corrected:** retained public CWA sample (stations 46691 /
   46693) → bounded **5 mm/h** demo preset [14]; still not measured-for-link or
   R0.01.
3. **DEM elevation + terrain mask.** Inventory says Copernicus is "comparison
   artifact, not adopted into runtime" and "no terrain horizon mask generated."
   **Corrected:** CHT adopts Copernicus **489 m**; terrain masks **CHT 21° / SANSA
   1°** computed and runtime-applied for the selected pair [15]. SANSA keeps
   operator-stated **1553 m** (Copernicus 1533 m comparison-only).
4. **K-A4 (TLE chip).** Inventory says complete but does not record the mechanism.
   **Corrected:** chip date now derives from retained TLE timestamp metadata
   (`resolveTleDate`), shows `2026-05-31`, and is the fix for the prior lone G1
   failure.
5. **R1-F1 satellite count.** Spine previously said "~11015 Starlink+OneWeb."
   **Corrected (2026-06-14 TLE refresh):** 651 OneWeb LEO + 33 Galileo MEO + 574
   GEO group = **1258** loaded (CelesTrak 2026-06-13 snapshot); 11015 is the
   upstream CelesTrak catalog size; Starlink fixture not default-loaded.
   **Note:** `scripts/refresh-tle.mjs` had drifted to `GROUP=gnss` for MEO (pulls
   all GNSS + SBAS, mixing GEO/IGSO into MEO); fixed back to `GROUP=galileo`
   (pure MEO, 33). GEO uses the full `GROUP=geo` (574; the prior fixture's 30 was a
   hand-curated subset that no CelesTrak group reproduces) — runtime ranks by
   selected-pair visibility then caps to 60, so demo behaviour is unchanged.
   **Superseded 2026-06-22 (track B — see item 11):** the default source and demo
   window were re-pinned to the 2026-06-15 local snapshots, and GEO now ships the
   full commercial subset (249) rather than the 574-record network `GROUP=geo`.
6. **Latency citation (K-A2).** Spine/catalog say TR 38.811 "§6.7." **Corrected:**
   latency = **§6.6.2 (slant range) + clause 5.3.1.1 (propagation delay)**; the
   `+2 ms` processing term disclosed as non-standard.
7. **Rain citation (K-A3-b).** Spine says P.618-14 "§2.2.1." **Corrected:**
   **§2.2.1.1** path method.
8. **Handover citation + policy (R1-T5 / R1-F4 / V-MO1).** Earlier "§7.3." **Corrected:**
   **§7.3.2.2** (Conditional Handover); `cross-orbit-live` attributed to V-MO1, not
   3GPP. **[2026-06-22] Policy name corrected:** the demo route runs
   `demo-balanced-v1` (`SELECTED_PAIR_DEMO_HANDOVER_POLICY_ID`); `cross-orbit-live`
   is the generic `DEFAULT_RUNTIME_HANDOVER_POLICY_ID` only. Demo delivers GEO⇄MEO
   (LEO mutual-visibility = 0 for this pair).
9. **Evidence package date/hashes ([4]/[5]).** **(Network-snapshot state;
   superseded 2026-06-22 — see item 11.)** **Regenerated 2026-06-15** with the
   WS-C audit tab on the WS-F propagated-geometry link budget (HTML 1670097 B sha
   `9061837b…`, CSV 104747 B sha `e07359f8…`). WS-C added an Audit & evidence tab
   (honesty grading matrix, model-boundary disclosure, standards conformance with
   retained-PDF sha256 + sample I/O, rain sensitivity, reproducibility imprint,
   verification status); the projection numbers are unchanged from WS-F so the CSV
   is byte-identical. WS-F: the link budget uses the SGP4-propagated satellite
   radius for slant range and the instantaneous per-station elevation, with rain
   bound to the worse station; mutual-visibility geometry is unchanged (actor rows
   63, visibility windows 64), and the handover sequence re-ranked among
   same-orbit GEO candidates. Source pool remains the full refreshed snapshot
   (651 OneWeb LEO / 33 Galileo MEO / 574 GEO group); runtime still ranks by
   selected-pair visibility and caps per orbit (200/100/60).
10. **Catalog extended.** Added [14] local rain, [15] DEM/terrain mask, [16]
    antenna assumption module.
11. **Track B — pinned local-snapshot default + full commercial GEO (2026-06-22).**
    The default runtime + delivery source is now the pinned 2026-06-15 local
    snapshots (`public/fixtures/satellites/…`, per `demo-scenario-config.json`):
    **600 OneWeb LEO + 33 Galileo MEO + 249 commercial GEO = 882** actors. The
    CelesTrak network catalog (651 / 33 / 574 = 1258) is retained as an opt-in
    refresh source (`?tleSource=network`), so the demo is no longer
    wall-clock-date-dependent (commit `cfc6471`; ADR 0014 #6). The evidence package
    [4]/[5] was regenerated from this pinned default (HTML sha `6e6546e3…`, CSV sha
    `17fff9d9…`): selected-pair visibility windows **17**, handover events **6** (5
    transitions, 1 acquisition), comm time 360 min, representative MEO GSAT0102 /
    GEO APSTAR-7 link budgets. Supersedes items 5 and 9.

---

## Root-cause sync (2026-06-14)

To remove the doc-lag at its source, the stale-but-cited upstream docs were
brought to the merged state (not just pointed at):

- `requirements-consolidated.md` (both the repo copy and the canonical
  `/home/u24/papers/itri/` copy) — Bucket B rows K-A2 / K-A3-a / K-A3-b / K-F2 +
  irreducible-1 / irreducible-3, the standards-citation example, and a
  2026-06-13 change-history entry. Each copy keeps its own terminology
  convention (the repo copy is neutralized; the itri canonical retains its
  customer label) — only the stale technical facts were aligned, not the wording.
- `deliverable/3gpp-itu-references/README.md` [7] — the TR 38.811 latency
  descriptor and the P.618-14 rain-section descriptor.
- `deliverable/slide-content-inventory.md` [3] — the changed coverage rows,
  claim-bank bullets, and gap-appendix rows; its catalog now defines [14]-[16].

After this sync, code + `docs/data-source-index.md` + the spine + this
walkthrough agree on antenna wiring, the rain / DEM / terrain / local-rain
state, and the standards §-citations.

# Claims I could not fully verify (flagged for honesty)

- **TR 38.811 §6.7 content.** I verified (via the converted standard text + code
  headers) that the project's **current** latency citation §6.6.2 + clause 5.3.1.1
  is structurally correct. The §6.7 descriptors in spine [1] and catalog [7] were
  corrected 2026-06-14. I relied on the 2026-06-13 audit's finding that §6.7 is the
  "Fast fading model" section rather than re-reading the PDF page directly.
- **Antenna combined-gain numerics (75.7 / 83.9 / 91.9 dB; off-axis loss 2.1–2.3
  dB).** Taken from the merge's recorded numeric sample and the per-orbit peak
  parameters in [16] (peaks 78 / 86 / 94 dB). I confirmed the call sites and the
  parameter table directly but did not independently recompute the S.1528/S.465
  off-axis loss for every orbit; the values are internally consistent
  (peak − off-axis ≈ combined).
- **Rain numeric anchors (27.3 dB; latitude 30.5 → 8.3 dB).** Quoted from the
  2026-06-13 audit's compiled-module re-computation, not re-run here. The clear-sky
  report uses rain rate 0, so these are slider/what-if values, not retained-row
  outputs.
- **G1 acceptance tally.** The merge record reports G1 PASS (controller: 19/19
  coverage rows, 0 failures, including K-A4 / K-E6; executor's "22/22" is a looser
  K-id token count). I did not re-run G1 (it needs a Vite dev server on :5173); I
  rely on the retained verification record.
- Everything else cited above (route, hashes, soak summary, CWA sample fields, DEM
  tile/cell/datum, antenna call sites, presets, report label scan) was read
  directly from the named artifact or code file during this pass.
