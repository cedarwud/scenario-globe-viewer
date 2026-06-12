# Selected-Pair External Source Reconciliation

Status date: 2026-06-12

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
| DEM-backed elevation and terrain mask | Legacy elevation cache; terrain mask defaults to 0 | `copernicus-dem-selected-pair-sample-2026-06-12.json` retains selected-pair Copernicus GLO-30 tile/cell/datum samples. The samples differ from current project values: CHT `489 m` vs current Open-Elevation cache `470 m`; SANSA `1533 m` vs operator-stated `1553 m`. | partial | DEM traceability is now available as a comparison artifact for this selected pair, but it is not adopted into runtime values. Terrain horizon masks are still not generated. |
| Local rain calibration | Scenario rain input plus standards-derived rain model | NASA GPM IMERG is a credible precipitation source family; the page distinguishes near-real-time and production IMERG runs. CWA station-observation pages expose rainfall fields for nearby Yangmingshan-area stations such as Anbu (`46691`) and Zhuzihu (`46693`). `rain-source-repair-candidates-2026-06-12.json` records these repair candidates. | source gap | Credible repair paths exist, but this package has no retained local rain grid/statistics, station export, time period, or station/cell mapping. |
| Packet latency, jitter, throughput, loss | Modeled latency/jitter/throughput estimates only | iperf3 can produce active network measurements with throughput/loss output, but no project packet run is retained here. | not externally observable | Needs retained ping/iperf or equivalent logs with endpoints, commands, timestamps, and raw output. |
| Native RF handover or active route | Model-selected handover events | No public website can prove the live serving satellite, gateway assignment, or RF handover for this pair. | not externally observable | Needs operator/RF event logs, terminal logs, lab trace, or active route telemetry. |
| Acceptance thresholds / final written package | Report rows and representative routes | No external acceptance script, thresholds, or final written report are retained in this package. | not externally observable | The HTML report can be an appendix candidate, not the formal acceptance result. |

## Source URLs Checked

| Source | URL | Used for |
|---|---|---|
| SANSA Space Operations | https://www.sansa.org.za/products-services2/spaceoperations/ | Hartebeesthoek coordinates, altitude, public bands, facility description. |
| CHT Satellite Communication Service | https://www.cht.com.tw/en/home/cht/about-cht/products-and-services/international/satellite | CHT ST-2 GEO service, Ku/C bands, Taipei and Fang-Shan gateway earth stations. |
| Telecompaper CHT/SES O3b mPOWER article | https://www.telecompaper.com/news/chunghwa-telecom-ses-to-build-o3b-mpower-meo-satellite-ground-station-in-taiwan--1560056 | Public industry disclosure for Taiwan O3b mPOWER MEO gateway agreement. |
| CelesTrak Current GP Element Sets | https://celestrak.org/NORAD/elements/ | Public GP/TLE data method and current data formats. |
| Space-Track documentation | https://www.space-track.org/documentation | GP and GP_HISTORY API classes, query limits, historical ephemeris repair path. |
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
| Retained selected-pair Copernicus DEM sample | copernicus-dem-selected-pair-sample-2026-06-12.json | Selected-pair DEM tile/cell/datum comparison artifact; not runtime adoption. |
| Retained rain source candidates | rain-source-repair-candidates-2026-06-12.json | Candidate source register for future local rain calibration artifact. |

## Remaining Non-Observable Items

These cannot be proven by public source reconciliation alone:

- packet latency, jitter, throughput, and loss;
- native RF handover or active serving route migration;
- operator-private station RF hardware truth;
- physical bridge, NAT, DUT, or traffic-generator execution;
- external acceptance thresholds;
- final written acceptance package.
