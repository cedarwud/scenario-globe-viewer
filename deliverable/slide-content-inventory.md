# Slide Content Inventory

Status date: 2026-06-12

Scope: content inventory only. This is not slide layout, not a `.pptx`, and not
a visual design draft.

> **Index note (added 2026-06-14):** This compact inventory is the *index*. The
> detailed, current per-requirement walkthrough is
> [`../docs/requirement-presentation-walkthrough.md`](../docs/requirement-presentation-walkthrough.md),
> reconciled against merge `1496a03` (2026-06-13 public-data-gap closure) and
> `docs/data-source-index.md`. Where the two disagree, the walkthrough is
> current. Rows below that the merge changed — **K-A3-a / K-F2** (antenna now
> runtime-wired with assumed Tier-B params), **K-A3-b / irreducible-3 / K-E6**
> (retained public CWA local-rain statistic → 5 mm/h preset), and **DEM/terrain**
> (CHT 489 m adopted; CHT 21° / SANSA 1° masks) — are corrected there. The
> catalog `[1]`–`[13]` below is reused; the walkthrough adds `[14]`–`[16]`.

## Citation Policy

Future slide body text should cite compact source IDs such as `[1]` and `[2]`.
This file keeps the longer path and boundary notes in one place so the slide
deck does not need long URLs in body copy.

Status terms in the requirement inventory mean:

- `complete`: the slide-ready claim below is fully supported if the stated
  boundary is kept.
- `partial`: current evidence supports a narrower substitute or model claim,
  but not the stronger requirement wording.
- `source gap`: the needed proof is absent from the retained package.
- `out of current demo scope`: the row belongs to external infrastructure or
  report-layer delivery, not the selected-pair viewer demo.

## Source Catalog

| Citation | Source | Can support | Cannot support |
|---|---|---|---|
| [1] | `requirements-consolidated.md` | Canonical 34-row requirement list, bucket counts, requirement IDs, raw completion notes, source-tier policy, and source-traceability update. | Runtime proof by itself, packet/RF measurements, final acceptance, or any stronger claim than the row text and boundary allow. |
| [2] | `docs/data-source-index.md` | Data-source classes, presentation-facing source map, source gap repair plan, and the rule that modeled values stay modeled. | Original evidence store, final acceptance certificate, or proof of missing packet/RF/weather/hardware data. |
| [3] | `deliverable/selected-pair-source-evidence/README.md` | Retained selected-pair evidence package, route, generated time, file list, SHA-256 hashes, source tier, package-level claim boundary. | Packet latency/jitter/throughput/loss, native RF handover, operator-private validation, station RF hardware truth, adopted DEM, terrain mask, local rain time series, external thresholds, final written acceptance. |
| [4] | `deliverable/selected-pair-source-evidence/runtime-projection-evidence-cht-yangmingshan-sansa-hartebeesthoek-20260615T000000Z-360m.html` | Readable report for selected-pair summary, requirements table, sources, models, handover, visibility, raw data, and evidence/gap registers. | Original evidence store, rerun proof, packet/RF measurement, complete UI interaction trace, or formal acceptance report. |
| [5] | `deliverable/selected-pair-source-evidence/runtime-projection-cht-yangmingshan-sansa-hartebeesthoek-20260615T000000Z-360m.csv` | Row-level export for selected projection fields, source tier, station precision, model outputs, RF-chain gaps, policy thresholds, and raw payload fields. | Narrative interpretation beyond the exported payload, packet logs, or final acceptance. |
| [6] | `deliverable/selected-pair-source-evidence/external-source-reconciliation.md` | Public-source reconciliation for selected CHT/SANSA station values, source conflicts, compatible/partial verdicts, recovered Open-Elevation method, DEM/rain repair paths, and non-observable gaps. | Exact CHT facility coordinate, active route, native RF handover, packet measurements, station RF hardware truth, or formal acceptance. |
| [7] | `deliverable/3gpp-itu-references/README.md` | Retained 3GPP/ITU-R PDF map, section citations, checksums, and standards coverage for path loss, propagation delay, handover policy, rain, gas, and antenna helper references. | Operator-validated data, measured service quality, local weather, station hardware, or packet/RF test results. |
| [8] | `public/fixtures/ground-stations/multi-orbit-public-registry-sources.md` | Public station capability notes, source URLs, coordinate/elevation/band notes, registry non-claims, Open-Elevation cache method notes, and default terrain-mask note. | Commercial pair routing, active serving satellite, exact private facility geometry where not disclosed, or station RF hardware completeness. |
| [9] | `deliverable/selected-pair-source-evidence/open-elevation-selected-pair-query-2026-06-12.json` | Reproduction of selected-pair legacy elevation cache values from Open-Elevation at stored coordinates. | Official DEM tile/cell/datum/version/license metadata, terrain mask, exact CHT coordinate authority, or using SANSA legacy `1538 m` over operator `1553 m`. |
| [10] | `deliverable/selected-pair-source-evidence/copernicus-dem-selected-pair-sample-2026-06-12.json` | Selected-pair Copernicus GLO-30 comparison cells with tile, row/col, CRS, datum, license source, and sample values. | Runtime elevation replacement, full registry replacement, official station altitude, terrain horizon mask, packet/RF/route/acceptance claims. |
| [11] | `deliverable/selected-pair-source-evidence/rain-source-repair-candidates-2026-06-12.json` | Candidate public source families for future local rain calibration: NASA GPM IMERG and Taiwan CWA Anbu/Zhuzihu pages. | Any sampled local rain-rate value, measured weather during the scenario, rain attenuation validation, packet/RF/route proof. |
| [12] | `README.md` | Repo scope, data-boundary rule, command list, and pointer that selected-pair outputs are conservative modeled/public-source evidence. | Requirement coverage details or original proof; use it only for repo-level framing. |
| [13] | `public/fixtures/satellites-network/manifest.json` (opt-in `?tleSource=network`; the default demo loads the pinned `public/fixtures/satellites/…` snapshots per `demo-scenario-config.json`) | CelesTrak-sourced orbit manifest metadata, generated time, TLE/GP source policy, orbit-class record counts, and epoch ranges. | Live upstream catalog state, active serving satellite, operator assignment, service route truth, or the default delivery geometry (that is the pinned snapshot). |
| [14] | `deliverable/selected-pair-source-evidence/local-rain-calibration-2026-06-13.json` | Retained public CWA local rain statistic (stations 46691 Anbu / 46693 Yangmingshan), raw curl commands + response hashes, 149 samples each, peak 10-min increment → 5 mm/h demo preset mapping; source class public-source, model input assumed-Tier-B. | Measured-for-link weather, SANSA rainfall, scenario-window weather, long-term R0.01 calibration, or rain-attenuation validation. |
| [15] | `deliverable/selected-pair-source-evidence/copernicus-dem-selected-pair-terrain-mask-2026-06-13.json` | Selected-pair Copernicus GLO-30 elevation adoption (CHT 489 m) with tile/cell/datum provenance and terrain-mask algorithm (radial-nearest-cell-horizon-v1, 5 km radius, 500 m step, 15° azimuth) → CHT 21° / SANSA 1° with per-station checksums. | Surveyed RF horizon, clutter/vegetation/building obstruction, operator-measured CHT altitude, or full 69-row registry replacement. |
| [16] | `src/features/multi-station-selector/runtime-antenna-assumptions.ts` | The disclosed assumed Tier-B per-orbit antenna parameter set (`assumed-tier-b-antenna-params-selected-pair-v1`) wired into selected-pair RSRP/throughput. | Operator dish size, EIRP, polarization, beamwidth, antenna model, or measured antenna gain. |

## Requirement Coverage Inventory

| Requirement ID | Requirement summary | Current status | Slide-ready claim | Citation IDs | Claim boundary | Suggested slide group |
|---|---|---|---|---|---|---|
| R1-T1 / K-A1 | Integrate LEO/MEO/GEO orbit models and multi-orbit switching. | complete | The viewer integrates LEO/MEO/GEO source data and produces model-selected multi-orbit switching candidates for the selected pair. | [1] [4] [5] [7] [13] | TLE/SGP4 visibility and handover are model/public-source derived, not active serving route or RF log. | Requirement overview; handover model |
| R1-T2 / K-D1 | Integrate satellite orbit data. | complete | The selected-pair report traces the run to retained public orbit manifests and propagated actor rows. | [1] [4] [5] [13] | Manifest snapshots do not prove live upstream catalog state or operator assignment. | Orbit/TLE evidence |
| R1-T3 / K-D2 | Equivalent visual scenario presentation. | complete | Cesium viewer and retained report present the selected-pair projection, sources, visibility, handovers, and raw payload. | [1] [2] [4] [12] | Display transforms do not create new source truth. | Demo surface |
| R1-T4 / K-D3 | Interactive UI. | complete | The report/app surface exposes tabs, search, evidence detail, HTML report, and CSV export for review. | [1] [4] [12] | The retained report is not a complete UI interaction trace. | Demo surface; report/export |
| R1-T5 / K-D4 | Handover rule and parameter design. | complete | Runtime policy thresholds and model-selected handover events are disclosed in the report. | [1] [4] [5] [7] | Thresholds are modeled controls, not operator SLA or packet trace. | Handover model |
| R1-T6 / K-D5 | Communication-rate visualization design. | complete | Communication-rate related outputs are available as standards/model-derived estimates and report disclosures. | [1] [2] [4] [5] [7] | Latency, jitter, and throughput are model estimates; station RF hardware profile is still missing. | Link budget; modeled metrics |
| R1-F1 / K-E1 | Support >=500 LEO simulation actors. | complete | The retained source chain supports the >=500 LEO source-inventory claim; the selected report separates source inventory, accepted rows, runtime cap, and visible actors. | [1] [4] [5] [13] | Runtime caps and visible actor counts are not the total source inventory. | Orbit/TLE evidence |
| R1-F2 / K-E2 | Adjustable simulation speed and real-time/prerecorded windows. | complete | The project records bounded playback presets in the requirement table and the selected report records a 6-hour prerecorded window. | [1] [4] [5] | Playback preset evidence is app-surface evidence, not a row-level CSV metric. | Demo controls |
| R1-F3 / K-E3 | Real-time communicable time, originally mentioning iperf/ping tests. | partial | The selected route reports model-calculated communicable time from visibility and link-selection rules. | [1] [2] [4] [5] | No ping/iperf packet-test trace is retained; do not claim measured connection time. | Communicable time; gap appendix |
| R1-F4 / K-E4 / K-F4 | Handover strategy switching by latency/jitter/network-speed policy conditions. | complete | The selected route reports model-selected switches and cross-orbit migrations using standards-referenced policy gates. | [1] [4] [5] [7] | No operator event log, active serving route, or RF handover trace. | Handover model |
| R1-F5 / K-E5 | Statistical report export. | complete | The retained package includes a standalone HTML report and row-level CSV export with hashes. | [1] [3] [4] [5] | HTML/CSV are evidence surfaces, not final acceptance certificates. | Report/export |
| K-A4 | Input TLE data and track satellite motion. | complete | The selected projection traces TLE/OMM manifest rows into propagated actor provenance. | [1] [4] [5] [13] | Browser runtime reads bundled files only; it does not prove a live catalog connection. | Orbit/TLE evidence |
| K-E6 | Show rain attenuation impact. | complete | Rain impact is modeled from scenario rain input and retained ITU-R references. | [1] [2] [4] [5] [7] | This is not measured local weather or a calibrated rain-rate time series. | Rain/link budget |
| K-F7 | Demo scenario, prerecorded or real-time simulation. | complete | The selected-pair route and evidence package provide a reviewable demo route with retained projection output. | [1] [3] [4] [5] | Representative demo evidence is not an external acceptance threshold script. | Demo route |
| R1-D1 | 11/30 orbit model import milestone. | complete | The report discloses imported orbit-source artifacts and propagated actors for the selected window. | [1] [4] [5] [13] | This row does not, by itself, reproduce the full historical milestone package. | Milestone evidence |
| R1-D2 | 11/30 dynamic parameter UI milestone. | complete | The selected projection retains parameter values such as time window, rain input, and active policy. | [1] [4] [5] | Snapshot parameters are not a complete live-control interaction test log. | Demo controls |
| R1-D3 | 11/30 communication-time statistics. | complete | Communication-time statistics are shown in the report and exportable through CSV. | [1] [4] [5] | Statistics are model-derived, not ping/iperf or measured throughput. | Communicable time; report/export |
| R1-D4 | 11/30 stable operation for at least 24 hours. | complete | The requirement table and evidence report point to the retained 24-hour soak artifact. | [1] [4] | Opening the selected-pair report does not rerun the 24-hour soak. | Stability evidence |
| V-MO1 | Cross-orbit live handover demo, refining K-A1. | complete | The selected report can claim cross-orbit model-policy migrations for a single selected-pair projection. | [1] [4] [5] [7] | Do not call this native RF handover, active serving route migration, or operator event proof. | Handover model |
| K-A2 | Link-quality rules using latency/jitter/network-speed policy. | partial | A Tier B standards-derived substitute exists for latency/jitter/throughput policy disclosure. | [1] [2] [4] [5] [7] | No operator packet traces or private link-quality time series. | Tier B standards substitute |
| K-A3-a | Antenna parameters: peak gain, beamwidth, pattern. | partial | ITU-R S.1528/S.465-6 antenna gain is now wired into the selected-pair runtime link budget with disclosed assumed Tier-B per-orbit parameters (2026-06-13 merge). | [1] [2] [4] [5] [7] [16] | Assumed params are not operator dish/EIRP/polarization/beam; RSRP stays a relative proxy; operator RF hardware remains a gap. | Tier B standards substitute; gap appendix |
| K-A3-b | Rain attenuation model. | partial | Full ITU-R P.618-14 §2.2.1.1 path-method rain attenuation for scenario input; a retained public CWA statistic now seeds a 5 mm/h demo preset. | [1] [2] [4] [5] [7] [14] | The CWA sample is not measured-for-link weather and not an R0.01 calibration. | Rain/link budget; gap appendix |
| K-F2 | Integrate external simulation components: antenna, rain attenuation, ITU rules. | partial | Rain, gas, link-budget, handover, and now antenna (S.1528/S.465-6) model outputs are wired into the selected-pair runtime (2026-06-13 merge). | [1] [2] [4] [5] [7] [16] | Standards/assumed params cannot fill operator station RF hardware truth. | Tier B standards substitute; gap appendix |
| (irreducible-1) | Requirement packet trace for real latency/jitter time series. | source gap | Only a synthetic/model baseline can be described today. | [1] [2] [4] [5] [6] | No retained ping/iperf or equivalent packet-test time series. | Gap appendix |
| (irreducible-2) | External acceptance scenario script and pass/fail thresholds. | source gap | Representative selected-pair routes can support demo discussion, not acceptance. | [1] [2] [4] [6] | No external threshold script, scenario package, or reviewer verdict. | Gap appendix |
| (irreducible-3) | Local rain calibration constants. | partial | A retained public CWA station sample (46691/46693) maps to a conservative 5 mm/h demo preset. | [1] [2] [6] [11] [14] | Not measured-for-link weather and not an R0.01 long-term calibration. | Gap appendix |
| K-F1 | Physical network bridge through external simulator. | out of current demo scope | This is external infrastructure, not selected-pair runtime content. | [1] [2] [4] | Modeled visibility/handover cannot prove a physical bridge. | Out-of-scope infra |
| K-A5 | Linux main environment plus Windows/WSL backup. | out of current demo scope | Host-environment readiness belongs to external validation, not the selected-pair report. | [1] [4] | Not a UI/runtime projection value. | Out-of-scope infra |
| K-B1 | Windows tunneling / real-traffic satellite bridge. | out of current demo scope | The selected-pair report has no tunnel, ping path, or traffic-bridge trace. | [1] [2] [4] | No successful tunnel, interface path, or real-traffic bridge evidence is attached. | Out-of-scope infra; gap appendix |
| K-C1 | INET NAT routing and veth bridge. | out of current demo scope | NAT/veth routing evidence is an external topology artifact, not globe runtime evidence. | [1] [2] [4] | Raw projection JSON cannot prove NAT routing. | Out-of-scope infra; gap appendix |
| K-F5 | Virtual DUT testbench program. | out of current demo scope | No virtual DUT testbench artifact is part of the selected-pair package. | [1] [2] [4] | Projection data is not a testbench program. | Out-of-scope infra; gap appendix |
| K-F6 | Physical DUT / traffic-generator scenario. | out of current demo scope | No physical DUT or traffic-generator result is retained in the selected-pair package. | [1] [2] [4] | Do not claim measured throughput or traffic-generator success. | Out-of-scope infra; gap appendix |
| K-F8 | Final written report. | source gap | The selected-pair HTML can be an appendix candidate, not the formal final written report. | [1] [2] [3] [4] | No final written report package is attached. | Report-layer gap |
| R1-D5 | Technical WP1 evaluation report. | source gap | The selected-pair report can support a future WP1 report, but cannot replace it. | [1] [2] [3] [4] | No complete technical evaluation report artifact is attached. | Report-layer gap |

## Slide Claim Bank

### Requirement And Scope Claims

- The presentation should use `requirements-consolidated.md` as the 34-row
  canonical requirement spine: A=19 project demo rows, B=7 Tier B substitute or
  irreducible rows, C=8 external infrastructure/report-layer rows. [1]
- The selected-pair feature can be presented as a conservative public-source
  and model-derived demo, not as operator-private validation or active network
  proof. [2] [3] [12]
- A slide can separate functional demo delivery from strict source authority:
  many UI/model requirements are presentable, while packet/RF/weather/hardware
  evidence remains bounded or missing. [1] [2] [3]

### Selected-Pair Evidence Claims

- The retained selected-pair package covers
  `cht-yangmingshan` to `sansa-hartebeesthoek`, regenerated on
  `2026-06-13T08:45:35.391Z` (after the public-data-gap merge), with
  `geometric-derived` source tier and `cross-family-geometric` evidence kind.
  [3] [4] [5]
- The selected route spans `2026-06-15T00:00:00Z` to
  `2026-06-15T06:00:00Z` and exports both readable HTML evidence and row-level
  CSV data. [3] [4] [5]
- The selected pair can be described as visibility-derived only; no retained
  public source attests this exact CHT-SANSA pair as an operational commercial
  route. [3] [4] [6]
- The report and CSV are useful slide evidence surfaces, but they are not the
  original evidence store or a final acceptance certificate. [2] [3] [4] [5]

### Ground-Station Provenance Claims

- SANSA Hartebeesthoek can use the operator-stated altitude `1553 m` and
  bands `S/C/X/Ku`; the old `1538 m` value should appear only as a legacy
  Open-Elevation comparison. [6] [8] [9] [10]
- The SANSA coordinate is compatible with the operator-published
  Hartebeesthoek site disclosure, but coordinates alone do not prove pair
  routing or active service. [6] [8]
- The CHT Yangmingshan coordinate `25.155, 121.55` should be described as a
  representative Yangmingshan-region coordinate, not an official exact facility
  coordinate. [6] [8] [10]
- Public CHT/industry sources support operator-family GEO/MEO infrastructure
  and public CHT satellite service context, but not exact station RF hardware
  or station-level LEO service at that coordinate. [6] [8]

### Orbit And Visibility Claims

- The orbit source chain uses retained public CelesTrak-derived TLE/GP
  artifacts and manifest metadata, then computes visibility through runtime
  propagation. [2] [4] [5] [13]
- Satellite inventory, accepted runtime records, runtime caps, and visible
  actors are separate layers and should not be collapsed into one number. [4]
  [5] [13]
- Visibility windows and communicable time can be claimed as model-calculated
  outputs for the selected projection, not as successful connection uptime.
  [2] [4] [5]

### Handover And Link-Quality Claims

- Handover events in the retained package are model-selected policy events
  referenced to 3GPP TR 38.821 and V-MO1 behavior, not native RF handover logs.
  [4] [5] [7]
- The selected report can state that the route produced model-selected
  cross-orbit migrations, but it must not claim active serving satellite or
  gateway assignment. [2] [4] [5] [6]
- Latency, jitter, and throughput are modeled estimates tied to disclosed
  standards/model IDs and policy controls, not ping/iperf measurements. [2]
  [4] [5] [7]
- Selected-pair antenna output is now wired (ITU-R S.1528/S.465-6 with assumed
  Tier-B params); operator station RF hardware profile (dish/EIRP/polarization/
  beam) is still unavailable. [1] [2] [4] [7] [16]

### Rain, DEM, And Terrain Claims

- Rain attenuation can be presented as standards-derived ITU-R modeling driven
  by scenario rain input. It cannot be presented as local measured weather.
  [2] [4] [5] [7]
- Open-Elevation reproduces the selected-pair legacy elevation cache values,
  but it does not recover full DEM provenance such as tile, cell, datum,
  dataset version, or license metadata. [6] [9]
- Copernicus GLO-30 is now adopted for the selected pair: CHT elevation 489 m,
  with tile/cell/datum traceability; SANSA keeps operator-stated 1553 m (the
  Copernicus 1533 m cell stays comparison-only). [2] [6] [10] [15]
- Public-DEM-derived terrain masks are now generated for the selected pair
  (CHT 21°, SANSA 1°; 5 km radial sample, 15° azimuth, 500 m step); other
  registry rows still default to 0. These are screening proxies, not surveyed
  RF horizons. [2] [8] [10] [15]
- A retained public CWA sample (stations 46691 Anbu / 46693 Yangmingshan) now
  seeds a 5 mm/h demo preset; it is still not measured-for-link or R0.01
  calibrated rain data. NASA GPM IMERG remains a future repair candidate. [6]
  [11] [14]

### Export, Stability, And Report Claims

- The retained package includes SHA-256 hashes for the HTML report, CSV,
  smoke manifest, reconciliation file, Open-Elevation query, Copernicus sample,
  rain-source candidates, and evidence manifest. [3]
- The 24-hour stability claim should cite the retained soak artifact listed by
  the requirement/report chain; the selected-pair report does not rerun the
  soak. [1] [4]
- Final report deliverables remain separate: the selected-pair HTML can support
  an appendix, but it is not the final written report or WP1 evaluation report.
  [1] [2] [3] [4]

## Gap Appendix Draft

| Gap | Affected requirement IDs | Why public/current evidence cannot close it | Evidence needed next | Citation IDs |
|---|---|---|---|---|
| Packet latency, jitter, throughput, and loss | R1-F3 / K-E3; K-A2; (irreducible-1) | TLE/SGP4 and standards models can estimate latency/jitter/throughput anchors, but they do not observe packets. | Retained ping/iperf or equivalent logs with endpoints, directions, timestamps, duration, raw output, parsed metrics, and reviewer verdict. | [2] [4] [5] [6] |
| Native RF handover or active serving route | R1-F4 / K-E4 / K-F4; V-MO1 | Public TLE geometry and model policy cannot reveal the actual serving satellite, gateway assignment, or RF-layer migration. | Operator/RF event logs, terminal logs, lab RF trace, or active route telemetry with timestamps and interpretation. | [2] [3] [4] [6] [7] |
| Station RF hardware profile | R1-T6 / K-D5; K-A3-a; K-F2 | Public registry rows do not provide complete EIRP, gain, beamwidth, polarization, antenna model, or carrier configuration. | Row-level retained sources for each station's RF hardware profile, plus a source-placement decision for runtime/report consumption. | [2] [4] [5] [6] [8] |
| Operator station RF hardware truth | R1-T6 / K-D5; K-A3-a; K-F2 | Antenna-gain output is now wired with assumed Tier-B params, but the public registry does not provide operator EIRP, dish, polarization, beam, or antenna model. | Attach row-level retained operator RF hardware sources to swap assumed params to Tier A. | [1] [2] [4] [5] [7] [16] |
| Surveyed RF horizon / full-registry DEM | Station precision; K-F2 context | Selected-pair Copernicus DEM elevation + terrain masks are now retained and runtime-adopted (CHT/SANSA only); the full 69-row registry and surveyed RF horizons remain open. | Extend the retained DEM algorithm to all registry rows or attach surveyed/operator terrain data. | [2] [6] [9] [10] [15] |
| Exact CHT facility coordinate | Ground-station selected-pair evidence | Current public sources support a Yangmingshan-region role, not an official exact CHT-owned facility point. | Operator source, authoritative facility geometry, or reviewed public filing that ties the coordinate to the facility. | [6] [8] [10] |
| Measured-for-link weather + R0.01 calibration | K-A3-b; K-E6; (irreducible-3) | A retained public CWA sample now seeds a 5 mm/h demo preset, but it is not measured-for-this-link weather and not an R0.01/availability calibration. | Attach long-term station/grid statistics, scenario-window weather, or accepted climate calibration. | [2] [6] [7] [11] [14] |
| External acceptance scenario script and thresholds | (irreducible-2) | Representative routes can describe demo cases, but they do not define official pass/fail thresholds. | Accepted scenario package with case list, thresholds, execution command, raw output, and reviewer verdict. | [1] [2] [4] [6] |
| Physical bridge, NAT, tunnel, DUT, and traffic generator | K-F1; K-B1; K-C1; K-F5; K-F6 | The selected-pair projection is a globe/runtime model artifact. It does not exercise external network topology or test equipment. | Topology inventory, interface/NAT/route config, bridge/tunnel logs, DUT identity, traffic profile, raw traffic output, redaction policy, and reviewer verdict. | [1] [2] [4] |
| Final written report / WP1 evaluation report | K-F8; R1-D5 | The HTML evidence report is an appendix candidate and source index, not a formal written report deliverable. | Formal report package with conclusions, appendix index, cited retained artifacts, and reviewer-facing acceptance status. | [1] [2] [3] [4] |
| Tier A operator data for Bucket B | K-A2; K-A3-a; K-A3-b; K-F2 | Public standards can support Tier B model substitutes, but not operator-validated link rules, RF profiles, or local calibration. | Operator-supplied retained data, validation logs, source ownership, and swap policy from Tier B public substitute to Tier A authority. | [1] [2] [6] [7] |

## Use Notes For Deck Planning

- Keep external sources and internal engineering evidence separated in the deck.
  Source IDs `[1]` to `[13]` are compact citation anchors; the slide body should
  not paste long URLs.
- Avoid stronger wording than the claim bank. Prefer "model-calculated",
  "standards-derived", "public-source curated", "representative coordinate",
  "comparison artifact", and "source gap" where applicable.
- Do not use the selected-pair package to claim packet-test success, active
  route truth, native RF handover, station hardware truth, local measured rain,
  adopted DEM/terrain mask, external thresholds, or final written acceptance.
