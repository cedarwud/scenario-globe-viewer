# Selected-Pair External Source Reconciliation

Status date: 2026-06-13

This file records the external-source reconciliation for the retained
selected-pair evidence package:

`/?stationA=cht-yangmingshan&stationB=sansa-hartebeesthoek&startUtc=2026-05-17T00%3A00%3A00.000Z&durationMinutes=360`

The purpose is to separate values that can be checked against public sources
from values that still require measurement, operator logs, or lab artifacts.
The HTML report must reference this file through the External evidence
register so the readable report and retained source package stay aligned.

## Verdict Legend

| Verdict | Meaning |
|---|---|
| verified | The repo value or claim is directly supported by the retained/local source chain and a public source. |
| compatible | The repo value is close enough for a public display/model input after precision limits are stated. |
| partial | The public source supports only part of the repo value or claim. |
| source conflict | The public source conflicts with the repo value; presentation should use the public source or label the repo value as legacy. |
| source gap | A credible repair source exists, but this package has not retained the sampled value or run. |
| not externally observable | Public websites cannot prove the value; it needs packet traces, RF logs, operator records, or lab output. |

## Reconciliation Table

| Data item | Repo value / claim | External source check | Verdict | Action / presentation boundary |
|---|---|---|---|---|
| SANSA Hartebeesthoek coordinates | `-25.8872, 27.7075` in `multi-orbit-public-registry.json` | SANSA gives Hartebeesthoek as `25 deg 53' South, 27 deg 42' East`, about `-25.8833, 27.7000`. Difference is about 0.86 km, within site-level public coordinate precision. | compatible | Can cite as public operator-web coordinate with precision boundary. Coordinates do not prove pair routing. |
| SANSA Hartebeesthoek elevation | `1538 m` in registry/cache before this reconciliation | SANSA page gives site altitude `1553 m`. | source conflict | Registry was updated to `1553 m` and source notes now name the operator page. The legacy elevation cache remains a source-gap artifact because it does not carry official DEM or operator-altitude metadata. |
| Legacy selected-pair elevation cache source method | `470 m` for CHT and old `1538 m` for SANSA in `station-elevations-cache.json` | Repo tooling uses Open-Elevation at `https://api.open-elevation.com/api/v1/lookup`, registry source notes state the values come from SRTM 1arcsec via that script, and a retained 2026-06-12 query reproduces both legacy cache values exactly. | verified | This recovers the likely source method for the legacy elevation cache. It still does not recover tile id, cell id, vertical datum, dataset version, or license metadata. |
| SANSA supported bands | `S/X/Ku/Ka` before this reconciliation | SANSA page lists antenna systems covering `S/C/X/Ku`. | source conflict | Registry was updated to `S/C/X/Ku`. No Ka claim should be made for this station unless another retained source is added. |
| SANSA orbit classes | `LEO/MEO/GEO` | SANSA page describes Hartebeesthoek support for geo-synchronous, polar-orbiting, scientific spacecraft and the local registry source note records LEO/MEO/GEO support. | verified | Supports station-level multi-orbit capability only. It does not prove this selected pair is operational. |
| CHT gateway infrastructure | `cht-yangmingshan`, representative northern Taiwan coordinate, `C/Ku/Ka`, operator-family LEO/MEO/GEO capability | CHT official page states ST-2 with Ku/C coverage and two gateway earth stations in Taipei and Fang-Shan. Telecompaper reports a CHT/SES O3b mPOWER MEO gateway agreement in Taiwan. Public pages also describe a Yangmingshan satellite receiving/relay role and a satellite communication center in the Jingque/Yangmingshan area, but no exact CHT-owned coordinate page was found. | partial | Supports operator-family GEO/MEO infrastructure, public CHT satellite service, and a Yangmingshan-area role. Exact Yangmingshan coordinate, exact RF hardware, and station-level LEO service remain source-limited. |
| CHT representative coordinate | `25.155, 121.55` | Additional search found broad public Yangmingshan satellite-receiving / satellite-communication-center references, but no official source for this exact point and no authoritative facility geometry. | partial | Treat as a representative Yangmingshan-region coordinate, not an official site coordinate. The elevation value at this coordinate is now reproducible from Open-Elevation. |
| Selected CHT-SANSA pair capability | `sourceTier=geometric-derived`, `evidenceKind=cross-family-geometric` | No public source found that attests this exact CHT-SANSA pair or an active commercial route between these sites. | verified | The report's conservative `geometric-derived` label is correct. Do not present this as public-disclosed pair capability. |
| TLE / actor source method | CelesTrak GP/TLE snapshots in `public/fixtures/satellites-network/manifest.json` | CelesTrak publishes current GP data with TLE/OMM/JSON/CSV access. Space-Track documents GP and GP_HISTORY as the current/historical ephemeris classes. | verified | Source method is public and valid. This reconciliation does not refetch the exact May 2026 snapshot; cite the retained local manifest and file hashes for the actual demo run. |
| Standards-derived path loss, rain, gas, handover policy | 3GPP / ITU-R model implementations with retained PDF checksums | Retained standards PDFs and checksums are listed in `deliverable/3gpp-itu-references/README.md`. | verified | Good for model provenance. Standards do not prove packet performance, active routing, or station hardware truth. |
| Antenna-pattern runtime model | Selected-pair link budget applies ITU-R S.1528/S.465-6 with `assumed-tier-b-antenna-params-selected-pair-v1` | Retained S.1528/S.465-6 PDFs are listed in `deliverable/3gpp-itu-references/README.md`; the assumption set is retained in `src/features/multi-station-selector/runtime-antenna-assumptions.ts` and surfaced through modeled outputs / RF-chain disclosure. Earth-station S.465 validation uses the carrier when it is within 2-31 GHz; MEO L-band uses the 2 GHz lower-bound reference for antenna-pattern validation only, not for FSPL carrier truth. | partial | Can cite standards-derived selected-pair antenna-pattern model behavior with assumed Tier-B parameters. Do not present the assumed gains, beamwidths, dish sizes, off-axis angles, or RSRP/throughput outputs as operator RF hardware, measured antenna gain, station EIRP, polarization, or service performance. |
| DEM-backed elevation and terrain mask | Selected-pair CHT elevation `489 m`, SANSA elevation `1553 m`; terrain masks CHT `21°`, SANSA `1°` | `copernicus-dem-selected-pair-sample-2026-06-12.json` retains selected-pair Copernicus GLO-30 tile/cell/datum samples. `copernicus-dem-selected-pair-terrain-mask-2026-06-13.json` retains a 5 km radial DEM horizon sample (15° azimuth, 500 m radial step) with per-station sample checksums. Policy: operator-stated altitude wins where available, so SANSA remains `1553 m`; CHT has no retained operator-stated altitude for the representative coordinate, so the retained Copernicus `489 m` cell is adopted for this selected-pair fixture row. | partial | Can cite public-DEM-derived selected-pair elevation/terrain screening for runtime thresholds. Do not present it as operator-measured CHT altitude, surveyed RF horizon, local clutter truth, or full 69-row registry replacement. |
| Local rain calibration | Scenario rain input plus standards-derived rain model; retained public CWA statistic maps a 5 mm/h demo preset | `local-rain-calibration-2026-06-13.json` retains CWA 24-hour station-observation HTML samples for nearby Yangmingshan-area stations `46691` and `46693`, sampled over `2026-06-12T06:50:00Z` to `2026-06-13T07:40:00Z`. Both stations show 7.5 mm retained-window increments; peak 10-minute increments of 0.5 mm map to 3 mm/h hourly equivalent, rounded to the viewer's 5 mm/h slider step. The live CWA endpoint identifies `46693` as Yangmingshan, while the older candidate register labeled it as Zhuzihu. | partial | Can cite a retained public local rain statistic and a conservative 5 mm/h demo preset. Do not present it as measured weather for the CHT-SANSA link, SANSA rainfall, 2026-05-17 scenario-window weather, long-term R0.01 calibration, or rain attenuation validation. |
| Packet latency, jitter, throughput, loss | Modeled latency/jitter/throughput estimates only | iperf3 can produce active network measurements with throughput/loss output, but no project packet run is retained here. | not externally observable | Needs retained ping/iperf or equivalent logs with endpoints, commands, timestamps, and raw output. |
| Native RF handover or active route | Model-selected handover events | No public website can prove the live serving satellite, gateway assignment, or RF handover for this pair. | not externally observable | Needs operator/RF event logs, terminal logs, lab trace, or active route telemetry. |
| Acceptance thresholds / final written package | Report rows and representative routes | No external acceptance script, thresholds, or final written report are retained in this package. | not externally observable | The HTML report can be an appendix candidate, not the formal acceptance result. |

## Source URLs Checked

| Source | URL | Used for |
|---|---|---|
| SANSA Space Operations | https://www.sansa.org.za/programmes/space-operations/ | Hartebeesthoek coordinates, altitude, public bands, facility description. |
| CHT Satellite Communication Service | https://www.cht.com.tw/en/home/cht/about-cht/products-and-services/international/satellite | CHT ST-2 GEO service, Ku/C bands, Taipei and Fang-Shan gateway earth stations. |
| Telecompaper CHT/SES O3b mPOWER article | https://www.telecompaper.com/news/chunghwa-telecom-ses-to-build-o3b-mpower-meo-satellite-ground-station-in-taiwan--1560056 | Public industry disclosure for Taiwan O3b mPOWER MEO gateway agreement. |
| CelesTrak Current GP Element Sets | https://celestrak.org/NORAD/elements/ | Public GP/TLE data method and current data formats. |
| Space-Track documentation | https://www.space-track.org/documentation | GP and GP_HISTORY API classes, query limits, historical ephemeris repair path. |
| Retained ITU-R S.1528-0 PDF | ../3gpp-itu-references/R-REC-S.1528-0-200106-I!!PDF-E.pdf | Satellite antenna-pattern model reference for assumed selected-pair antenna terms. |
| Retained ITU-R S.465-6 PDF | ../3gpp-itu-references/R-REC-S.465-6-201001-I!!PDF-E.pdf | Earth-station antenna-pattern model reference for assumed selected-pair antenna terms. |
| Selected-pair antenna assumption module | ../../src/features/multi-station-selector/runtime-antenna-assumptions.ts | Disclosed Tier-B default antenna parameters used by the selected-pair runtime model; not operator RF hardware truth. |
| Copernicus DEM | https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM | DEM repair path for elevation/terrain mask. |
| AWS Open Data Copernicus DEM | https://registry.opendata.aws/copernicus-dem/ | Public GLO-30 COG distribution used by the retained selected-pair DEM comparison artifact. |
| Copernicus DEM COG README | https://copernicus-dem-30m.s3.amazonaws.com/readme.html | COG tile structure, GLO-30 grid dimensions, tile naming, and license pointer used by the retained selected-pair DEM comparison artifact. |
| NASA GPM data | https://gpm.nasa.gov/data | Rain/precipitation repair path. |
| iperf3 documentation | https://software.es.net/iperf/ | Packet-throughput measurement tool class; not proof of a run. |
| Open-Elevation selected-pair query | https://api.open-elevation.com/api/v1/lookup?locations=-25.8872,27.7075%7C25.155,121.55 | Second-pass retained query reproducing legacy elevation cache values for the selected pair. |
| OpenStreetMap / Nominatim checks | https://nominatim.openstreetmap.org/search | Second-pass search for exact Yangmingshan satellite communication center coordinates; no usable exact facility point was found. |
| Taiwan communications overview | https://zh.wikipedia.org/wiki/%E5%8F%B0%E7%81%A3%E9%80%9A%E8%A8%8A%E6%A5%AD | Public secondary reference for a Yangmingshan satellite receiving station; not exact coordinate evidence. |
| Jingque locality page | https://zh.wikipedia.org/wiki/%E8%8F%81%E7%A4%90 | Public secondary reference listing an International Telecommunications Administration satellite communication center in the Jingque/Yangmingshan area; not exact coordinate evidence. |
| CWA Anbu station observations | https://www.cwa.gov.tw/V8/C/W/OBS_Station.html?ID=46691 | Candidate local rainfall observation source for a future Yangmingshan rain-calibration artifact. |
| CWA Zhuzihu station observations | https://www.cwa.gov.tw/V8/C/W/OBS_Station.html?ID=46693 | Candidate local rainfall observation source for a future Yangmingshan rain-calibration artifact. |
| CWA Anbu 24-hour station observation HTML | https://www.cwa.gov.tw/V8/C/W/Observe/MOD/24hr/46691.html | Retained public local rainfall statistic for the 2026-06-13 CWA sample artifact. |
| CWA station 46693 24-hour station observation HTML | https://www.cwa.gov.tw/V8/C/W/Observe/MOD/24hr/46693.html | Retained public local rainfall statistic; live endpoint labels station 46693 as Yangmingshan, despite the older repair-candidate note naming Zhuzihu. |
| Retained selected-pair Copernicus DEM sample | copernicus-dem-selected-pair-sample-2026-06-12.json | Selected-pair DEM tile/cell/datum comparison artifact; not runtime adoption. |
| Retained selected-pair Copernicus terrain mask | copernicus-dem-selected-pair-terrain-mask-2026-06-13.json | Selected-pair DEM-derived terrain-mask artifact; CHT 21 deg, SANSA 1 deg; not a surveyed RF horizon. |
| Retained rain source candidates | rain-source-repair-candidates-2026-06-12.json | Candidate source register for future local rain calibration artifact. |
| Retained local CWA rain statistic | local-rain-calibration-2026-06-13.json | Public local rain statistic mapped to a 5 mm/h scenario input preset; not measured-for-link weather. |

## Remaining Non-Observable Items

These cannot be proven by public source reconciliation alone:

- packet latency, jitter, throughput, and loss;
- native RF handover or active serving route migration;
- operator-private station RF hardware truth;
- physical bridge, NAT, DUT, or traffic-generator execution;
- external acceptance thresholds;
- final written acceptance package.
