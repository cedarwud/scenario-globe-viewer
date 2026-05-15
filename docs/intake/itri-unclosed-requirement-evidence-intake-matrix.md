# customer Unclosed Requirement Evidence Intake Matrix

Date: 2026-05-12

Scope:

- Working route:
  `/?scenePreset=regional&m8aV4GroundStationScene=1`
- Working repo:
  `/home/u24/papers/scenario-globe-viewer`
- Intake type:
  first-round public-source evidence triage for unclosed customer requirements.
- Source rule:
  retain only official or first-party public sources. Public context is not
  closure evidence unless the row explicitly says it is implementation
  authority.

## Current Bounded Route Status

The canonical route has reviewer-ready, route-local bounded demo closure. It
does not close the full customer original requirement set.

Current safe statements:

- The route is a 13-actor ground-station multi-orbit handover review demo.
- It has bounded representations for modeled communication, handover pressure,
  F-09 rate class/proxy, F-10/F-11 preset controls, and F-16 bounded JSON
  export.
- It does not contain measured `ping`, `iperf`, latency, jitter, throughput, or
  continuity truth.
- It does not contain live ESTNeT/INET, NAT, tunnel, bridge, virtual DUT,
  physical DUT, or traffic-generator validation.
- F-13 now has a route-exposed fixture/model-backed scale readiness surface
  using repo-local fixture/model-backed input built at `2026-05-12T09:53:20Z`.
  It reports `549` total readiness/demo points, including `540` LEO points, but
  this is readiness/demo evidence only. F-13 `>=500 LEO` closure/proof is not
  complete, route-native scale closure is not claimed, and customer authority
  acceptance is still required.
- V-02 through V-06 currently have a retained external-validation package with
  fail/negative results only.

## Intake Matrix

| Group | Current gap | Required evidence | Owner / input needed | Public-source availability | customer-input questions | Testbed requirements | Allowed local prototype | Forbidden claims | Recommended next prompt |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| F-01 customer orbit model integration | Route uses viewer-owned projected artifacts and source-lineaged actors, not customer's self-developed orbit model. | customer orbit-model API/spec, input/output schema, time basis, reference frames, TLE or ephemeris ingestion rules, validation vectors, and acceptance criteria. | customer model owner. Requires private or explicitly released customer material. | customer public NTN/LEO pages provide NTN context only. No verified public customer self-developed orbit-model implementation spec was found. | What is the authoritative orbit model package? What frame and propagator are required? Which scenarios and vectors are acceptance truth? Can the model be redistributed or wrapped? | Deterministic model replay harness with known vectors and route-independent comparison output. | A read-only adapter scaffold using placeholder interfaces and no synthetic orbital truth. | Do not claim customer orbit-model integration, active satellite truth, or native orbit closure from public context pages. | Draft a single F-01 integration SDD amendment that lists required customer model files, adapter contract, validation vectors, and stop rules. Do not implement until customer supplies authority artifacts. |
| F-07/F-08 communication time and statistics measured truth | Current route and repo seams are bounded proxies or modeled windows. They do not retain measured `ping` or `iperf` communication-time transcripts. | Timestamped traffic test runs, topology, endpoints, packet path, command transcripts, raw output, parsed statistics, clock source, and redaction notes. | External validation owner plus customer testbed owner. | INET PingApp and INET throughput examples support simulation-side method ideas. ESnet iPerf supports throughput measurement tooling. They do not provide project-specific measured truth. | Which endpoints count as communication-time truth? Is `ping` RTT, availability window, packet loss, `iperf` interval, or all of these required? What sample size and pass/fail threshold apply? | Windows/WSL or Linux testbed with ESTNeT/INET path, route/interface inventory, NAT/tunnel state if used, and retained traffic transcripts. | Parser/normalizer for retained `ping` and `iperf3` logs, plus report schema draft. | Do not invent ping values, iperf values, jitter, packet loss, or availability percentages. Do not convert route modeled windows into measured truth. | Create one external-measurement evidence plan for F-07/F-08/F-09 together, with required commands, artifact layout, parser rules, and acceptance thresholds. |
| F-09 measured communication rate / throughput | Route has bounded modeled network-speed class/proxy only. No measured Mbps/Gbps truth exists. | `iperf3` or equivalent measured throughput transcript, endpoint identity, direction, protocol, duration, parallel stream settings, interval stats, retransmits/loss where applicable, and topology proof. | External validation owner and traffic-generator owner. | INET throughput showcase and ESnet iPerf docs support method selection. Operator service pages support expected service context, not measured project throughput. | Which traffic type, protocol, direction, duration, and thresholds should close F-09? Are satellite-operator public service ranges allowed only as context? | Same network path as F-07/F-08, with `iperf3` available on both endpoints or retained traffic-generator output. | CSV/JSON parser and bounded report bundle that refuses to mark pass without raw transcript references. | Do not display fake Mbps, fake Gbps, fake jitter, or "measured throughput" without retained logs. Do not cite CHT/SES/OneWeb/Speedcast marketing ranges as project measurement. | Extend the F-07/F-08 measurement plan with F-09 throughput fields and failure modes; require retained raw transcripts before any UI or export claims measured rate. |
| F-10/F-11 live or full policy/rule control | Route has modeled replay presets only. It is not live policy push, arbitrary rule editing, backend control, or native RF handover. | Policy/rule model, allowed parameters, persistence rules, safety constraints, operator authority, rollback behavior, and validation traces showing effects on the intended simulator or network path. | customer product owner plus simulator/control owner. | Public sources do not define customer handover policy semantics. INET can model network behavior, but it does not define customer policy rules. | Which policies are required? Are rules editable by operators or only preset-selectable? Do choices affect UI replay only, simulator state, or real testbed traffic? | If live, a safe simulator-control harness with logs proving inputs, state changes, outputs, and no real-network side effects beyond approved testbed. | Offline policy DSL/schema prototype and dry-run evaluator over retained fixture data. | Do not claim live policy control, active gateway selection, active satellite control, native RF handover, or arbitrary rule editing from route presets. | Draft a F-10/F-11 control-authority SDD that separates replay presets, simulator policy hooks, and any future live-control boundary. |
| F-13 `>=500 LEO` freshness / route-native boundary | The route is intentionally a 13-actor handover demo. It now exposes a fixture/model-backed scale readiness surface reporting 540 LEO and 549 total readiness/demo points from repo-local fixture/model-backed input built at `2026-05-12T09:53:20Z`. Separate Phase 7.1 evidence currently reports 540 LEO and 549 total points, but it expires after the documented retention window. Neither artifact closes route-native `>=500 LEO` proof or customer authority acceptance. | Fresh retained scale artifact with harness params, input constellation, observed counts, pass/fail status, timestamp, retention policy, known gaps, and either explicit customer acceptance or a route-native closure/proof requirement decision. | Repo validation owner for readiness/Phase 7.1 artifacts; customer if real operator/TLE/source authority or acceptance is required. | Eutelsat OneWeb public constellation pages support that a real LEO constellation can exceed 500 satellites. They do not prove local route scale, fixture authority, freshness, or customer acceptance. No public-source retrieval was used for the readiness surface. | Does customer accept fixture/model-backed readiness/demo evidence as sufficient for review, or require route-native `>=500 LEO`, separate validation harness evidence, approved source input, or some combination? Which constellation/source input is acceptable? | Existing readiness surface and Phase 7.1 harness can support demo/review evidence; rerun freshness evidence before citation expiry. Route-native closure/proof still requires an approved route-native or authority-controlled evidence path. | Freshness checker that warns when retained F-13 evidence expires; readiness-surface addendum referencing exact artifacts and nonclaims. | Do not claim the 13-actor route validates `>=500 LEO`. Do not claim fixture/model-backed readiness as route-native closure/proof, customer acceptance, active constellation truth, or public-source authority. Do not claim current F-13 acceptance after evidence expiry without rerun. | Use `docs/intake/itri-f13-scale-readiness-evidence-addendum-2026-05-12.md` for reviewer status. Rerun Phase 7.1 before expiry-sensitive review, and only create a new SDD if route-native scale closure/proof is explicitly required. |
| F-16 external report-system export | Route has bounded JSON export of route-owned demo state. It is not export to an external report system and not measured-report export. | Target report-system contract, destination, schema, auth/redaction rules, accepted fields, provenance rules, and test submission artifact. | customer report-system owner or delivery owner. | Public sources do not define the external report system. Existing route export can inform a local schema only. | What external system receives reports? Which formats are required? Are measured logs attached or summarized? What redaction is required? | If external system exists, a sandbox endpoint or file-exchange process with retained submission and validation logs. | Schema draft and offline sample bundle with non-claims and missing-measurement blockers. | Do not claim external report-system integration or measured report export from the route-local JSON download. | Write an F-16 external-report intake prompt requesting target schema, destination, auth, redaction, and sample accepted report. |
| F-17/P-01/P-02/P-03 V-group physical, rain, antenna, ITU integration | Repo has bounded physical-input proxy families. It is not a standards-backed propagation engine and not V-group integration. | V-group input format, antenna parameters, frequency bands, link budget assumptions, rain-rate source, ITU recommendation set/version, validation vectors, and acceptable approximation level. | customer V-group / physical-layer owner. | ITU-R P.618, P.837, P.838, P.676 and satellite antenna recommendations provide standards authority. They do not provide customer-specific parameter values or V-group interface. | Which ITU-R recs and versions are mandatory? Which frequency bands, elevation angles, polarizations, antenna patterns, and rain-rate regions apply? What output units close the requirement? | Offline physical-model validation harness with fixed vectors before any UI claim of physical truth. | Standards-index and parameter-schema prototype that blocks pass without V-group values and chosen ITU versions. | Do not invent rain attenuation, antenna gain, atmospheric loss, link margin, or ITU compliance. Do not call bounded proxies standards-backed truth. | Draft one V-group physical integration SDD covering P-01/P-02/P-03/F-17 together, with ITU rec selection and customer parameter questions. |
| V-02 Windows/WSL | Retained evidence has Windows 11 and WSL2 environment context only. No successful validation transcript. | Host OS, WSL version, distro, interface/route inventory, bridge/tunnel process inventory, command transcript, and successful traffic proof. | External validation owner. | Microsoft/WSL docs could support environment setup, but current intake focused on INET/OMNeT++ and project evidence. Public docs do not prove this testbed passed. | Which Windows build, WSL mode, distro, and network mode are accepted? | Actual Windows + WSL host used for customer validation. | Evidence collection script that records environment and refuses pass without traffic proof. | Do not claim Windows/WSL tunnel validated from environment inventory alone. | Re-run the V-02..V-06 external validation package on the intended host and retain successful traffic transcripts. |
| V-03 tunnel / bridge | Current package found no tunnel, bridge, tuntap config, bridge logs, packet path, or traffic proof. | Topology, tunnel endpoints, bridge configs/logs, packet path, interface state, and successful traffic transcript. | External validation owner plus ESTNeT/INET owner. | INET emulation docs support real-network attachment patterns; they do not prove customer tunnel setup. | Which tunnel bridge implementation is authoritative? Are `tun0/tun1` and `tun_bridge.py` still required? | Testbed with configured tunnel/bridge and retained packet or command proof. | Topology/evidence template and command collector. | Do not claim tunnel/bridge validation without endpoint config and traffic proof. | Use the V-02..V-06 readiness package to collect tunnel/bridge logs and traffic in one run. |
| V-04 NAT routing / simulated-to-real bridge | No retained ESTNeT/INET topology, NAT rules, gateway mapping, or traffic transcript. | INET/ESTNeT topology, NAT rules, veth/interface IPs, route tables, gateway mapping, and successful simulated-to-real traffic transcript. | External validation owner plus ESTNeT/INET owner. | INET NAT/routing docs support modeling and configuration concepts only. | What NAT topology and gateway addresses are authoritative? Are kickoff `192.168.2.x` and `140.96.29.x` examples still current or illustrative only? | Host with configured NAT/routing path and retained `ping`/`iperf` or traffic-generator proof. | NAT evidence schema and validation checklist. | Do not claim NAT routing validated from public INET docs or local empty inventory. | Run a NAT-focused evidence capture after customer confirms topology addresses and expected traffic path. |
| V-05 virtual DUT | No retained virtual DUT identity, topology, traffic profile, logs, or pass/fail run. | Testbench identity/version, DUT topology, input profile, outputs, logs, and pass/fail summary. | customer DUT/testbench owner. | No public source defines customer virtual DUT testbench. | What is the virtual DUT? What testbench language/tooling and traffic profile close the requirement? | Virtual DUT runner connected to the intended simulated or bridged network path. | Placeholder artifact layout and validator requiring real logs. | Do not claim virtual DUT validated without retained run artifacts. | Ask customer for the virtual DUT testbench package, expected command, and pass/fail criteria before implementation. |
| V-06 physical DUT / traffic generator | No retained physical DUT, NE-ONE, topology, timing, measured output, or redacted result set. | DUT or NE-ONE configuration, physical topology, traffic profile, timing, measured output, and redaction notes. | customer lab / physical testbed owner. | Public vendor/service docs do not define the customer physical DUT run. | Is NE-ONE mandatory? What model/version, profiles, ports, and metrics close the requirement? What can be redacted? | Physical lab access or retained operator-run evidence package. | Redaction template and schema validator for submitted lab output. | Do not claim physical DUT, NE-ONE, or traffic-generator validation without retained measured output. | Prepare a physical-DUT evidence request packet listing required logs, screenshots, configs, and redaction fields. |

## Public Source Availability Summary

Public official sources are useful for these purposes:

- Method context for INET/OMNeT++ emulation, NAT/routing, PingApp, throughput
  statistics, and iPerf measurement workflow.
- Operator/service context for CHT, SES O3b mPOWER, Eutelsat OneWeb, and
  Speedcast satellite-service evidence.
- Standards authority for ITU-R rain, atmospheric, and antenna-related model
  families.
- customer public NTN/LEO context.

Public official sources are not enough for these closure items:

- customer's private orbit model implementation.
- customer V-group input schema and physical-layer parameters.
- Project-specific measured `ping`, `iperf`, throughput, jitter, rain
  attenuation, or DUT results.
- External report-system contract.
- Windows/WSL, NAT, tunnel/bridge, virtual DUT, or physical DUT pass evidence.

## Global Nonclaims

Until a later retained evidence package proves otherwise, these claims remain
forbidden outside explicit non-claim or gap wording:

- active satellite or gateway truth;
- pair-specific teleport path truth;
- measured latency, jitter, throughput, continuity, or rate truth;
- fake Mbps/Gbps, fake ping, fake iPerf, fake rain attenuation, or fake DUT
  validation;
- native RF handover;
- route-native 500 LEO;
- F-13 fixture/model-backed readiness as route-native `>=500 LEO`
  closure/proof or customer authority acceptance;
- live ESTNeT/INET/NAT/tunnel/bridge/DUT/traffic-generator validation passed;
- external report-system export completed.
