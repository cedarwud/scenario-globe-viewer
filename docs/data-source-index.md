# Data Source Index

Status date: 2026-06-12

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
| Satellite inventory and selected actors | CelesTrak public GP/TLE snapshots, optionally imported from local cache. | `public/fixtures/satellites-network/manifest.json`; `scripts/refresh-tle.mjs`; `scripts/import-local-tle-cache.mjs` | Sources: TLE source manifest; Raw data: actor provenance | Public orbit-source snapshot parsed by the viewer. | Live upstream catalog, active serving satellite, operator route, or service assignment. | Retain refresh/import command output, manifest, TLE files, and file hashes in the presentation evidence package. |
| TLE freshness and epoch range | TLE line epochs plus manifest metadata. | `public/fixtures/satellites-network/manifest.json` | Sources: TLE freshness; Raw data | Snapshot age and TLE epoch range are recorded. | Freshness does not imply operational routing truth. | Keep the exact manifest used for the demo and record the report generation time. |
| Ground-station registry | Public operator disclosures, public filings/directories, Wikipedia, WTA profiles, and news pages curated into a registry. | `public/fixtures/ground-stations/multi-orbit-public-registry.json`; `public/fixtures/ground-stations/multi-orbit-public-registry-sources.md` | Sources: station precision and pair attribution | The station row is public-source curated with source URL, tier, and disclosure precision. | Same-site multi-orbit proof, active gateway assignment, or commercial pair routing. | Archive public pages, record access time, and attach screenshots/PDFs if review requires offline proof. |
| Coordinate authority | Public coordinate sources separated from pair capability claims. | `public/fixtures/ground-stations/multi-orbit-public-registry-coordinate-authority.json` | Sources: station precision | Coordinate source class is disclosed per station. | Coordinates alone do not prove pair capability or active routing. | Replace `mixed-public` rows with row-specific public or official coordinate evidence where available. |
| Station elevation | Public registry elevation plus legacy elevation cache when a matching cache row exists; selected-pair legacy cache values are now reproducible from Open-Elevation/SRTM 1arcsec, while selected SANSA altitude is reconciled against the operator page. A retained Copernicus GLO-30 comparison sample now provides tile/cell/datum traceability for the selected pair but is not adopted into runtime values. | `public/fixtures/ground-stations/multi-orbit-public-registry.json`; `public/fixtures/ground-stations/station-elevations-cache.json`; `scripts/refresh-station-elevation.mjs`; `deliverable/selected-pair-source-evidence/open-elevation-selected-pair-query-2026-06-12.json`; `deliverable/selected-pair-source-evidence/copernicus-dem-selected-pair-sample-2026-06-12.json`; `deliverable/selected-pair-source-evidence/external-source-reconciliation.md`; `deliverable/ground-station-elevation/th3/dem-sampling-runbook.md` | Sources: station precision; Sources: station RF profile | The repo can preserve a public/operator altitude or a service-derived cache value and state its provenance limit. The selected-pair Copernicus sample can be cited as a comparison artifact. | Runtime DEM replacement, terrain horizon truth, or measured station altitude. | Review the Copernicus value conflicts, coordinate authority, and replacement policy before adopting DEM-derived values into the 69-row cache. |
| Terrain mask | Default `0` when no site-specific horizon mask exists. The selected-pair Copernicus sample improves DEM source traceability but does not generate a local horizon mask. | `public/fixtures/ground-stations/multi-orbit-public-registry.json`; `runtime-data-completeness.ts`; `deliverable/selected-pair-source-evidence/copernicus-dem-selected-pair-sample-2026-06-12.json` | Sources: station precision | No site-specific mask is currently available. | Horizon mask measurement or local terrain clearance. | Requires a reviewed terrain/horizon algorithm and retained surrounding DEM samples, not just a station-cell elevation sample. |
| Free-space path loss | 3GPP TR 38.811 section 6.6.2 formula. | `deliverable/3gpp-itu-references/38811-f40.pdf`; `src/runtime/link-budget/free-space-path-loss.ts` | Models: modeled outputs; Sources: RF chain | Standards-derived path-loss term. | Measured received power or station-specific RF budget. | Add station RF profile and received-power source if a hardware-specific claim is needed. |
| Propagation latency | Spherical-earth slant range plus one-way propagation delay from 3GPP TR 38.811 section 6.7. | `src/features/multi-station-selector/runtime-projection.ts`; `deliverable/3gpp-itu-references/38811-f40.pdf` | Models: latency output; Requirements: K-A2/R1-F3 rows | Model-calculated one-way latency anchor. | Ping, RTT, jitter, throughput, or packet-test evidence. | Attach retained packet-test logs with endpoints, directions, times, raw command output, and reviewer verdict. |
| Rain attenuation | ITU-R P.618-14 §2.2.1.1 path method (γR=k·R^α + horizontal r0.01 + vertical ν0.01 reduction factors, Steps 2-9) + P.838-3 coefficients via repo implementation. Driven by the interactive instantaneous rain rate (a what-if input), not the R0.01 long-term statistic. | `deliverable/3gpp-itu-references/R-REC-P.618-14-202308-I!!PDF-E.pdf`; `src/runtime/link-budget/rain-attenuation.ts`; `src/features/itu-r-physics/itu-r-p838-rain-attenuation.ts` | Models: rain-impact/link-budget; Sources: atmospheric/rain lineage | Standards-derived rain impact for the scenario rain input (full P.618 path method; instantaneous rain-rate input, not R0.01). | Measured local weather or Taiwan local calibration. | Attach local rain statistics or grid source with period, station/cell id, and citation. |
| Gas absorption | ITU-R P.676-13 simplified slant-path implementation. | `deliverable/3gpp-itu-references/R-REC-P.676-13-202208-I!!PDF-E.pdf`; `src/runtime/link-budget/gas-absorption.ts` | Models: link-budget; RF chain | Standards-derived clear-air absorption. | Local atmospheric grid lookup or measured atmosphere. | Requires accepted atmospheric grid bundle or local observation source. |
| Antenna pattern | ITU-R S.1528 and S.465 helper module. | `deliverable/3gpp-itu-references/R-REC-S.1528-0-200106-I!!PDF-E.pdf`; `deliverable/3gpp-itu-references/R-REC-S.465-6-201001-I!!PDF-E.pdf`; `src/runtime/link-budget/antenna-pattern.ts` | Requirements: K-A3-a and K-F2 rows mark the selected-pair output as a gap | Standalone standards-derived helper exists. | Selected-pair runtime antenna-gain output or station hardware truth. | Wire antenna output into selected-pair payload, or attach station RF hardware sources for gain, beamwidth, pattern, EIRP, and polarization. |
| Network speed / throughput estimate | Clear-sky reference capacity with atmospheric fade de-rating. | `src/features/multi-station-selector/runtime-projection.ts`; `runtime-modeled-output.ts` | Models: throughput; Requirements: communication-rate rows | Model estimate for comparison and UI/reporting. | Measured throughput, SLA, or iperf result. | Attach real traffic test package or operator-provided performance data. |
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
| Station RF hardware profile | Public registry does not provide complete hardware truth. | Add row-level retained sources for EIRP, gain, beamwidth, polarization, frequency band, and antenna model. |
| Official DEM elevation and terrain mask | Selected-pair Copernicus GLO-30 comparison samples are retained with tile/cell/datum traceability, but runtime values are not replaced and terrain horizon masks are still absent. | Review and adopt or reject the selected-pair DEM conflicts; for terrain, generate a horizon-mask artifact from surrounding DEM samples with algorithm, radius, azimuth step, checksum, and non-claim text. |
| Local rain calibration | Standards model exists; local calibration data is not retained. `rain-source-repair-candidates-2026-06-12.json` records NASA GPM IMERG and CWA Anbu/Zhuzihu as candidate repair sources, but no sampled dataset is attached. | Add retained local rain-rate source, time period, station/grid id, and model-input mapping. |
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
- runtime-adopted DEM elevation or terrain horizon mask;
- sampled local rain calibration time series;
- final written acceptance.

## Evidence Package Recommendation

For a presentation or reviewer handoff, retain these files together:

- generated selected-pair HTML report;
- generated selected-pair CSV export;
- `deliverable/selected-pair-source-evidence/` if citing the retained
  selected-pair package generated on 2026-06-12;
- `deliverable/selected-pair-source-evidence/external-source-reconciliation.md`
  if citing public-source reconciliation or explaining source conflicts;
- `deliverable/selected-pair-source-evidence/copernicus-dem-selected-pair-sample-2026-06-12.json`
  if citing the selected-pair Copernicus DEM comparison cells;
- `deliverable/selected-pair-source-evidence/rain-source-repair-candidates-2026-06-12.json`
  if explaining available rain calibration repair sources;
- runtime raw payload if exported;
- `public/fixtures/satellites-network/manifest.json` and the referenced TLE
  files;
- `public/fixtures/ground-stations/multi-orbit-public-registry.json`;
- `public/fixtures/ground-stations/multi-orbit-public-registry-sources.md`;
- `public/fixtures/ground-stations/multi-orbit-public-registry-coordinate-authority.json`;
- `public/fixtures/ground-stations/station-elevations-cache.json`;
- `deliverable/3gpp-itu-references/README.md` plus the listed PDFs;
- retained external validation artifacts, if any are being cited.

Do not cite a stronger claim than the weakest source in the chain.
