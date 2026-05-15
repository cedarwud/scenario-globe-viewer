# customer Public Standards Source Classification

Date: 2026-05-13

Status: docs-only S4-A source classification package. This document records
public standards sources for a bounded public standards profile covering
F-17/P-01/P-02/P-03. It does not authorize runtime implementation, test
changes, package changes, retained output evidence, or synthetic fixture
creation.

Related roadmap:
[../sdd/itri-requirement-completion-roadmap.md](../sdd/itri-requirement-completion-roadmap.md).

Related contracts and plans:

- [physical-input.md](./physical-input.md)
- [itri-synthetic-fallback-fixtures.md](./itri-synthetic-fallback-fixtures.md)
- [../sdd/phase-6-plus-requirement-centered-plan.md](../sdd/phase-6-plus-requirement-centered-plan.md)

## Purpose

S4-A classifies official public standards sources that may support a future
standards-indexed profile for:

- F-17 rain-attenuation impact display;
- P-01 antenna parameters;
- P-02 rain attenuation / rainy-condition attenuation;
- P-03 ITU-related factors.

The current repo already has bounded physical-input seams for antenna,
rain-attenuation, and ITU-style families. This package does not replace those
bounded proxies with calibrated propagation or antenna behavior. It records
which public standards sources are admissible candidates and which authority
questions remain before any future profile can be promoted.

## Profile Boundary

Public standards may support only a bounded public standards profile unless
customer/V-group accepts selected versions, parameters, vectors, and approximation
level as authority.

Allowed S4-A use:

- source-lineaged standards index for F-17/P-01/P-02/P-03;
- future input schema planning for recommendation id, version, parameter,
  geography, frequency, polarization, elevation, antenna, and vector fields;
- authority request framing for customer/V-group review;
- nonclaim-backed UI/status wording that says a source is a candidate public
  standard, not accepted project truth.

Disallowed S4-A use:

- creating synthetic fixtures;
- treating current bounded proxy values as standards-derived values;
- claiming customer/V-group acceptance;
- claiming calibration evidence, route validation, lab validation, or external
  validation closure;
- embedding copied ITU formula tables, gridded components, or recommendation
  text into checked-in fixture data without a later license and authority
  review.

## Classification Vocabulary

| Classification | S4-A meaning |
| --- | --- |
| Public authority candidate | Official public standards, source-owner documentation, or first-party public material stable enough to retain URL, access date, version/recommendation id, and use notes. It can support a bounded public standards profile only. |
| Method/context only | Official material useful for source-use rules, publication status, method framing, or evidence-request wording, but not a F-17/P-01/P-02/P-03 profile source by itself. |
| Service/operator context only | First-party service/operator material that may describe service capability elsewhere, but does not define rain, antenna, propagation, or ITU parameter authority for this profile. |
| Hold | First-party source that appears relevant but is not promotable until scope, version, access, or license questions are resolved. |
| Reject | Secondary summary, mirror, community source, unverifiable material, inaccessible content, or source requiring unsupported inference when an official source is available. |

## Source Classification Table

Access date for all retained sources: 2026-05-13.

| Source id | Source owner | URL | Version / recommendation id | Requirement mapping | License/use notes | Classification |
| --- | --- | --- | --- | --- | --- | --- |
| S4A-ITU-P618 | ITU Radiocommunication Sector | https://www.itu.int/rec/R-REC-P.618-14-202308-I/en | ITU-R P.618-14 (08/2023), approved 2023-08-23, in force | F-17, P-02, P-03 | Official ITU-R page marks the recommendation as free download. Use by citation/source lineage only in this repo; ITU copyright and website terms remain applicable. Do not copy method text, equations, tables, or components into fixture data in S4-A. | Public authority candidate |
| S4A-ITU-P837 | ITU Radiocommunication Sector | https://www.itu.int/rec/R-REC-P.837-8-202509-I/en | ITU-R P.837-8 (09/2025), approved 2025-09-01, in force | P-02, P-03 | Official ITU-R page marks the recommendation and components as free download. Component use must wait for a later license and authority review; S4-A records only source lineage and candidate status. | Public authority candidate |
| S4A-ITU-P838 | ITU Radiocommunication Sector | https://www.itu.int/rec/R-REC-P.838-3-200503-I/en | ITU-R P.838-3 (03/2005), approved 2005-03-08, in force | P-02, P-03 | Official ITU-R page marks the recommendation as free download and notes incorporation by reference in the Radio Regulations. Use as a standards candidate only until customer/V-group selects parameters and version. | Public authority candidate |
| S4A-ITU-P676 | ITU Radiocommunication Sector | https://www.itu.int/rec/R-REC-P.676-13-202208-I/en | ITU-R P.676-13 (08/2022), approved 2022-08-24, in force | F-17, P-03 | Official ITU-R page marks the recommendation as free download. Treat as candidate atmospheric-gas factor support only when the selected profile includes gas attenuation. | Public authority candidate |
| S4A-ITU-P839 | ITU Radiocommunication Sector | https://www.itu.int/rec/R-REC-P.839-4-201309-I/en | ITU-R P.839-4 (09/2013), approved 2013-09-30, in force | P-02, P-03 | Official ITU-R page marks the recommendation and components as free download. Component use must wait for a later license and authority review; S4-A records only source lineage and candidate status. | Public authority candidate |
| S4A-ITU-P840 | ITU Radiocommunication Sector | https://www.itu.int/rec/R-REC-P.840-9-202308-I/en | ITU-R P.840-9 (08/2023), approved 2023-08-23, in force | F-17, P-03 | Official ITU-R page marks the recommendation as free download and lists component parts. Treat as optional cloud/fog attenuation support only if customer/V-group selects this factor. | Public authority candidate |
| S4A-ITU-S465 | ITU Radiocommunication Sector | https://www.itu.int/rec/R-REC-S.465-6-201001-I/en | ITU-R S.465-6 (01/2010), approved 2010-01-23, in force | P-01, P-03 | Official ITU-R page marks the recommendation as free download. Use as candidate earth-station antenna-pattern reference only after customer/V-group selects antenna geometry, band, and interpretation. | Public authority candidate |
| S4A-ITU-S580 | ITU Radiocommunication Sector | https://www.itu.int/rec/R-REC-S.580-6-200401-I/en | ITU-R S.580-6 (01/2004), approved 2004-01-06, in force | P-01, P-03 | Official ITU-R page marks the recommendation as free download. Use as candidate GEO earth-station antenna design-objective context only when the profile includes that antenna class. | Public authority candidate |
| S4A-ITU-S1528 | ITU Radiocommunication Sector | https://www.itu.int/rec/R-REC-S.1528-0-200106-I/en | ITU-R S.1528-0 (06/2001), approved 2001-06-28, in force | P-01, P-03 | Official ITU-R page marks the recommendation as free download. Use as candidate non-GSO satellite antenna-pattern context only if satellite antenna behavior is in scope. | Public authority candidate |
| S4A-ITU-PUB-ACCESS | ITU Publications / ITU Radiocommunication Sector | https://www.itu.int/pub/R-REC/en | Publication overview, no recommendation version | Source-use context for all retained ITU-R recommendations | ITU states current ITU-R Recommendations and Reports have free online access for the public. This page supports access/use context, not physical model content. | Method/context only |
| S4A-ITU-TERMS | International Telecommunication Union | https://www.itu.int/en/about/Pages/terms-of-use.aspx | Website terms, no recommendation version | Source-use context for all retained ITU pages | ITU website terms reserve ITU intellectual property rights unless otherwise stated, allow limited download/copy/use with attribution for personal, educational, or non-commercial purposes, and restrict commercial or derivative use without permission. This page supports use notes only. | Method/context only |
| S4A-ITU-COPYRIGHT | International Telecommunication Union | https://www.itu.int/en/Pages/copyright.aspx | Website copyright notice, no recommendation version | Source-use context for all retained ITU pages | ITU copyright notice says ITU holds copyright unless otherwise stated and permission requests for reproduction go to ITU. This page supports use notes only. | Method/context only |

## Requirement Disposition

| Requirement | Candidate source stack | S4-A classification result | Remaining authority blocker |
| --- | --- | --- | --- |
| F-17 rain-attenuation impact display | Core: P.618. Support candidates: P.837, P.838, P.839, P.676, P.840. | Public authority candidate stack for a bounded public standards profile. | customer/V-group must select version set, rain-rate source, geography, frequency bands, path geometry, elevation, polarization, output units, approximation level, and validation vectors before this can be treated as accepted authority. |
| P-01 antenna parameters | Earth-station candidates: S.465 and S.580. Conditional satellite antenna candidate: S.1528. | Public authority candidate stack for bounded antenna-parameter provenance. | customer/V-group must provide antenna geometry, gain/pattern interpretation, pointing assumptions, frequency bands, terminal class, earth-station vs satellite-side scope, and validation vectors. |
| P-02 rain attenuation / rainy-condition attenuation | Core: P.618, P.837, P.838, P.839. Conditional related factors: P.676 and P.840 if selected. | Public authority candidate stack for bounded rain-attenuation provenance. | customer/V-group must select rain model workflow, location/rain-rate data, rain height, path geometry, frequency, polarization, elevation, exceedance/availability interpretation, and accepted output units. |
| P-03 ITU-related factors | Candidate ITU-R profile index: P.618, P.837, P.838, P.676, P.839, P.840, S.465, S.580, S.1528. | Public authority candidate index. This classifies candidate recommendations only; it does not define a generic ITU compliance claim. | customer/V-group must select exact recommendations, versions, parameter values, factor subset, approximation level, and validation vectors. |

## Explicit Nonclaims

This package does not claim:

- selected ITU versions have been accepted by customer/V-group;
- any antenna, rain, or ITU-style bounded proxy is standards-derived;
- any public standard by itself supplies customer/V-group parameters, vectors, or
  acceptance criteria;
- any external validation, DUT, NAT, tunnel, lab, or traffic evidence is closed;
- any physical-layer calibration, measured route behavior, active path, or
  active satellite/gateway assignment is proven;
- any synthetic fixture exists or should be created in S4-A.

## Excluded Or Non-Promoted Sources

| Source category | S4-A disposition | Reason |
| --- | --- | --- |
| Third-party mirrors of ITU recommendations | Reject | Official ITU pages are available and are the only retained standards source for this package. |
| Blogs, tutorials, secondary summaries, screenshots, or AI/search summaries about ITU propagation methods | Reject | They are not first-party standards authority and would add unsupported interpretation. |
| Operator or service-provider pages | Service/operator context only, not promoted for S4-A | They may support service context in other lanes but do not define public rain, antenna, or ITU parameter authority for F-17/P-01/P-02/P-03. |
| customer public NTN or LEO context pages | Method/context only for stakeholder background, not promoted for S4-A | Public customer context does not publish the V-group physical input schema, parameter selections, vectors, or accepted approximation level. |
| Inaccessible or expired procurement/spec traces | Hold | Official trace may help route an authority request, but inaccessible content cannot be cited as source authority. |

## Future Profile Intake Fields

A later implementation or fixture-definition slice must not consume this
classification directly as numeric truth. Before any public standards profile
is materialized, the profile record must name:

- profile id and profile date;
- requirement ids covered;
- each selected recommendation id, version, URL, access date, and status;
- selected frequency bands and units;
- geography, rain-rate source, rain height source, and time/exceedance basis;
- path geometry, elevation angle, polarization, antenna class, and pointing
  assumptions;
- selected output units and any conversion rules;
- approximation level and known deviations from the recommendation workflow;
- validation vectors and tolerances;
- customer/V-group reviewer and acceptance status, if authority beyond bounded
  public profile is intended;
- nonclaims that preserve the difference between public standards lineage,
  bounded repo profile, and external authority truth.

## Unresolved Authority Questions

1. Which ITU-R recommendations and versions does customer/V-group require for
   F-17/P-01/P-02/P-03?
2. Which frequency bands, elevation angles, polarizations, terminal classes,
   antenna geometries, pointing assumptions, and path roles apply?
3. Which location, rain-rate source, rain height, cloud/fog, atmospheric gas,
   exceedance, and availability assumptions are in scope?
4. What output units and precision must the profile produce for rain
   attenuation, antenna effects, atmospheric factors, and projected decision
   impact?
5. What approximation level is acceptable, and which recommendation components
   or tables may be used under the applicable ITU terms?
6. What validation vectors, tolerances, reviewer role, and acceptance record are
   required before a public standards profile can be treated as authority beyond
   the bounded repo-owned profile?
