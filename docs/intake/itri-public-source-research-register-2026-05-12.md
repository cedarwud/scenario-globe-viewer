# customer Public Source Research Register

Date: 2026-05-12

Accessed date for all retained sources: 2026-05-12.

Scope:

- First-round public-source intake for customer unclosed requirements.
- Official or first-party public sources only.
- Public sources are treated as context, method, standards, or service
  evidence. They are not project closure evidence unless explicitly marked.

## Requirement Mapping

| Requirement group | Retained public-source support | Implementation authority result |
| --- | --- | --- |
| F-01 customer orbit model integration | customer public NTN/LEO context pages, 3GPP NTN context, CelesTrak/Space-Track orbital proxy context, ESTNeT context. | Not enough. Requires customer private model spec/package and validation vectors. |
| F-07/F-08 communication time/statistics | INET PingApp, INET throughput showcase, iPerf official docs, RFC 792 protocol basis, RFC 6349 method context. | Not enough for closure. Useful for measurement method and parser planning only. |
| F-09 measured rate/throughput | INET throughput showcase, iPerf official docs, RFC 6349 method context, operator service context. | Not enough for closure. Requires retained measured project transcripts. |
| F-10/F-11 policy/rule control | 3GPP NTN/NR documents support trigger and handover taxonomy only. No public source defines customer handover policy/rule semantics. | Not enough. Requires customer policy/rule authority. |
| F-13 `>=500 LEO` | Eutelsat OneWeb constellation page and CelesTrak/Space-Track public orbital sources support public constellation/proxy context. The route now also has a repo-local fixture/model-backed readiness/demo surface, documented separately, with no public-source retrieval used. | Not route-native closure/proof and not customer authority acceptance. Requires explicit customer acceptance or route-native/authority-controlled scale evidence for closure. |
| F-16 external report-system export | No public source defines the target external report system. | Not enough. Requires customer report-system contract. |
| F-17/P-01/P-02/P-03 physical/rain/antenna/ITU | ITU-R recommendations provide standards authority. | Useful standards authority, but requires customer/V-group parameters and chosen rec versions. |
| V-02..V-06 external testbed | INET/OMNeT++ emulation, NAT/routing, PingApp, throughput docs, Microsoft WSL/Hyper-V docs, RFC method docs, and NE-ONE product docs support testbed planning. | Not enough for closure. Requires retained testbed logs, configs, and traffic/DUT output. |

## Verified Sources

### INET / OMNeT++ Sources

| ID | URL | Accessed date | Source owner | Requirement mapping | What it supports | What it does not support | Credibility | Summary | Enough for implementation authority |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| INET-01 | https://inet.omnetpp.org/docs/users-guide/ch-emulation.html | 2026-05-12 | INET Framework / OMNeT++ documentation | V-02, V-03, V-04, V-05, V-06, F-07/F-08/F-09 method context | Official INET emulation concepts for connecting simulations with external networks and running with real-time constraints. | Does not provide customer ESTNeT topology, tunnel endpoints, NAT rules, or pass evidence. | High for INET behavior. Not project evidence. | Use as method context for an external validation harness and for terminology around simulation-to-real-network attachment. | No. It supports testbed design only. |
| INET-02 | https://doc.omnetpp.org/inet/api-current/neddoc/inet.emulation.linklayer.ethernet.ExtLowerEthernetInterface.html | 2026-05-12 | INET Framework / OMNeT++ NED API docs | V-03, V-04 | Official NED docs for an external lower Ethernet interface used to connect simulated network elements to a real network interface. | Does not prove the customer route has a configured tunnel/bridge or real traffic. | High for API reference. | Useful when designing an ESTNeT/INET bridge evidence run. | Partly for implementation of an INET-side bridge, not for customer closure. |
| INET-03 | https://doc.omnetpp.org/inet/api-current/neddoc/inet.linklayer.tun.Tun.html | 2026-05-12 | INET Framework / OMNeT++ NED API docs | V-03 | Official TUN module reference relevant to tunnel-style packet paths. | Does not specify customer `tun0/tun1`, `tun_bridge.py`, Windows/WSL, or traffic proof. | High for API reference. | Supports local modeling of TUN-style interfaces. | Partly for prototype design, not closure. |
| INET-04 | https://doc.omnetpp.org/inet/api-current/neddoc/inet.networklayer.ipv4.Ipv4NatTable.html | 2026-05-12 | INET Framework / OMNeT++ NED API docs | V-04 | Official INET NAT table reference. | Does not supply customer NAT rules, veth addresses, gateway mapping, or successful traffic transcript. | High for API reference. | Supports a NAT/routing testbed design and artifact checklist. | Partly for INET NAT implementation, not closure. |
| INET-05 | https://inet.omnetpp.org/docs/tutorials/configurator/doc/index.html | 2026-05-12 | INET Framework / OMNeT++ documentation | V-04 | Official INET network configurator tutorial for addresses and routing setup. | Does not prove ESTNeT-to-real-network routing was configured or passed. | High for INET routing configuration. | Useful for designing reproducible route/interface capture. | Partly for local INET configuration, not closure. |
| INET-06 | https://doc.omnetpp.org/inet/api-current/neddoc/inet.applications.pingapp.PingApp.html | 2026-05-12 | INET Framework / OMNeT++ NED API docs | F-07/F-08, V-03, V-04 | Official PingApp reference for ping-style simulation traffic. | Does not produce retained project ping results by itself. Does not replace OS `ping` or lab traffic transcripts. | High for API reference. | Useful for simulation-side RTT/loss probes and method planning. | Partly for a simulation prototype. Not enough for measured truth. |
| INET-07 | https://inet.omnetpp.org/docs/showcases/measurement/throughput/doc/index.html | 2026-05-12 | INET Framework / OMNeT++ documentation | F-09, F-07/F-08 method context | Official INET showcase for measuring channel throughput in simulation. | Does not provide project measured throughput, endpoint topology, or `iperf` output. | High for method context. | Supports a throughput-statistics design, not acceptance evidence. | No for closure. Useful for implementation planning. |
| IPERF-01 | https://software.es.net/iperf/ | 2026-05-12 | ESnet / Lawrence Berkeley National Laboratory | F-07/F-08, F-09, V-03, V-04, V-06 | First-party iPerf project documentation for active throughput measurement. | Does not run the customer testbed and does not provide any project Mbps/Gbps truth. | High for iPerf tool semantics. | Use to specify measured-throughput command requirements and parser fields. | No. Requires retained project transcripts. |

### customer Sources

| ID | URL | Accessed date | Source owner | Requirement mapping | What it supports | What it does not support | Credibility | Summary | Enough for implementation authority |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| customer-01 | https://www.itri.org.tw/english/ListStyle.aspx?DisplayStyle=01_content&MGID=114031416223538088&MmmID=617731531241750114&SiteID=1 | 2026-05-12 | Industrial Technology Research Institute | F-01, F-02, F-12 context | Official customer public evidence that customer works on multi-orbit 5G NTN trials and satellite communications context. | Does not publish the self-developed orbit model, API, validation vectors, or handover rules for this project. | High for customer public activity. Low for implementation details. | Useful as NTN/multi-orbit context only. | No. Requires customer private model authority. |
| customer-02 | https://www.itri.org.tw/english/ListStyle.aspx?DisplayStyle=01_content&MGID=1220025304275667415&MmmID=1071732317056534772&SiteID=1 | 2026-05-12 | Industrial Technology Research Institute | F-01, F-17/P-01 context | Official customer public page for a low-earth-orbit satellite broadband communication system, including ground equipment and beam-tracking context. | Does not define the route's orbit model, antenna parameters, rain attenuation inputs, or V-group interface. | High for customer public product context. | Supports that LEO satcom, antenna/ground equipment, and NTN are real customer domains. | No. Context only. |
| customer-03 | https://www.itri.org.tw/english/ListStyle.aspx?DisplayStyle=01_content&MGID=1127330374542531201&MmmID=1071732317056534772&SiteID=1 | 2026-05-12 | Industrial Technology Research Institute | F-01, F-02, F-12 context | Official customer public NTN / 5G satellite communication context. | Does not define the customer model package, route fixture, or acceptance tests. | High for customer public direction. | Useful as background for NTN positioning. | No. Context only. |

### Operator / Service Sources

| ID | URL | Accessed date | Source owner | Requirement mapping | What it supports | What it does not support | Credibility | Summary | Enough for implementation authority |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CHT-01 | https://www.cht.com.tw/en/home/cht/messages/2023/1115-1530 | 2026-05-12 | Chunghwa Telecom | F-02, F-09 context, F-13 context | Official CHT source for OneWeb LEO service distribution partnership context. | Does not prove the route endpoint pair, pair-specific teleport path, active gateway, or measured throughput. | High for CHT/OneWeb relationship. | Supports operator-family context for Taiwan LEO service evidence. | No. Context only. |
| CHT-02 | https://www.cht.com.tw/en/home/cht/messages/2026/0122-1410 | 2026-05-12 | Chunghwa Telecom | F-02, F-09 context | Official CHT source for SES O3b mPOWER MEO service cooperation. | Does not prove route-specific MEO path, active gateway assignment, or measured project rate. | High for CHT/SES relationship. | Supports multi-orbit operator-family evidence beyond LEO. | No. Context only. |
| CHT-03 | https://www.cht.com.tw/en/home/cht/messages/2025/0415-1000 | 2026-05-12 | Chunghwa Telecom | F-02, F-09 context | Official CHT source describing MicroGEO and multi-orbit satellite service strategy across GEO/LEO/MEO context. | Does not prove runtime multi-orbit handover, throughput, or route closure. | High for CHT public service strategy. | Useful to justify CHT operator-family context in review docs. | No. Context only. |
| SES-01 | https://www.ses.com/v2/network-and-technology/meo/o3b-mpower | 2026-05-12 | SES | F-02, F-09 context | Official SES O3b mPOWER service page for MEO service capability context. | Does not prove CHT route path, actual measured speed, latency, or local gateway use. | High for SES service description. | Supports MEO operator/service context. | No. Context only. |
| SES-02 | https://www.ses.com/v2/press-release/sess-o3b-mpower-system-starts-providing-high-performance-connectivity-services | 2026-05-12 | SES | F-02, F-09 context | Official SES source for O3b mPOWER operational status and high-performance MEO service context. | Does not prove project-specific throughput or handover behavior. | High for SES service context. | Supports MEO service availability context, not local measurement. | No. Context only. |
| EUTELSAT-01 | https://www.eutelsat.com/satellite-network/oneweb-leo-constellation | 2026-05-12 | Eutelsat Group | F-13, F-02, F-09 context | Official Eutelsat OneWeb constellation information, including LEO service context and constellation scale. | Does not prove local Phase 7.1 freshness or route-native `>=500 LEO`. Does not prove Taiwan endpoint measurements. | High for OneWeb constellation context. | Useful for public constellation-scale context only. | No for route/repo closure. |
| EUTELSAT-02 | https://www.mynewsdesk.com/eutelsat/pressreleases/chunghwa-telecom-selects-eutelsat-oneweb-for-low-earth-orbit-leo-satellite-services-3285861 | 2026-05-12 | Eutelsat Group / Eutelsat newsroom | F-02, F-09 context | Official Eutelsat newsroom source for OneWeb and Chunghwa Telecom agreement context. | Does not prove route-specific path, active satellites, or measured traffic. | High for operator relationship. | Cross-checks CHT-01 from Eutelsat side. | No. Context only. |
| SPEEDCAST-01 | https://www.speedcast.com/our-solution/product/vsat-satellite/oneweb/ | 2026-05-12 | Speedcast | F-09 service context, V-06 context | Official Speedcast OneWeb service page. | Does not define customer physical DUT, traffic generator, or measured project throughput. | High for Speedcast service offering. | Supports Speedcast as an operator/service context source, not a test result. | No. Context only. |
| SPEEDCAST-02 | https://www.speedcast.com/newsroom/press-releases/2023/speedcast-delivers-first-live-deployment-for-onewebs-maritime-leo-service/ | 2026-05-12 | Speedcast | F-09 service context, V-06 context | Official Speedcast first-party deployment/test press release for OneWeb maritime LEO service. | Does not prove customer route, DUT, NE-ONE, or local throughput. | Medium-high. First-party service evidence, but not the project testbed. | Useful as external service evidence that real deployments exist. | No. Context only. |

### ITU Standards Sources

| ID | URL | Accessed date | Source owner | Requirement mapping | What it supports | What it does not support | Credibility | Summary | Enough for implementation authority |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ITU-01 | https://www.itu.int/rec/R-REC-P.618 | 2026-05-12 | ITU Radiocommunication Sector | F-17, P-02, P-03 | Official ITU-R recommendation family for Earth-space propagation prediction methods. | Does not provide customer frequency bands, antenna parameters, rain region, or V-group schema. | Very high for standards authority. | Candidate core recommendation for rain/propagation modeling. | Partly. Enough to cite a standards family, not enough without customer parameters and version selection. |
| ITU-02 | https://www.itu.int/rec/R-REC-P.837 | 2026-05-12 | ITU Radiocommunication Sector | P-02, P-03 | Official ITU-R recommendation family for precipitation characteristics. | Does not specify the project's chosen location/rain-rate input or model version. | Very high. | Supports rain-rate data/model selection. | Partly with customer parameter selection. |
| ITU-03 | https://www.itu.int/rec/R-REC-P.838 | 2026-05-12 | ITU Radiocommunication Sector | P-02, P-03 | Official ITU-R recommendation family for specific attenuation model for rain. | Does not supply project path geometry, frequency, polarization, or rain-rate values. | Very high. | Candidate model for converting rain-rate context to attenuation. | Partly with customer parameters and selected version. |
| ITU-04 | https://www.itu.int/rec/R-REC-P.676 | 2026-05-12 | ITU Radiocommunication Sector | P-03, F-17 | Official ITU-R recommendation family for attenuation by atmospheric gases. | Does not supply route-specific atmosphere, frequency, elevation, or validation vectors. | Very high. | Candidate atmospheric-loss reference. | Partly with customer parameters and selected version. |
| ITU-05 | https://www.itu.int/rec/R-REC-P.839 | 2026-05-12 | ITU Radiocommunication Sector | P-02, P-03 | Official ITU-R recommendation family for rain height model use. | Does not provide customer scenario geography or selected version. | Very high. | Candidate support recommendation for Earth-space rain attenuation workflows. | Partly with customer parameters. |
| ITU-06 | https://www.itu.int/rec/R-REC-P.840 | 2026-05-12 | ITU Radiocommunication Sector | P-03 | Official ITU-R recommendation family for attenuation due to clouds and fog. | Does not specify whether customer requires clouds/fog in addition to rain. | Very high. | Useful if V-group/customer asks for non-rain atmospheric attenuation. | No until selected by customer. |
| ITU-07 | https://www.itu.int/rec/R-REC-S.465 | 2026-05-12 | ITU Radiocommunication Sector | P-01, P-03 | Official ITU-R recommendation family for reference earth-station antenna radiation patterns. | Does not supply customer antenna geometry, bands, or accepted pattern. | Very high. | Candidate antenna-pattern reference. | Partly with customer antenna selection. |
| ITU-08 | https://www.itu.int/rec/R-REC-S.580 | 2026-05-12 | ITU Radiocommunication Sector | P-01, P-03 | Official ITU-R recommendation family for radiation diagrams for earth-station antennas. | Does not define project antenna parameters or acceptance thresholds. | Very high. | Candidate antenna-pattern reference. | Partly with customer antenna selection. |
| ITU-09 | https://www.itu.int/rec/R-REC-S.1528 | 2026-05-12 | ITU Radiocommunication Sector | P-01, P-03 | Official ITU-R recommendation family for non-GSO satellite antenna radiation patterns. | Does not say customer requires this recommendation or provide satellite antenna parameters. | Very high. | Candidate source if satellite antenna pattern modeling is in scope. | No until selected by customer. |

## Verified Source Delta Additions

This section was added after reviewing the secondary search reports under
`../itri_search`. The reports themselves are not retained as sources. Only the
original URLs below are retained, and only with the nonclaim boundaries shown.

### Standards / Protocol / Methodology Sources

| ID | URL | Accessed date | Source owner | Requirement mapping | What it supports | What it does not support | Credibility | Summary | Enough for implementation authority |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 3GPP-01 | https://www.3gpp.org/technologies/ntn-overview | 2026-05-12 | 3GPP | F-01, F-10/F-11, F-12, F-13 context | Official NTN overview covering orbit classes, NTN architecture vocabulary, ephemeris, mobility, and gateway context. | Does not define customer orbit-model API, route fixtures, operator policy, acceptance tests, or project traffic evidence. | High for NTN context. | Use for standards-aligned terminology and concept framing. | Partly for terminology and taxonomy only. No for customer closure. |
| 3GPP-02 | https://www.3gpp.org/dynareport/38811.htm | 2026-05-12 | 3GPP | F-01, F-10/F-11, F-12 context | Official 3GPP portal trace for TR 38.811, "Study on New Radio (NR) to support non-terrestrial networks." | Does not provide simulator schema, customer procurement requirements, route-local validation evidence, or measured project truth. | High for standards trace. | Retain as standards context for NTN assumptions and model vocabulary. | Partly for standards alignment only. |
| 3GPP-03 | https://www.3gpp.org/dynareport/38821.htm | 2026-05-12 | 3GPP | F-10/F-11, F-12 context | Official 3GPP portal trace for TR 38.821, "Solutions for NR to support Non-Terrestrial Networks (NTN)." | Does not define customer's handover presets, thresholds, live operator policy, or acceptance criteria. | High for standards trace. | Retain as trigger/procedure taxonomy context. | Partly for taxonomy only. |
| 3GPP-04 | https://www.3gpp.org/dynareport/38300.htm | 2026-05-12 | 3GPP | F-10/F-11 context | Official 3GPP portal trace for TS 38.300, "NR; NR and NG-RAN Overall description; Stage-2." | Does not prove native RF handover or live-control behavior in this project. | High for standards trace. | Retain as NR/NG-RAN handover procedure context. | Partly for taxonomy only. |
| RFC-01 | https://www.rfc-editor.org/rfc/rfc6349.html | 2026-05-12 | IETF / RFC Editor | F-07/F-08/F-09 method context, V-06 method context | Framework for TCP throughput testing and related method terminology. | Does not provide satellite-specific thresholds, project results, DUT evidence, or measured-report closure. | High for methodology. | Use when designing measured traffic runbooks and parser fields. | No for closure. Useful for method design. |
| RFC-02 | https://datatracker.ietf.org/doc/html/rfc2544 | 2026-05-12 | IETF | V-05/V-06 method context, F-09/F-16 method context | Benchmarking methodology for network interconnect devices and comparable reporting concepts. | Does not prove any virtual DUT, physical DUT, bridge, NAT, or report export passed. | High for methodology. | Use as DUT-style benchmarking context only. | No for closure. |
| RFC-03 | https://www.rfc-editor.org/rfc/rfc792.html | 2026-05-12 | IETF / RFC Editor | F-07/F-08 method context, V-03/V-04 method context | ICMP protocol basis for ping-style reachability checks. | Does not prove live ping passed and does not define customer sample size or thresholds. | High for protocol basis. | Use as protocol context for ping evidence planning. | No for closure. |

### Public Orbital Proxy Sources

| ID | URL | Accessed date | Source owner | Requirement mapping | What it supports | What it does not support | Credibility | Summary | Enough for implementation authority |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CELESTRAK-01 | https://celestrak.org/NORAD/elements/ | 2026-05-12 | CelesTrak | F-03, F-13, F-15 context | Current public GP element-set catalog and format entry points for TLE/3LE, OMM, JSON, and CSV. | Does not equal customer's self-developed orbit model and does not prove route-native `>=500 LEO`. | High for public orbital proxy data. | Retain as a public proxy source family for modeled/prerecorded orbital scenarios. | Partly for proxy-data workflows only. |
| CELESTRAK-02 | https://celestrak.org/NORAD/documentation/gp-data-formats.php | 2026-05-12 | CelesTrak | F-03, F-15 | Public GP/TLE/OMM data-format guidance. | Does not specify customer's ingestion contract, refresh cadence, reference frames, or validation vectors. | High for public data-format context. | Retain for source-format decision docs and adapter planning. | Partly for proxy format only. |
| CELESTRAK-03 | https://celestrak.org/NORAD/elements/supplemental/ | 2026-05-12 | CelesTrak | F-03, F-13, F-15 context | Current Supplemental GP source family and operator-supplied element-set context. | Does not provide customer equivalence approval, active satellite truth, gateway selection, or pair-specific path truth. | High for public proxy context. | Retain as SupGP index only; use specific feeds only after direct revalidation. | Partly for proxy context only. |
| SPACETRACK-01 | https://www.space-track.org/documentation | 2026-05-12 | Space-Track / U.S. Space Force data service | F-03, F-15 context | Official GP, GP_History, TLE, OMM, and API documentation. | Account-gated access and public docs do not define customer model semantics, operator proprietary ephemerides, or simulator schema. | High for public data-format and catalog-service context. | Retain as public orbital-source documentation. | Partly for proxy-source planning only. |

### Tool / Vendor / Platform Capability Sources

| ID | URL | Accessed date | Source owner | Requirement mapping | What it supports | What it does not support | Credibility | Summary | Enough for implementation authority |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| MS-WSL-01 | https://learn.microsoft.com/en-us/windows/wsl/networking | 2026-05-12 | Microsoft Learn | V-02, V-03/V-04 method context | Official WSL NAT and mirrored networking behavior, host/guest IP guidance, and port-forwarding context. | Does not prove the project Windows/WSL, tunnel, bridge, NAT, DUT, ping, iperf, or throughput path passed. | High for WSL behavior. | Use for V-02 readiness and environment-capture planning. | No for closure. |
| MS-WSL-02 | https://learn.microsoft.com/en-us/windows/wsl/wsl-config | 2026-05-12 | Microsoft Learn | V-02 | Official `.wslconfig` and `wsl.conf` configuration reference. | Does not define the project's intended networking mode or validation run. | High for WSL configuration. | Use for environment-capture and setup notes. | No for closure. |
| MS-HYPERV-01 | https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/setup-nat-network | 2026-05-12 | Microsoft Learn | V-02, V-04 method context | Official Hyper-V NAT setup context. | Does not prove simulated-to-real bridge behavior or DUT integration. | High for Hyper-V NAT context. | Use as platform-method context only. | No for closure. |
| MS-HYPERV-02 | https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/get-started/create-a-virtual-switch-for-hyper-v-virtual-machines | 2026-05-12 | Microsoft Learn | V-02, V-03/V-04 method context | Official Hyper-V virtual switch setup and switch-type context. | Does not prove the required Windows/WSL/DUT bridge topology works for this project. | High for Hyper-V platform context. | Use as platform-method context only. | No for closure. |
| ESTNET-01 | https://github.com/estnet-framework/estnet | 2026-05-12 | ESTNeT project | F-01 context, F-13 context, V-03/V-04/V-05 method context | First-party ESTNeT repository for OMNeT++ satellite and ground-station simulation. | Does not provide customer's orbit model, NAT/bridge validation, DUT results, ping, iperf, or throughput evidence. | High for ESTNeT project context. | Retain as the preferred ESTNeT source over mirrors. | Partly for simulator-reference planning only. |
| ESTNET-02 | https://link.springer.com/article/10.1007/s12567-020-00316-6 | 2026-05-12 | CEAS Space Journal / ESTNeT authors | F-01 context, V-03/V-04/V-05 method context | Original open-access ESTNeT paper describing a space-terrestrial simulation framework. | Does not certify customer requirements or project validation. | Medium-high as original paper context. | Retain as context only; prefer GitHub for active source details. | No for closure. |
| NEONE-01 | https://itrinegy.com/solution-by-task/satellite-link-simulation/ | 2026-05-12 | Calnex / iTrinegy | V-06, F-09/F-10/F-11/F-16 capability context | Vendor capability source for satellite-link impairment emulation and repeatable test scenarios. | Does not provide customer NE-ONE configuration, DUT evidence, or measured project output. | High for vendor capability. | Retain as capability context only. | No for closure. |
| NEONE-02 | https://itrinegy.com/ne-one-enterprise-range/ | 2026-05-12 | Calnex / iTrinegy | V-06, F-09/F-16 capability context | Vendor capability source for NE-ONE Enterprise models, emulation ports, virtual appliance options, and data sheets. | Does not prove project NAT/bridge validation, handover validation, live traffic, or DUT pass. | High for vendor capability. | Retain as capability context only. | No for closure. |
| NEONE-03 | https://calnexsol.com/product/ne-one-enterprise/ | 2026-05-12 | Calnex | V-06, F-09/F-16 capability context | Calnex product page for network emulation, impairments, reporting, packet-level manipulation, and API integration. | Does not prove integration with customer simulator, Windows/WSL bridge, or physical DUT. | High for vendor capability. | Retain as capability context only. | No for closure. |
| NEONE-04 | https://calnexsol.com/product/ne-one-professional/ | 2026-05-12 | Calnex | V-06 capability context | Calnex product page for point-to-point network impairment emulation, latency, loss, and bandwidth constraints. | Does not prove project traffic, DUT, NE-ONE, NAT, tunnel, bridge, or measured closure. | High for vendor capability. | Retain as capability context only. | No for closure. |

### customer Official Context Sources

| ID | URL | Accessed date | Source owner | Requirement mapping | What it supports | What it does not support | Credibility | Summary | Enough for implementation authority |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| customer-JOURNAL-01 | https://ictjournal.itri.org.tw/xcdoc/cont?sid=0Q117558398226579056&xsmsid=0M236556470056558161 | 2026-05-12 | customer ICT Journal | F-01, F-10/F-11, F-12/F-13 context | customer-owned technical context for 3GPP NR NTN transparent-mode base-station topics. | Does not publish project orbit model, API, testbed topology, or validation artifacts. | High for customer public context. | Retain as context only. | No for closure. |
| customer-JOURNAL-02 | https://ictjournal.itri.org.tw/xcdoc/cont?sid=0P190429473194442849&xsmsid=0M236556470056558161 | 2026-05-12 | customer ICT Journal | F-10/F-11, F-16 context | customer-owned context for TN/NTN integration, gateway, QoS, mobility, and multi-orbit concerns. | Does not define this route's implementation contract or pass/fail criteria. | High for customer public context. | Retain as context only. | No for closure. |
| customer-JOURNAL-03 | https://ictjournal.itri.org.tw/xcdoc/cont?sid=0Q118552727238318416&xsmsid=0M208578644085020215 | 2026-05-12 | customer ICT Journal | F-07/F-08/F-09 context, V-02..V-06 context | Separate customer public case context for satellite-link resilience and measurement concepts. | Separate-case observations are not current-project measured truth and cannot close this route. | High for customer public context. | Retain as context only with explicit nonclaim wording. | No for closure. |
| customer-JOURNAL-04 | https://ictjournal.itri.org.tw/xcdoc/cont?sid=0N347588371294333790&xsmsid=0M236556470056558161 | 2026-05-12 | customer ICT Journal | F-01, F-10/F-11, F-12 context | customer-owned NTN technology context. | Does not provide a versioned customer orbit feed, handover API, or route acceptance criteria. | High for customer public context. | Retain as context only. | No for closure. |
| customer-JOURNAL-05 | https://ictjournal.itri.org.tw/xcdoc/cont?sid=0P192517664504746384&xsmsid=0M208578644085020215 | 2026-05-12 | customer ICT Journal | F-01, F-10/F-11 context | customer-owned context for software-defined 3GPP NTN multi-orbit technology. | Does not provide project rule presets, thresholds, or implementation authority for closure. | High for customer public context. | Retain as context only. | No for closure. |

### Inaccessible Official Trace

| ID | URL | Accessed date | Source owner | Requirement mapping | What it supports | What it does not support | Credibility | Summary | Enough for implementation authority |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| customer-PROC-01 | https://quotaweb.itri.org.tw/download.aspx?filename=A522000513A+%E8%A6%8F%E7%AF%84%E6%9B%B8.pdf&rfqno=A522000513 | 2026-05-12 | customer procurement system | F-01, F-10/F-11, F-17/P-01/P-02/P-03 trace context | Official trace that a procurement/spec artifact existed or was linked publicly. | The URL redirects to an expired inquiry page. The spec content is inaccessible and cannot be cited as implementation authority. Ask customer for the valid spec. | Official but inaccessible. | Retain as an official trace only. | No. |

### Delta Rejections / Holds

| Source or category | Decision | Reason |
| --- | --- | --- |
| `../itri_search/*.md` and `../itri_search/*.docx` report text | Reject as source; retain only as intake input | Secondary reports are not authority sources. |
| Direct CelesTrak OneWeb SupGP table URL from reports | Hold as candidate | The SupGP index was verified, but the specific direct table URL was not retained as a separate verified entry in this review. |
| ResearchGate, Semantic Scholar, Mendeley, Wikipedia, blogs, and tutorial mirrors | Reject | Prefer original paper, source-owner repo, standards body, or first-party pages. |
| Third-party 3GPP mirrors such as Tech-Invite, iteh.ai, Scribd, and panel.castle.cloud | Reject | Prefer 3GPP portal or official standards publisher pages. |
| Unrelated PDFs from DTIC, Defense Alliance, MOENV, sustainability reports, or generic manufacturing sources | Reject | Not source-authority for the customer V4 demo requirement closure question. |

## Confidence And Usefulness

| Category | Confidence | Implementation usefulness | Intake decision |
| --- | --- | --- | --- |
| INET/OMNeT++ method docs | High for API/method behavior; low for project pass status. | Useful for designing V-02..V-06 and measured traffic evidence collection. | Retain as method/context only. |
| customer public pages | High for customer public NTN/LEO activity; low for private model specifics. | Useful for background and stakeholder alignment. | Retain as context only. |
| customer ICT Journal pages | High for customer public technical context; low for project-specific authority. | Useful for NTN/multi-orbit background and request framing. | Retain as context only. |
| 3GPP NTN / NR docs | High for standards taxonomy; low for customer policy and acceptance authority. | Useful for terminology, trigger taxonomy, and handover-procedure framing. | Retain as standards/method context only. |
| CelesTrak / Space-Track orbital sources | High for public orbital proxy data and format context; low for customer model truth. | Useful for proxy source decisions and fixture planning. | Retain as proxy/context only unless customer declares equivalence. |
| Microsoft WSL / Hyper-V docs | High for platform behavior; low for project pass status. | Useful for V-02 readiness and environment capture. | Retain as method/context only. |
| ESTNeT sources | High for ESTNeT project/paper context; low for customer validation status. | Useful for simulator-context and ESTNeT/INET vocabulary. | Retain as context only. |
| RFC method docs | High for protocol/methodology; low for project pass status. | Useful for measurement-runbook vocabulary and evidence schema design. | Retain as method authority only. |
| NE-ONE / Calnex / iTrinegy product docs | High for vendor capability; low for project pass status. | Useful for V-06 evidence requests and capability scoping. | Retain as capability context only. |
| customer procurement trace | Official but inaccessible. | Useful only to route an authority request back to customer. | Retain as inaccessible official trace, not implementation authority. |
| CHT/SES/Eutelsat/Speedcast pages | High for first-party service/operator evidence; low for route truth. | Useful for operator-family context and avoiding unsupported pair-specific claims. | Retain as service context only. |
| ITU recommendations | Very high for standards authority. | Useful once customer selects versions, parameters, and approximation level. | Retain as candidate standards authority. |
| iPerf official docs | High for measurement tool semantics. | Useful for command requirements and parsers. | Retain as method authority only. |

## Nonclaims

This register does not claim:

- customer orbit-model integration is implemented.
- customer's self-developed orbit model is publicly documented.
- The route has measured latency, jitter, throughput, communication time, or
  continuity truth.
- CHT, SES, Eutelsat, OneWeb, or Speedcast pages prove the route's active
  satellite, gateway, teleport path, or endpoint-pair path.
- ITU recommendations alone close rain attenuation, antenna, or physical-layer
  requirements without customer/V-group parameters.
- INET/OMNeT++ docs prove the current V-02..V-06 external validation passed.
- 3GPP documents define customer handover policy, editable rule fields, thresholds,
  or closure criteria.
- CelesTrak or Space-Track proxy orbital sources replace customer's orbit model or
  prove route-native scale closure.
- Microsoft WSL/Hyper-V, RFC, or NE-ONE/Calnex/iTrinegy docs prove the current
  V-02..V-06 external validation passed.
- The inaccessible customer procurement trace is implementation authority.
- The route-native 13-actor demo validates `>=500 LEO`.
- External report-system export is implemented.

## Rejected Or Not Verified

The following source categories were not retained as positive evidence:

- Non-official blogs, news articles, reseller pages, and secondary summaries
  about NTN, OneWeb, SES, Speedcast, or Chunghwa Telecom.
- Public search results that mention customer NTN or LEO work but do not expose an
  customer-owned page with the relevant content.
- Any public page that describes generic satellite service speed or latency but
  is not owned by the service operator, standards body, or tool project.
- Any material that implies project-specific `ping`, `iperf`, DUT, NAT,
  tunnel/bridge, rain attenuation, or throughput evidence without retained raw
  project artifacts.
- Any public source that would require inferring customer's private orbit-model API,
  V-group interface, or external report-system contract.
- Third-party mirrors of standards or papers where the 3GPP, ITU, IETF,
  source-owner repository, or original publisher page is available.
- The expired/inaccessible customer procurement spec content.

Specific unresolved searches:

- No verified public customer self-developed orbit-model API/specification was
  found.
- No verified public customer V-group physical/rain/antenna input schema was found.
- No verified public customer external report-system schema or destination was
  found.
- No verified public customer virtual DUT or physical DUT/NE-ONE run package was
  found.
- No verified public evidence was found that the current
  `/?scenePreset=regional&m8aV4GroundStationScene=1` route performs live
  ESTNeT/INET/NAT/tunnel/bridge/DUT validation.
