# Data Source Index

Status date: 2026-06-13

This index records where presentation-facing numbers come from, what those
sources can prove, and what remains a source gap. It is intentionally stricter
than the UI: a value can be useful in the viewer while still being only a
model, a public-source inference, or a legacy cache value.

## Reading Rule

Use two questions for every number:

1. Where did the displayed value come from?
2. What claim can that source actually support?

The selected-pair HTML report is a readable evidence index, not the original
evidence store. Use it to navigate to source classes, model disclosures, raw
payload fields, and gaps. For final presentation evidence, retain the report
HTML, CSV, runtime payload, source fixtures, standards PDF checksums, and any
external validation artifacts together.

## Source Classes

| Class | Meaning | Valid claim | Not a valid claim |
|---|---|---|---|
| Public source | Public operator pages, public filings, public standards, CelesTrak snapshots, or public geodata used by repo-owned fixtures. | The value is traceable to a public artifact or citation. | Operator-private validation, active route truth, or measured service quality. |
| Standards-derived | A model output derived from 3GPP or ITU-R standards implemented in repo code. | The value follows the disclosed model and standard reference. | Packet-test, live RF handover, SLA, or operator telemetry. |
| Geometric-derived | TLE plus SGP4 geometry and selected-pair visibility logic. | Orbit geometry, visibility windows, and model-selected handover candidates. | Active serving satellite, gateway assignment, throughput, latency, or routing truth. |
| Display transform | Camera, label, icon, panel, and report presentation transforms. | The UI or report shows the data in a readable way. | New source evidence or stronger data truth. |
| External evidence | A retained validation run, smoke, soak, or environment package. | The retained run shows exactly what its artifact says. | Any rerun, external system behavior, or unrecorded device/network result. |
| Legacy cache | Data retained from an earlier service/cache without full upstream provenance. | The repo preserves the cached value and marks its limits. | Official DEM, official RF, operator, or measurement truth. |
| Source gap | The needed evidence is absent or not attached. | The project knows what is missing and does not upgrade the claim. | Any completed requirement that depends on the missing evidence. |

## Presentation Data Map

| Data shown or exported | Current source | Repo artifact | Report location | Can say | Cannot say | If stronger proof is needed |
|---|---|---|---|---|---|---|
| Satellite inventory and selected actors | Pinned local TLE snapshots are the default delivery/runtime geometry; CelesTrak public GP/TLE network snapshots (optionally imported from local cache) are an opt-in (`?tleSource=network`) refresh source. | `public/fixtures/satellites/…` pinned snapshots (default, per `src/features/multi-station-selector/demo-scenario-config.json`); `public/fixtures/satellites-network/manifest.json` (opt-in network); `scripts/refresh-tle.mjs`; `scripts/import-local-tle-cache.mjs` | Sources: TLE source manifest; Raw data: actor provenance | Pinned local snapshot is the default parsed source; the network snapshot is an opt-in refresh. | Live upstream catalog, active serving satellite, operator route, or service assignment. | Retain the pinned snapshots (and the network manifest/TLE files + hashes when the opt-in is exercised) in the presentation evidence package. |
| TLE freshness and epoch range | TLE line epochs plus snapshot/manifest metadata. | `src/features/multi-station-selector/demo-scenario-config.json` (pinned snapshot epoch medians, default); `public/fixtures/satellites-network/manifest.json` (opt-in network) | Sources: TLE freshness; Raw data | Snapshot age and TLE epoch range are recorded. | Freshness does not imply operational routing truth. | Keep the exact pinned snapshots used for the demo (and the network manifest when the opt-in is exercised) and record the report generation time. |
| Ground-station registry | Public operator disclosures, public filings/directories, Wikipedia, WTA profiles, and news pages curated into a registry. | `public/fixtures/ground-stations/multi-orbit-public-registry.json`; `public/fixtures/ground-stations/multi-orbit-public-registry-sources.md` | Sources: station precision and pair attribution | The station row is public-source curated with source URL, tier, and disclosure precision. | Same-site multi-orbit proof, active gateway assignment, or commercial pair routing. | Archive public pages, record access time, and attach screenshots/PDFs if review requires offline proof. |
| Coordinate authority | Public coordinate sources separated from pair capability claims. | `public/fixtures/ground-stations/multi-orbit-public-registry-coordinate-authority.json` | Sources: station precision | Coordinate source class is disclosed per station. | Coordinates alone do not prove pair capability or active routing. | Replace `mixed-public` rows with row-specific public or official coordinate evidence where available. |
| Station elevation | Public registry elevation plus row-level elevation cache metadata. For the selected pair, CHT adopts retained Copernicus GLO-30 public DEM elevation `489 m` because no operator-stated site altitude is retained for the representative coordinate; SANSA keeps operator-stated altitude `1553 m` while the Copernicus `1533 m` cell remains comparison/terrain context. Other registry rows remain legacy/public-cache scoped. | `public/fixtures/ground-stations/multi-orbit-public-registry.json`; `public/fixtures/ground-stations/station-elevations-cache.json`; `deliverable/selected-pair-source-evidence/copernicus-dem-selected-pair-sample-2026-06-12.json`; `deliverable/selected-pair-source-evidence/copernicus-dem-selected-pair-terrain-mask-2026-06-13.json`; `deliverable/selected-pair-source-evidence/external-source-reconciliation.md`; `deliverable/ground-station-elevation/th3/dem-sampling-runbook.md` | Sources: station precision; Sources: station RF profile | The selected-pair elevation values have disclosed public/operator provenance and tile/cell/datum traceability where DEM-derived. | Operator-measured CHT altitude, surveyed station altitude, or full 69-row DEM replacement. | Attach operator altitude or accepted DEM replacement policy if stronger station-altitude truth is needed beyond this selected-pair slice. |
| Terrain mask | Selected-pair stations now carry public Copernicus DEM-derived terrain masks: CHT `21°`, SANSA `1°`, computed from a 5 km radial sample (15° azimuth, 500 m radial step). Registry rows outside the selected pair still default to `0` when no site-specific horizon mask exists. | `public/fixtures/ground-stations/multi-orbit-public-registry.json`; `runtime-data-completeness.ts`; `deliverable/selected-pair-source-evidence/copernicus-dem-selected-pair-terrain-mask-2026-06-13.json`; `deliverable/selected-pair-source-evidence/copernicus-dem-selected-pair-sample-2026-06-12.json` | Sources: station precision | A public-DEM-derived terrain screening mask is available for the selected pair and is applied to runtime effective elevation thresholds. | Surveyed RF horizon, local clutter/vegetation/building obstruction, or full-registry terrain masks. | Attach surveyed horizon data or extend the reviewed DEM sampling algorithm to all registry rows if stronger terrain truth is needed. |
| Free-space path loss | 3GPP TR 38.811 section 6.6.2 formula. | `deliverable/3gpp-itu-references/38811-f40.pdf`; `src/runtime/link-budget/free-space-path-loss.ts` | Models: modeled outputs; Sources: RF chain | Standards-derived path-loss term. | Measured received power or station-specific RF budget. | Add station RF profile and received-power source if a hardware-specific claim is needed. |
| Propagation latency | Spherical-earth slant range from 3GPP TR 38.811 §6.6.2 plus one-way propagation delay treatment from clause 5.3.1.1. | `src/features/multi-station-selector/runtime-projection.ts`; `deliverable/3gpp-itu-references/38811-f40.pdf` | Models: latency output; Requirements: K-A2/R1-F3 rows | Model-calculated one-way latency anchor. | Ping, RTT, jitter, throughput, or packet-test evidence. | Attach retained packet-test logs with endpoints, directions, times, raw command output, and reviewer verdict. |
| Rain attenuation | ITU-R P.618-14 §2.2.1.1 path method (γR=k·R^α + horizontal r0.01 + vertical ν0.01 reduction factors, Steps 2-9) + P.838-3 coefficients via repo implementation. Driven by the interactive instantaneous rain rate (a what-if input), not the R0.01 long-term statistic. | `deliverable/3gpp-itu-references/R-REC-P.618-14-202308-I!!PDF-E.pdf`; `src/runtime/link-budget/rain-attenuation.ts`; `src/features/itu-r-physics/itu-r-p838-rain-attenuation.ts` | Models: rain-impact/link-budget; Sources: atmospheric/rain lineage | Standards-derived rain impact for the scenario rain input (full P.618 path method; instantaneous rain-rate input, not R0.01). | Measured local weather or Taiwan local calibration. | Attach long-term local rain statistics or scenario-window weather source if a stronger climate or measured-weather claim is needed. |
| Local rain statistic / demo rain preset | Public Taiwan CWA 24-hour station observations retained for nearby Yangmingshan-area stations 46691 and 46693. Peak 10-minute station increments were converted to hourly-equivalent rain rate and rounded to the viewer slider step, yielding a conservative 5 mm/h demo preset. | `deliverable/selected-pair-source-evidence/local-rain-calibration-2026-06-13.json`; `deliverable/selected-pair-source-evidence/rain-source-repair-candidates-2026-06-12.json` | Sources: atmospheric/rain lineage; Missing evidence register: local-rain-calibration boundary | A public local rain statistic can seed a realistic scenario rain-rate preset. | Measured weather for the CHT-SANSA link, SANSA rainfall, 2026-05-17 scenario-window weather, or long-term R0.01 calibration. | Attach long-term station/grid statistics or scenario-window weather source if a stronger climate or measured-weather claim is needed. |
| Gas absorption | ITU-R P.676-13 simplified slant-path implementation. | `deliverable/3gpp-itu-references/R-REC-P.676-13-202208-I!!PDF-E.pdf`; `src/runtime/link-budget/gas-absorption.ts` | Models: link-budget; RF chain | Standards-derived clear-air absorption. | Local atmospheric grid lookup or measured atmosphere. | Requires accepted atmospheric grid bundle or local observation source. |
| Antenna pattern | ITU-R S.1528-0 Annex 1 and ITU-R S.465-6 antenna gain models are wired into selected-pair link-budget RSRP/throughput with disclosed Tier-B assumed per-orbit parameters (`assumed-tier-b-antenna-params-selected-pair-v1`). Earth-station S.465 validation uses the carrier when it is within 2-31 GHz; MEO L-band uses the 2 GHz lower-bound reference for antenna-pattern validation only, not for FSPL carrier truth. | `deliverable/3gpp-itu-references/R-REC-S.1528-0-200106-I!!PDF-E.pdf`; `deliverable/3gpp-itu-references/R-REC-S.465-6-201001-I!!PDF-E.pdf`; `src/runtime/link-budget/antenna-pattern.ts`; `src/features/multi-station-selector/runtime-antenna-assumptions.ts`; `src/features/multi-station-selector/runtime-projection.ts`; `runtime-modeled-output.ts` | Requirements: K-A3-a/K-F2; Models: link-budget/throughput; Models: RF chain; Sources: source gaps | Standards-derived antenna-pattern behavior is represented in the selected-pair runtime model. | Operator station RF hardware, real dish size, EIRP, polarization, beam assignment, or measured antenna gain. | Attach station RF hardware sources for gain, beamwidth, pattern, EIRP, polarization, frequency band, and antenna model if stronger hardware truth is needed. |
| Network speed / throughput estimate | Clear-sky reference capacity with atmospheric fade plus assumed antenna off-axis de-rating. | `src/features/multi-station-selector/runtime-projection.ts`; `runtime-modeled-output.ts`; `runtime-antenna-assumptions.ts` | Models: throughput; Requirements: communication-rate rows | Model estimate for comparison and UI/reporting, including disclosed assumed antenna parameters. | Measured throughput, SLA, or iperf result. | Attach real traffic test package or operator-provided performance data. |
| Jitter estimate | Orbit baseline with rain scale. | `runtime-modeled-output.ts`; `src/features/multi-station-selector/runtime-projection.ts` | Models: jitter; Requirements: K-A2 | Model estimate only. | Packet jitter measurement. | Attach packet-test time series. |
| Communicable time | Visibility windows plus selected-pair link-selection policy. | `src/features/multi-station-selector/runtime-projection.ts`; report raw `communicationStats` | Summary; Visibility; Raw data; Requirements R1-F3/R1-D3 | Model-calculated available time for the selected projection. | Successful connection time, ping/iperf uptime, or operator availability. | Attach packet-test logs or operational telemetry. |
| Handover events | 3GPP TR 38.821 section 7.3-inspired policy plus V-MO1 behavior, using model candidates. | `deliverable/3gpp-itu-references/38821-g20.pdf`; `src/runtime/link-budget/handover-policy.ts`; `runtime-projection.ts` | Handover; Models: policy gates; Requirements R1-F4/V-MO1 | Model-selected link changes and cross-orbit migration events. | Native RF handover, active route migration, or operator event log. | Attach real handover log, RF trace, or operator routing event source. |
| Representative selected-pair demo baselines | Retained repo baseline list for five demo pair cases. | `src/features/multi-station-selector/v4-projection-wave1-baselines.ts` | Requirements: irreducible-2 row; Report route parameters | The repo preserves representative pair routes and expected model output anchors. | External acceptance scenario package, pass/fail thresholds, or customer-approved test script. | Attach an accepted scenario script with threshold definitions, execution command, raw output, and reviewer verdict. |
| Pair source tier | Pair attestation gate. Explicit pair attestation is required for public-disclosed pair capability; otherwise geometric-derived. | `src/features/multi-station-selector/tier-inference.ts`; `public/fixtures/ground-stations/multi-orbit-public-registry.json` | Sources: pair source attribution | Current pair tier is computed conservatively. | Same operator family alone does not prove public-disclosed pair capability. | Add explicit public pair attestation rows with source URL and citation. |
| External bridge, NAT, DUT, traffic generator | Current retained packages are partial/fail or missing. | `output/validation/external-v02-v06/...`; `selected-pair-report-evidence-manifest.ts` | Sources: external evidence register; Sources: source gaps | These are known external evidence gaps. | Successful tunnel, bridge, NAT, DUT, or traffic-generator validation. | Run and retain real topology, command transcripts, raw traffic results, redaction policy, and reviewer verdict. |
| Report HTML and CSV | Generated from current selected-pair projection payload. | `src/features/multi-station-selector/runtime-projection-evidence-report.ts`; `runtime-projection-csv.ts` | Whole report; CSV export | Readable evidence index and row-level export for the selected projection. | Original evidence store or final acceptance certificate. | Retain report HTML, CSV, raw payload, and referenced source artifacts together. |

## Source Gap Repair Plan

| Gap | Current status | Repair path |
|---|---|---|
| Packet latency, jitter, throughput, and loss | Not proven by current model outputs. | Run packet tests, retain commands, endpoints, timestamps, raw logs, parsed metrics, and reviewer verdict. |
| Native RF handover or active routing | Not proven by geometry or policy output. | Attach operator/RF event logs, active serving link evidence, or a lab trace that records the route migration. |
| Station RF hardware profile | Selected-pair runtime now has standards-derived antenna-pattern model output with assumed Tier-B parameters, but public registry does not provide complete operator hardware truth. | Add row-level retained sources for EIRP, gain, beamwidth, polarization, frequency band, and antenna model if operator-hardware truth is needed. |
| Official DEM elevation and terrain mask | Selected-pair Copernicus GLO-30 elevation adoption and terrain masks are retained and runtime-adopted for CHT/SANSA only. Full 69-row registry replacement remains out of scope. | Extend the retained algorithm to every station or attach surveyed/operator terrain data if full-registry DEM/terrain truth is needed. |
| Local rain calibration | A retained public CWA station-observation sample now maps nearby Yangmingshan-area stations 46691/46693 to a conservative 5 mm/h demo preset. This repairs the "no sampled public local statistic" gap, but it is not measured-for-this-link weather and it is not an R0.01/availability calibration. The live CWA endpoint identifies station 46693 as Yangmingshan, while the older repair-candidate note labeled it as Zhuzihu. | Add long-term station/grid statistics, scenario-window weather source, or accepted climate calibration if a stronger local-rain claim is needed. |
| External bridge/NAT/DUT/traffic generator validation | Existing retained output is partial or missing for final proof. | Re-run external topology validation and retain raw commands, network config, traffic output, and result summary. |
| Acceptance scenario thresholds | Representative baseline routes exist, but no external threshold script is retained. | Add accepted scenario package with thresholds, command, raw output, and pass/fail verdict. |

## Report HTML Checklist

The selected-pair report can be used to find:

- `Requirements`: requirement row, current answer/value, source strength,
  evidence location, and source gap.
- `Sources`: pair source attribution, station precision, TLE source manifest,
  atmospheric lookup status, station RF profile, and source gaps.
- `Models`: model ids, standards references, input summaries, output units, and
  non-claims.
- `Raw data`: the runtime payload used to render the report.
- `CSV`: row-level export carrying source/provenance/non-claim columns.

Running `npm run test:m8a-v4.11:slice5` retains the generated report HTML, CSV,
manifest, and screenshot under `output/selected-pair-source-report/`.
The currently retained delivery copy is
`deliverable/selected-pair-source-evidence/`.
Its public-source reconciliation and source-conflict log is
`deliverable/selected-pair-source-evidence/external-source-reconciliation.md`.

The report cannot, by itself, prove:

- packet-test latency, jitter, throughput, or loss;
- native RF handover;
- active serving satellite or gateway assignment;
- station RF hardware profile;
- full-registry DEM elevation replacement or surveyed terrain horizon mask;
- measured link-local rain time series or long-term R0.01 calibration;
- final written acceptance.

## Evidence Package Recommendation

For a presentation or reviewer handoff, retain these files together:

- generated selected-pair HTML report;
- generated selected-pair CSV export;
- `deliverable/selected-pair-source-evidence/` if citing the retained
  selected-pair package regenerated on 2026-06-13;
- `deliverable/selected-pair-source-evidence/external-source-reconciliation.md`
  if citing public-source reconciliation or explaining source conflicts;
- `deliverable/selected-pair-source-evidence/copernicus-dem-selected-pair-sample-2026-06-12.json`
  if citing the selected-pair Copernicus DEM comparison cells;
- `deliverable/selected-pair-source-evidence/copernicus-dem-selected-pair-terrain-mask-2026-06-13.json`
  if citing the selected-pair public-DEM-derived terrain mask algorithm,
  radius, azimuth step, samples, and checksum;
- `deliverable/selected-pair-source-evidence/rain-source-repair-candidates-2026-06-12.json`
  if explaining available rain calibration repair sources;
- `deliverable/selected-pair-source-evidence/local-rain-calibration-2026-06-13.json`
  if citing the retained public CWA local rain statistic or 5 mm/h demo
  rain-rate preset;
- runtime raw payload if exported;
- `public/fixtures/satellites/…` pinned TLE snapshots (default, per
  `demo-scenario-config.json`) and, when the `?tleSource=network` opt-in is used,
  `public/fixtures/satellites-network/manifest.json` plus the referenced TLE files;
- `public/fixtures/ground-stations/multi-orbit-public-registry.json`;
- `public/fixtures/ground-stations/multi-orbit-public-registry-sources.md`;
- `public/fixtures/ground-stations/multi-orbit-public-registry-coordinate-authority.json`;
- `public/fixtures/ground-stations/station-elevations-cache.json`;
- `deliverable/3gpp-itu-references/README.md` plus the listed PDFs;
- `src/features/multi-station-selector/runtime-antenna-assumptions.ts` if
  citing the selected-pair assumed Tier-B antenna parameter set;
- retained external validation artifacts, if any are being cited.

Do not cite a stronger claim than the weakest source in the chain.
