# customer Search Source Delta Review

Date: 2026-05-12

Scope:

- Working route:
  `/?scenePreset=regional&m8aV4GroundStationScene=1`
- Working repo:
  `/home/u24/papers/scenario-globe-viewer`
- Intake type:
  source-delta review of secondary search reports under `../itri_search`.
- Edit boundary:
  docs/intake only. No source, tests, runtime behavior, or retained output
  evidence were changed by this review.

## Review Rules

The files under `../itri_search` are secondary search reports. They are not
authority sources by themselves. Only original URLs, first-party pages, official
standards, official product documentation, or source-owner publications can be
retained in the public source register.

Direct URL verification was performed for the high-value original URLs that
could affect the register. If a source was not reachable or was only available
through a secondary report, this review treats it as `candidate`, `unverified`,
`inaccessible official trace`, or `rejected`.

No source in this delta review changes requirement closure. Public documents
may support context, method, standards, tool capability, or proxy-data
selection. They do not supply retained project traffic logs, customer private model
contracts, testbed topology proof, DUT evidence, or external report-system
acceptance.

## Inputs Inspected

Repo-local authority and evidence files:

- `docs/intake/itri-unclosed-requirement-evidence-intake-matrix.md`
- `docs/intake/itri-public-source-research-register-2026-05-12.md`
- `docs/intake/itri-authority-input-request-packet-2026-05-12.md`
- `docs/sdd/itri-f07-f09-measured-traffic-evidence-package-plan.md`
- `output/validation/itri-demo-route-final-closure-2026-05-12.md`

Workspace customer authority:

- `/home/u24/papers/itri/README.md`

Availability note:

- `/home/u24/papers/itri/v4-quickstart.md`,
  `/home/u24/papers/itri/v4.md`, and `/home/u24/papers/itri/v3.md` are named by
  workspace authority order, but they are absent in this checkout. This review
  therefore follows the same fallback already documented in
  `docs/intake/itri-authority-input-request-packet-2026-05-12.md`.

Secondary reports inspected:

- `../itri_search/claude.md`
- `../itri_search/chatgpt.md`
- `../itri_search/gr.docx`
- `../itri_search/gemini.docx`
- `../itri_search/cr.docx`

## Executive Decision

Add verified original URLs to the public source register for these source
families:

- 3GPP NTN overview, TR 38.811, TR 38.821, and TS 38.300 portal pages.
- CelesTrak GP/SupGP and Space-Track documentation as public orbital proxy
  sources.
- Microsoft WSL and Hyper-V networking documentation as environment and
  topology method sources.
- ESTNeT GitHub and the ESTNeT CEAS Space Journal paper as simulator context.
- NE-ONE / Calnex / iTrinegy product pages as tool capability sources.
- RFC 6349, RFC 2544, and RFC 792 as protocol or methodology sources.
- customer ICT Journal NTN articles as customer official public context sources.
- customer procurement trace `A522000513` as an inaccessible official trace only.

Treat the following as rejected or hold-only:

- Secondary search reports, mirrors, and summaries.
- Third-party mirrors of 3GPP specs when 3GPP or ETSI official pages exist.
- ResearchGate, Semantic Scholar, Mendeley, Wikipedia, blogs, tutoring sites,
  vendor restatements, and unrelated PDFs.
- The expired/inaccessible customer procurement spec content.
- Any source that would require inferring customer's private orbit model, handover
  policy, V-group interface, DUT setup, NAT/bridge topology, or report-system
  contract.

## Per-Source Decisions

| Category | Source | Decision | Requirement IDs affected | What it supports | What it does NOT support | Closure status changed |
| --- | --- | --- | --- | --- | --- | --- |
| Standards / protocol / methodology authority | 3GPP NTN overview, `https://www.3gpp.org/technologies/ntn-overview` | Add to register | F-01, F-10/F-11, F-12, F-13 context | Official NTN concepts, LEO/MEO/GEO definitions, NTN architecture vocabulary, ephemeris/gateway/mobility context. | Does not define customer orbit model, route fixture, operator policy, acceptance tests, or project measurements. | No |
| Standards / protocol / methodology authority | 3GPP TR 38.811 portal, `https://www.3gpp.org/dynareport/38811.htm` | Add to register | F-01, F-10/F-11, F-12 | Official 3GPP trace for the NR NTN study report. | Does not provide customer simulator schema, private model API, or route closure evidence. | No |
| Standards / protocol / methodology authority | 3GPP TR 38.821 portal, `https://www.3gpp.org/dynareport/38821.htm` | Add to register | F-10/F-11, F-12 | Official 3GPP trace for NR NTN solution framing and trigger taxonomy context. | Does not define customer-authored policy presets, editable rule fields, thresholds, or live operator behavior. | No |
| Standards / protocol / methodology authority | 3GPP TS 38.300 portal, `https://www.3gpp.org/dynareport/38300.htm` | Add to register | F-10/F-11 | Official 3GPP trace for NR / NG-RAN overall description and handover procedure context. | Does not grant authority to claim native RF handover or project live-control behavior. | No |
| Public orbital proxy source | CelesTrak Current GP Element Sets, `https://celestrak.org/NORAD/elements/` | Add to register | F-03, F-13, F-15 context | Public GP/TLE/OMM source family for modeled or prerecorded orbital proxy scenarios. | Does not equal customer's self-developed orbit model and does not prove route-native scale acceptance. | No |
| Public orbital proxy source | CelesTrak GP data formats, `https://celestrak.org/NORAD/documentation/gp-data-formats.php` | Add to register | F-03, F-15 | Public data-format authority candidate for GP/TLE/OMM ingestion planning. | Does not specify customer's required input contract, refresh cadence, validation vectors, or acceptance truth. | No |
| Public orbital proxy source | CelesTrak Supplemental GP index, `https://celestrak.org/NORAD/elements/supplemental/` | Add to register | F-03, F-13, F-15 context | Public SupGP source family, including operator-supplied supplemental element-set context. | Does not provide customer equivalence approval or active satellite/path truth. | No |
| Public orbital proxy source | Direct CelesTrak OneWeb SupGP table URL from reports | Hold as candidate | F-13 context | Reported as a possible OneWeb proxy feed. | Direct fetch did not verify the specific report URL in this review; the SupGP index is the retained source instead. | No |
| Public orbital proxy source | Space-Track documentation, `https://www.space-track.org/documentation` | Add to register | F-03, F-15 context | Official GP/GP_History/TLE/OMM API and data-format documentation. | Account-gated data access and public documentation do not define customer orbit model semantics or route closure. | No |
| Tool/vendor capability source | Microsoft WSL networking, `https://learn.microsoft.com/en-us/windows/wsl/networking` | Add to register | V-02, V-03/V-04 method context | Official WSL NAT/mirrored networking behavior and host/guest connectivity guidance. | Does not prove the project Windows/WSL, tunnel, NAT, bridge, DUT, ping, iperf, or throughput path passed. | No |
| Tool/vendor capability source | Microsoft WSL configuration, `https://learn.microsoft.com/en-us/windows/wsl/wsl-config` | Add to register | V-02 | Official `.wslconfig` / `wsl.conf` configuration reference. | Does not define the project's intended topology or validation transcript. | No |
| Tool/vendor capability source | Microsoft Hyper-V NAT network, `https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/setup-nat-network` | Add to register | V-02, V-04 method context | Official Hyper-V NAT setup context. | Does not prove DUT integration, simulated-to-real bridge behavior, or project measurements. | No |
| Tool/vendor capability source | Microsoft Hyper-V virtual switch, `https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/get-started/create-a-virtual-switch-for-hyper-v-virtual-machines` | Add to register | V-02, V-03/V-04 method context | Official Hyper-V virtual switch models and VM connectivity context. | Does not prove any required Windows/WSL/DUT bridge topology works for this project. | No |
| Official / first-party public context source | ESTNeT GitHub, `https://github.com/estnet-framework/estnet` | Add to register | F-01 context, V-03/V-04/V-05 method context, F-13 context | First-party ESTNeT code/repo context for OMNeT++ satellite and ground-station simulation. | Does not provide customer's model, NAT/bridge validation, DUT results, or project traffic evidence. | No |
| Official / first-party public context source | ESTNeT CEAS Space Journal paper, `https://link.springer.com/article/10.1007/s12567-020-00316-6` | Add to register as context only | F-01 context, V-03/V-04/V-05 method context | Original paper context for ESTNeT architecture and space-terrestrial simulation scope. | It is not the active repo or customer authority; it does not certify project validation. | No |
| Standards / protocol / methodology authority | RFC 6349, `https://www.rfc-editor.org/rfc/rfc6349.html` | Add to register | F-07/F-08/F-09 method context, V-06 method context | TCP throughput testing methodology and terminology. | Does not provide project results, satellite-specific thresholds, or DUT pass evidence. | No |
| Standards / protocol / methodology authority | RFC 2544, `https://datatracker.ietf.org/doc/html/rfc2544` | Add to register | V-05/V-06 method context, F-09/F-16 method context | Network-interconnect device benchmarking methodology context. | Does not prove the virtual DUT, physical DUT, bridge, NAT, or report export passed. | No |
| Standards / protocol / methodology authority | RFC 792, `https://www.rfc-editor.org/rfc/rfc792.html` | Add to register | F-07/F-08 method context, V-03/V-04 method context | ICMP protocol basis for ping-style reachability checks. | Does not prove live ping passed and does not define customer thresholds. | No |
| Tool/vendor capability source | NE-ONE satellite link simulation, `https://itrinegy.com/solution-by-task/satellite-link-simulation/` | Add to register | V-06, F-09/F-10/F-11/F-16 capability context | Vendor capability context for repeatable satellite-link impairment emulation. | Does not provide customer scenario config, NE-ONE run output, DUT evidence, or measured project results. | No |
| Tool/vendor capability source | NE-ONE Enterprise range, `https://itrinegy.com/ne-one-enterprise-range/` | Add to register | V-06, F-09/F-16 capability context | Vendor capability context for emulation ports, virtual appliance options, NAT/bridge/route-style network testing, reporting, and API-oriented workflows. | Capability source only; no project NAT/bridge, DUT, traffic-generator, or handover validation is proven. | No |
| Tool/vendor capability source | Calnex NE-ONE Enterprise, `https://calnexsol.com/product/ne-one-enterprise/` | Add to register | V-06, F-09/F-16 capability context | Calnex product page for network emulation, impairments, reporting, packet-level manipulation, and API integration. | Does not prove integration with the customer simulator, Windows/WSL bridge, or physical DUT. | No |
| Tool/vendor capability source | Calnex NE-ONE Professional, `https://calnexsol.com/product/ne-one-professional/` | Add to register | V-06 capability context | Calnex product page for point-to-point network impairment emulation, including latency, loss, and bandwidth constraints. | Does not prove project traffic, DUT, NE-ONE, NAT, tunnel, bridge, or measured closure. | No |
| customer official context source | customer ICT Journal: `Current state and challenges of 3GPP NR NTN transparent-mode base stations`, `https://ictjournal.itri.org.tw/xcdoc/cont?sid=0Q117558398226579056&xsmsid=0M236556470056558161` | Add to register | F-01, F-10/F-11, F-12/F-13 context | customer-owned technical context for 3GPP NR NTN transparent-mode base-station topics. | Does not publish the project orbit model, API, testbed topology, or validation artifacts. | No |
| customer official context source | customer ICT Journal: `Sky and Earth as One: An Intelligent Gateway Integrating Terrestrial Networks and Satellites`, `https://ictjournal.itri.org.tw/xcdoc/cont?sid=0P190429473194442849&xsmsid=0M236556470056558161` | Add to register | F-10/F-11, F-16 context | customer-owned context for TN/NTN integration, gateway, QoS, mobility, and multi-orbit concerns. | Does not define this route's implementation contract or pass/fail criteria. | No |
| customer official context source | customer ICT Journal: `Satellite resilience applications in financial holding`, `https://ictjournal.itri.org.tw/xcdoc/cont?sid=0Q118552727238318416&xsmsid=0M208578644085020215` | Add to register | F-07/F-08/F-09 context, V-02..V-06 context | Separate customer public case context for satellite-link resilience and measurement concepts. | Its numbers or observations are not current-project measured truth and cannot close this route. | No |
| customer official context source | customer ICT Journal: `3GPP NTN Non-Terrestrial Network communication technology`, `https://ictjournal.itri.org.tw/xcdoc/cont?sid=0N347588371294333790&xsmsid=0M236556470056558161` | Add to register | F-01, F-10/F-11, F-12 context | customer-owned NTN technology context. | Does not provide a versioned customer orbit feed, handover API, or route acceptance criteria. | No |
| customer official context source | customer ICT Journal: `Amoeba Base Station: Software-defined 3GPP - NTN multi-orbit technology`, `https://ictjournal.itri.org.tw/xcdoc/cont?sid=0P192517664504746384&xsmsid=0M208578644085020215` | Add to register | F-01, F-10/F-11 context | customer-owned context for software-defined 3GPP NTN multi-orbit technology. | Does not provide project rule presets, thresholds, or implementation authority for closure. | No |
| Inaccessible official trace | customer procurement trace `A522000513`, `https://quotaweb.itri.org.tw/download.aspx?filename=A522000513A+%E8%A6%8F%E7%AF%84%E6%9B%B8.pdf&rfqno=A522000513` | Add as inaccessible official trace only | F-01, F-10/F-11, F-17/P-01/P-02/P-03 context | Confirms an customer procurement/spec trace exists or existed. | The current public URL redirects to an expired inquiry page; spec content is not accessible and cannot be implementation authority. Ask customer for the valid spec. | No |
| Already covered | Existing INET / OMNeT++ emulation, TUN, NAT, PingApp, throughput sources in the register | Already covered | F-07/F-08/F-09 method context, V-02..V-06 method context | Official method/API context already retained in the register. | Does not provide customer topology or pass evidence. | No |
| Already covered | Existing ESnet iPerf source in the register | Already covered | F-07/F-08/F-09 method context, V-03/V-04/V-06 method context | Official measurement tool context already retained. | Does not provide project transcripts or thresholds. | No |
| Already covered | Existing ITU-R P.618/P.837/P.838/P.676/P.839/P.840/S.465/S.580/S.1528 sources in the register | Already covered | F-17/P-01/P-02/P-03 | Standards authority already retained for physical/rain/antenna modeling families. | Does not provide customer/V-group parameters, chosen versions, or validation vectors. | No |
| Already covered | Existing CHT, SES, Eutelsat OneWeb, and Speedcast operator/service sources in the register | Already covered for core operator context | F-02, F-09 context, F-13 context, V-06 context | Service/operator-family context. | Does not prove active gateway, active satellite, pair-specific path, or project traffic truth. | No |
| Rejected / non-official / secondary / unverified | ResearchGate, Semantic Scholar, Mendeley mirrors of ESTNeT or related papers | Reject | F-01 context, V-03/V-04 context | None retained; use original Springer paper and ESTNeT GitHub instead. | Not official authority and not implementation evidence. | No |
| Rejected / non-official / secondary / unverified | Third-party 3GPP mirrors such as Tech-Invite, iteh.ai, Scribd, panel.castle.cloud, and unrelated mirrored PDFs | Reject | F-10/F-11/F-12 context | None retained; use 3GPP portal or official standards publisher pages. | Mirrors are not preferred authority and may drift. | No |
| Rejected / non-official / secondary / unverified | iperf.fr, Dell iperf article, MikroTik traffic-generator docs | Reject or hold as secondary/vendor-specific | F-07/F-08/F-09, V-06 | They may be useful reading, but ESnet iPerf and retained project logs are the preferred basis. | Do not use as current project pass evidence. | No |
| Rejected / non-official / secondary / unverified | Wikipedia O3b mPOWER, blogs, vendor marketing posts, APAC demos, generic teleport pages | Reject or context-only unless first-party and specifically needed | F-02/F-09/F-13 context | At most broad ecosystem context. | Does not provide route, operator-policy, gateway, measurement, or acceptance truth. | No |
| Rejected / non-official / secondary / unverified | arXiv / IARIA / NetSim / EXata / Hypatia / sns3 / unrelated simulators | Reject for this register | F-01/V-03/V-04 context | Adjacent research only. | Not customer authority and not aligned enough to override ESTNeT/INET context. | No |
| Rejected / non-official / secondary / unverified | DTIC, Defense Alliance, MOENV, sustainability reports, and unrelated PDFs found in DOCX reports | Reject | None | None for this requirement closure question. | Off-topic or not source-authority for the customer V4 demo. | No |

## Closure Impact

No closure status changes.

- F-01 remains `external-validation-required`. Public 3GPP, CelesTrak,
  Space-Track, ESTNeT, and customer context sources still do not provide customer's
  self-developed orbit model package, API, schema, time basis, reference frame,
  fixtures, or validation vectors.
- F-07/F-08/F-09 remain bounded/model/method-only in this repo unless a later
  retained external measured package supplies raw logs and authority thresholds.
  RFC, INET, iPerf, Microsoft, and NE-ONE sources only support method or tool
  planning.
- F-13 remains external for the route and accepted only through the separate
  fresh Phase 7.1 evidence boundary while that retained artifact is valid.
  CelesTrak, Space-Track, and Eutelsat/OneWeb public fleet context do not make
  the 13-actor route route-native `>=500 LEO`.
- F-16 remains bounded JSON export plus `external-validation-required`. Public
  RFC/iPerf/NE-ONE/customer context sources do not define an external report-system
  contract or accepted measured-report schema.
- V-02 through V-06 remain `external-validation-required`. Microsoft, INET,
  ESTNeT, RFC, and NE-ONE docs support readiness/runbook design only.
- F-10/F-11 external-truth portions remain `external-validation-required`.
  3GPP trigger/procedure sources do not define customer or operator live policy,
  editable rule scope, thresholds, persistence, or rollback behavior.

## Sources That Could Not Be Verified As Positive Authority

- Direct CelesTrak OneWeb SupGP table URL from the secondary reports: retained
  only through the verified CelesTrak GP/SupGP index pages, not as a separate
  verified table entry in this review.
- customer procurement `A522000513` spec content: the official URL was reachable
  only as an expired/inaccessible trace. It must be treated as "ask customer", not
  implementation authority.
- Any `../itri_search` report text that lacked an original URL or cited only a
  mirror/aggregator.
- Any source that described product capability or external deployments but did
  not expose current-project logs, topology, commands, configs, or acceptance
  thresholds.

## Final Nonclaim

This delta review does not claim measured throughput, latency, jitter, ping,
iperf, DUT, NE-ONE, NAT, tunnel, bridge, active satellite, active gateway,
pair-specific path, route-native `>=500 LEO`, customer orbit-model integration, or
external report-system closure. The current route closure matrix remains
unchanged.
