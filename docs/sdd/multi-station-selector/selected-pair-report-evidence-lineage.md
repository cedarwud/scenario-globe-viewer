# Selected-Pair Report Evidence Lineage

## Status

Proposed working SDD for the selected-pair evidence report.

## Date

2026-06-01

## Purpose

The selected-pair report must answer three user questions without mixing them:

1. What requirement-facing values are shown?
2. How should those values be read?
3. Where did each value come from, and how strong is that source?

The report is a readable evidence and summary page. It is not an internal
handoff note, not a contract acceptance report, and not a substitute for the
CSV row export. The CSV remains the row-level export; the HTML report explains
and summarizes the evidence.

## Audience

The primary reader is a non-engineer reviewer who needs enough detail to judge
whether the selected projection is defensible. The same report should also
remain useful to an engineer auditing source boundaries, but engineering-only
debug payloads belong in the Raw data tab.

## Mode Naming

The report uses one evidence-detail toggle, not two report modes. Data is
always visible; the switch only expands or hides supporting explanation.

| Control | Purpose | Must show |
| --- | --- | --- |
| Evidence Detail off | Compact reading for values and permanent evidence chips. | Data values, requirement IDs, truth/source chips, source-gap markers. |
| Evidence Detail on | Expanded evidence detail for interpretation, formulas, limits, and non-claims. | Everything above plus methods, assumptions, formulas, and non-claims. |

The toggle must not decide whether source truth is visible. Provenance is part
of the data, so truth/source chips stay visible whether Evidence Detail is on
or off.

Evidence Detail must add meaningful explanatory coverage across every report
tab. It should reveal field guides for Summary, Requirements, Visibility,
Handover, Sources, Models, and Raw data so readers can understand how columns
should be interpreted. It must not be limited to a few formulas or isolated
summary notes.

## Report Navigation IA

The report can contain dense evidence tables, so navigation must separate main
classification from in-tab scanning:

| Layer | Purpose | Behavior |
| --- | --- | --- |
| Top tabs | Main evidence category. | Switch between Summary, Requirements, Visibility, Handover, Sources, Models, and Raw data. |
| Section outline | Current tab's local table/section index. | Link to headings inside the active tab without changing the data mode. |

The section outline is navigation only. It must not create a second data mode,
must not hide evidence, and must not replace the existing Evidence Detail
toggle. Evidence Detail remains the only explanation-density control.

Desktop layout should use a sticky left outline beside the current tab content.
Mobile/narrow layouts should collapse the same outline into a sticky horizontal
section selector below the toolbar so readers can jump to sections without
scrolling through every table first.

The outline should be generated from report section headings and should exclude
field-guide headings because field guides are Evidence Detail content, not the
main tab structure.

## Lineage Schema

Each report-facing field should be representable as a lineage item:

| Field | Meaning |
| --- | --- |
| `fieldId` | Stable report field identifier. |
| `label` | User-facing label. |
| `requirementIds` | Related consolidated requirement IDs, if any. |
| `value` | Rendered value or compact summary. |
| `truthClass` | How the value was obtained. |
| `sourceRefs` | Runtime source IDs, fixture paths, model IDs, or standards references. |
| `method` | Plain-language computation or transformation. |
| `inputs` | Important upstream inputs. |
| `nonClaims` | What this value must not be read as. |
| `sourceGap` | True when the report has no defensible source for a value. |

Lineage can be implemented as a report view-model helper before it becomes a
shared runtime type. UI copy must not invent source authority that is absent
from the runtime payload.

## Truth Classes

Use these user-facing classes consistently:

| Class | Meaning | Examples |
| --- | --- | --- |
| Authority-verified | Retained or authority-backed source package for the pair or value. | Existing validated fixture path. |
| Public source | Public registry, public TLE snapshot, or public station metadata. | Station coordinates, TLE source manifest. |
| Standards-derived | Computed from a cited standard or standards-backed local implementation. | FSPL, rain attenuation, propagation delay. |
| Model-derived | Derived from runtime logic using source data and local policy. | Visibility intersections, service-layer selection, handover events. |
| Simulation input | User/demo input used to model a scenario. | Rain-rate slider value, selected time window. |
| Display transform | Presentation transform for the globe or report. | Runtime caps, visual actor filtering, camera/display lanes. |
| External evidence | Evidence lives outside the selected-pair runtime report. | Long-run soak artefact, non-UI infrastructure records, final written report. |
| Source gap | Required evidence is absent or not wired into this report. | Missing operator RF profile, missing packet trace, unwired antenna output. |

## Requirement Coverage Matrix

The report must include a Requirements tab that maps every consolidated
requirement row to the same three user-facing questions:

1. What value or answer does the selected-pair report provide?
2. How should that answer be read?
3. What source class supports it, or what source is missing?

The matrix is not a development progress note. It must not contain agent
handoff language, implementation status narration, or internal planning copy.
It should never say "this was just added", "next step", "pending discussion",
or similar conversation-only text. If a requirement is outside the
selected-pair runtime payload, the row should say so as evidence boundary, not
as a worklog.

### Coverage Row Shape

| Column | Meaning |
| --- | --- |
| Bucket | `A`, `B`, or `C`, matching the consolidated requirement grouping. |
| Requirement ID | The consolidated ID string. |
| Requirement | Short user-readable requirement summary. |
| Answer / value | Current report-facing answer or computed value. |
| How to read it | Plain-language interpretation and limits. |
| Source / truth class | One of the report truth classes. |
| Evidence location | Where the reader can inspect the supporting report rows. |
| Gap / non-claim | Missing source, substitute boundary, or non-claim. |

### Coverage Rules

- Bucket A rows should prefer runtime-backed report data when available:
  satellite manifests, visibility windows, modeled communication time,
  handover events, rain scenario inputs, report/CSV exports, and selected route
  setup.
- Bucket B rows should distinguish standards-derived substitutes from absent
  operator packet traces, station RF hardware profiles, local rain calibration,
  and acceptance-threshold scripts.
- Bucket C rows should remain visible for completeness, but they must be
  labeled `External evidence` or `Source gap` when the selected-pair runtime
  report does not carry the artefact.
- `R1-F3 / K-E3` may show modeled communication time, but must say it is not
  iperf/ping measurement.
- `K-A3-a` and `K-F2` must say antenna-pattern support is standalone or
  source-gap unless a wired selected-pair runtime antenna-gain output exists.
- Long-run soak, final written-report deliverables, physical testbench items,
  and external network bridge items must not be represented as globe-derived
  runtime values.

## External Evidence Manifest

The report may cite evidence that lives outside the selected-pair runtime
payload, but it must keep that evidence in a separate register. This prevents
the runtime projection from silently inheriting authority from build logs,
smoke artifacts, long-run artifacts, infrastructure packages, or written-report
packages.

### Manifest Shape

The selected-pair report uses two small registers:

| Register | Purpose | Must not do |
| --- | --- | --- |
| External evidence register | Lists retained artifacts that can support a requirement row. | Must not turn an external artifact into runtime source truth. |
| Missing evidence register | Lists required evidence that is absent or not wired into the report. | Must not hide a missing source behind a modeled value. |

Each external evidence row should include:

| Field | Meaning |
| --- | --- |
| `evidenceId` | Stable id used from requirement rows. |
| `requirementIds` | Consolidated requirement ids supported or constrained by the artifact. |
| `status` | `available`, `partial`, `not-attached`, or `source-gap`. |
| `artifactRefs` | Retained local paths or script paths. |
| `evidenceValue` | Compact reviewer-facing summary of what the artifact says. |
| `howToRead` | How the artifact should be used during review. |
| `boundary` | What the artifact does not prove. |

Each missing evidence row should include:

| Field | Meaning |
| --- | --- |
| `gapId` | Stable id referenced from requirement rows. |
| `requirementIds` | Affected consolidated requirement ids. |
| `missingEvidence` | What is absent. |
| `neededSource` | What artifact or source would be required. |
| `impact` | Which report claim must remain limited. |
| `boundary` | Non-claim that prevents over-reading. |

### Initial Register Scope

Initial external evidence rows should cover:

- selected-pair report smoke artifact for HTML/CSV/report packaging;
- selected-pair route governance gate;
- retained 24-hour soak summary for the stability milestone;
- retained multi-orbit scale validation summary for the 500-LEO requirement;
- external infrastructure validation summary as partial/gap evidence for the
  C-bucket infrastructure rows.

Initial missing evidence rows should cover:

- packet-test trace;
- acceptance threshold script;
- local rain calibration constants;
- selected-pair antenna runtime output;
- external network bridge proof;
- DUT / traffic-generator run;
- final written report package.

Requirement rows should link to these register ids through the Evidence
location column. They should not duplicate large artifact contents inside the
matrix.

## Station Lineage

Station lineage is separate from satellite lineage. The report must cite the
runtime station payload (`stationPrecision`, `stationRfProfiles`, and
`pairSourceAttribution`) instead of inferring station truth from marker display,
camera framing, or selected-pair UI copy.

### Station Source Inventory

| Source surface | Runtime path or field | Report responsibility |
| --- | --- | --- |
| Public station registry | `public/fixtures/ground-stations/multi-orbit-public-registry.json` and `station-registry:<stationId>` provenance ids | Show the registry as the source for station id, name, operator family, country, region, lat/lon, supported orbits, supported bands, registry `sourceTier`, disclosure precision, and public notes. |
| Registry citation notes | `public/fixtures/ground-stations/multi-orbit-public-registry-sources.md` | Cite this as the human-readable ledger for the public sources behind registry inclusion and coordinate notes. |
| Pair attestation ledger | registry root `pairAttestations` plus `pairSourceAttribution` | Show pair source tier separately from station source. A pair is `public-disclosed` only when a pair-level attestation row matches both station ids; same-family and cross-family pairs remain `geometric-derived` when no row exists. |
| Coordinate authority fixture | `public/fixtures/ground-stations/multi-orbit-public-registry-coordinate-authority.json` | Show `coordinateSourceAuthority`, `coordinateSourceUrl`, and `coordinateSourceNote` separately from coordinate precision. The fixture covers all 69 current station rows. |
| Elevation cache | `public/fixtures/ground-stations/station-elevations-cache.json` and station elevation metadata fields | Show `elevationM`, source id/path/kind, access time, dataset id/version/resolution/datum, tile/cell, sampling method, license/citation, provenance status, and non-claim text. |
| Terrain mask default | registry `terrainMaskDeg`, `terrainMaskSourceId = default-unknown`, `terrainMaskIsDefault`, `terrainMaskNote` | Show the numeric mask and whether it is a default. Current registry rows all use `0`; this means no site-specific horizon mask is available, not a measured clear horizon. |
| Render position boundary | `rawLat`, `rawLon`, `coordinateUse`, `renderPositionIsSourceTruth` | Show whether the displayed station position is source truth (`exact-coords`) or a representative operator-family/region coordinate. Do not treat marker placement, camera hints, or endpoint ribbons as coordinate authority. |
| Station RF profile | `stationRfProfiles[*]` with `antennaDiameterM`, `peakEirpDbm`, `txPolarization`, and their source ids | Show unavailable RF fields as source gaps. Current source id is `unavailable-pending-operator-rf-profile`; modeled link metrics must not upgrade those gaps. |

Current inventory facts for the report:

- The registry schema is `multi-orbit-public-registry.v1`, generated
  `2026-05-16T09:10:22Z`, with 69 stations and zero current pair-attestation
  rows.
- Registry coordinate precision is mixed: `exact-coords` rows can be rendered
  as source coordinates; `operator-family-region` rows are representative
  coordinates and must say so.
- The coordinate authority fixture schema is `station-coordinate-authority.v1`,
  generated `2026-05-21T00:00:00Z`, and currently resolves authority values
  across `wikipedia`, `mixed-public`, `operator-web`, and `secondary-web`.
- The elevation cache currently has 69 rows, all
  `legacy-service-cache` / `legacy-upstream-dem-unknown`, with dataset id
  `legacy-elevation-service-cache-v1`. No current row has complete DEM tile,
  version, resolution, or vertical-datum authority.
- The terrain mask source is `default-unknown` for every current station row.
- Station RF hardware profile values are currently unavailable: antenna
  diameter, station/carrier EIRP, and Tx polarization are null.

### Station Truth Class Rules

- Station registry fields are `Public source` unless the selected route is
  explicitly using an authority-backed pair fixture. Registry inclusion only
  supports public multi-orbit capability and location metadata; it is not
  commercial pair routing, SLA, active serving-satellite, or measured traffic
  evidence.
- Pair source tier is not station coordinate authority. `sourceTier` from the
  registry, `pairSourceAttribution.sourceTier`, and
  `coordinateSourceAuthority` must remain separate report fields.
- `coordinateSourceAuthority` is the authority class for the coordinate row.
  `disclosurePrecision` says how precise the coordinate is. A precise
  coordinate from a weak public source is still not authority-verified.
- `renderPositionIsSourceTruth = true` only when `coordinateUse` is
  `source-coordinate`. For `operator-family-coordinate` or
  `regional-coordinate`, the report must label the render point as a
  representative public coordinate and keep any exact-site implication out of
  Summary, Sources, and Raw data.
- Elevation cache rows may show `elevationM`, but the report must mark DEM
  provenance as a source gap until `elevationProvenanceStatus` is
  `dem-provenance-complete` with dataset, version, resolution, datum,
  tile/cell, sample coordinate, timestamp, license, citation, and non-claim
  metadata.
- `terrainMaskDeg = 0` with `terrainMaskSourceId = default-unknown` is a source
  gap for local horizon masking. It may still feed the modeled elevation
  threshold, but it must not be described as measured terrain clearance.
- Station RF profile fields remain source gaps when any of
  `antennaDiameterM`, `peakEirpDbm`, or `txPolarization` is null. Modeled
  throughput, jitter, latency, rain impact, and handover decisions cannot close
  those RF gaps.
- Missing coordinate-authority rows, missing elevation-cache rows, malformed
  DEM metadata, or unresolved station ids must fail closed: show `Source gap`
  for the station field and keep downstream visibility/handover rows from
  claiming stronger station evidence than the runtime payload carries.

### Report Presentation

The report should make station lineage visible in every reading mode:

- Summary: show compact chips for pair tier, station coordinate authority,
  render-position truth, elevation source kind, terrain-mask default status,
  and station RF source gap when present.
- Sources tab: render a station ledger table with station id, display name,
  disclosure precision, coordinate use, render-position truth, coordinate
  authority, coordinate source URL/note, elevation source id/kind/provenance,
  terrain mask source/default flag, and RF profile status.
- Visibility tab: cite station-side source ids such as
  `visibility:<stationId>:<satelliteId>` and include the station coordinate,
  elevation, terrain-mask, and effective threshold lineage used for the row.
- Handover tab: cite the same station lineage through the visibility candidate
  that produced the modeled service-layer event; do not imply measured RF
  handover.
- Models tab: explain how station elevation, terrain-mask defaults, RF
  unavailable placeholders, and carrier/model anchors affect formulas and
  non-claims.
- Raw data: preserve the full `dataCompleteness.stationPrecision`,
  `dataCompleteness.stationRfProfiles`, and `pairSourceAttribution` payloads
  so the station table can be audited without reading DOM text.

If a station field is unavailable, the report should show `Source gap` and the
source id or fixture path that proves the gap. Empty strings, zeros, and nulls
must not be silently formatted as ordinary values when they mean missing source
truth.

## Atmospheric / Rain Lineage

Rain impact has two separate source surfaces:

1. The scenario rain-rate value selected for the projection.
2. Atmospheric lookup rows used or disclosed by the runtime payload.

The report must keep these separate. A rain-rate slider or report URL
parameter is a `Simulation input`; it is not local measured weather,
climatology, or a calibrated rain-statistics source. Atmospheric lookup rows
should be listed from `dataCompleteness.atmosphericLookups` with their source
name, midpoint/cell coordinates, lookup value/unit, interpolation status,
provenance truth class, source id, and non-claim.

Current boundary:

- `rainRateMmPerHour` is a scenario input.
- Runtime atmospheric lookup rows may carry unavailable lookup values.
- When `lookupValue` is null, the report must show `Source gap` and must not
  describe the modeled rain impact as local observed weather.
- Standards-backed rain attenuation formulas remain in Models; lookup source
  authenticity remains in Sources.

## Satellite / TLE Lineage

The globe and the report must read satellite data from the same runtime
projection payload. The globe may transform how satellite actors are displayed,
but it must not create a second source of satellite truth that the report cannot
cite.

### Source Inventory

Satellite rows come from bundled public orbit snapshots, not from a live browser
fetch to an upstream catalog service.

| Source surface | Runtime path or field | Report responsibility |
| --- | --- | --- |
| Network snapshot manifest | `/fixtures/satellites-network/manifest.json` | Show the manifest as the selected satellite inventory ledger when `sourceMode` is `network-snapshot`. |
| Network snapshot TLE files | `/fixtures/satellites-network/leo-2026-05-18T22-36-10Z.tle`, `/fixtures/satellites-network/meo-2026-05-18T22-36-10Z.tle`, `/fixtures/satellites-network/geo-2026-05-18T22-36-10Z.tle` | Cite per-orbit source paths, record counts, epoch ranges, and freshness. |
| SATCAT summary | `/fixtures/satellites-network/satcat-summary.json` | Use only for constellation/operator-family membership summaries; do not treat it as ephemeris. |
| Local fallback snapshots | `/fixtures/satellites/leo-scale/oneweb-2026-05-15T12-00-00Z.tle`, `/fixtures/satellites/multi-orbit/meo/galileo-2026-05-13T01-28-37Z.tle`, `/fixtures/satellites/multi-orbit/geo/commercial-geo-top30-2026-05-13T01-28-37Z.tle` | Show `fallback-local-snapshot` or `local-snapshot` explicitly when these paths feed the result. |
| Manual refresh command | `npm run refresh:tle` | Treat as maintenance provenance only. Runtime and normal builds consume bundled files. |

Current network snapshot manifest values are:

| Orbit | Source file | Manifest count | Format / API class | Epoch range UTC |
| --- | --- | ---: | --- | --- |
| LEO | `leo-2026-05-18T22-36-10Z.tle` | 600 | `tle-3le` / `celestrak-gp-tle` | `2026-05-10T16:40:08.249Z` to `2026-05-12T08:00:01.000Z` |
| MEO | `meo-2026-05-18T22-36-10Z.tle` | 33 | `tle-3le` / `celestrak-gp-tle` | `2026-04-25T15:10:52.485Z` to `2026-05-12T13:12:24.687Z` |
| GEO | `geo-2026-05-18T22-36-10Z.tle` | 30 | `tle-3le` / `celestrak-gp-tle` | `2026-05-11T06:21:38.641Z` to `2026-05-12T20:33:28.077Z` |

The manifest's generation timestamp is `2026-05-18T22:36:10.000Z`; its source
policy is `refresh-artifact`; its catalog-number compatibility is
`tle-limited-5-digit-catalog`. If a future OMM source is selected, the same
report shape applies with `format` set to `omm-json` or `omm-csv`,
`apiClass` set to `celestrak-gp`, and catalog compatibility set to
`omm-nine-digit-catalog-capable`.

### Parse And Acceptance Pipeline

The report must preserve the distinction between source rows, parsed rows,
runtime-accepted rows, and display rows.

1. `loadDefaultTleSources()` resolves the bundled source set. It prefers the
   network snapshot manifest when the manifest shape is valid and the files can
   be fetched; otherwise it falls back to the local snapshot paths.
2. `parseOrbitSourceText()` parses each orbit source. TLE input accepts 2-line
   or 3-line groups; OMM input accepts JSON or CSV rows. OMM rows must include
   the propagation fields needed to build a runtime satrec.
3. `buildRuntimeTleSourceParseStats()` records raw group count, parsed count,
   parser failure count, NORAD ranges, COSPAR coverage, classification counts,
   drag-term coverage, and optional SATCAT membership counts.
4. `toRuntimeOrbitRecords()` converts parsed TLE/OMM rows into
   `RuntimeOrbitRecord` rows.
5. `capTleRecords()` applies interactive compute caps before visibility:
   LEO 200, MEO 100, GEO 60.
6. `computeRuntimeProjection()` filters the capped records to the orbit classes
   supported by both selected stations. These filtered rows are the accepted
   runtime rows for visibility and handover.
7. `buildTleSourceManifest()` reports `recordCount`, `acceptedRecordCount`,
   `rejectedRecordCount`, `parserFailureCount`, `capApplied`,
   `excludedRecordCount`, and `excludedReasonCategories`.

`rejectedRecordCount` is not a synonym for parser failure. It includes records
excluded by runtime caps (`per-orbit-cap`) and records excluded because the
selected station pair does not share that orbit class
(`not-shared-supported-orbit`). Parser failures remain separate and must stay
visible when non-zero.

### Runtime Cap And Display Transform

Runtime caps are compute constraints; display transforms are presentation
constraints. Both must be disclosed, and neither may be described as source
truth.

| Step | Truth class | Fields to cite | Non-claim |
| --- | --- | --- | --- |
| Runtime cap | Display transform | `capDisclosure`, `runtimeInventoryDisclosure`, `tleSources.capApplied` | Caps keep interactive compute bounded; they do not mean the source catalog only contains the capped rows. |
| Accepted runtime rows | Public source | `acceptedTleRecords`, `tleSources.acceptedRecordCount`, `runtimeInventoryDisclosure.acceptedRecordCount` | Accepted means usable for this selected pair after cap and shared-orbit filtering, not operator validation. |
| Visible actors | Display transform | `actorSourceCoverage`, `actorProvenance`, `runtimeInventoryDisclosure.visibleActorCount` | Visible actor count is the number rendered for this pair/window, not the source inventory size. |
| Scene display policy | Display transform | `displayTransforms`, `selected-pair-scene-altitude-compression`, `selected-pair-scene-camera-framing`, `selected-pair-scene-label-density`, `selected-pair-scene-display-lane-offset`, `selected-pair-scene-generic-actor-mesh` | Altitude compression, camera framing, label density, lane offsets, and generic meshes do not alter station or satellite source truth. |

The scene display policy currently uses label-density limits, non-active trail
suppression, camera hints, and altitude compression/log scaling to make LEO,
MEO, and GEO actors readable on one globe. The report must label these as
Display transform even when the underlying source samples are TLE/OMM-derived.

### Visibility And Handover Row References

Visibility rows must cite the accepted satellite row that produced the window.
For each `PairVisibilityWindow`, the report should resolve:

- `satelliteId` and `orbitClass` from the accepted runtime record;
- `sourceId` as `tle:<orbit>` or `omm:<orbit>` according to the accepted row
  format;
- station-side sources as
  `visibility:<stationId>:<satelliteId>`;
- pair intersection source as
  `pair-intersection:<stationAId>:<stationBId>:<satelliteId>`;
- `elevationThresholdDeg` and per-orbit `sampleCadenceSeconds`;
- `intersectionStartUtc` / `intersectionEndUtc`.

Handover rows are model-derived service-layer selection events over those
visibility candidates. A handover row may cite the active policy and the target
satellite row, but it must not claim measured RF handover or packet telemetry.
If a handover `toSatelliteId` cannot be resolved to an accepted TLE/OMM row and
a visibility candidate in the same projection window, the report must mark that
handover lineage as Source gap instead of inferring a satellite source.

### Truth Class And Source Gap Rules

- TLE 3-line source rows use the Public source class at the report level and
  `tle-derived` in runtime provenance.
- OMM JSON/CSV source rows use the Public source class at the report level and
  `omm-derived` in runtime provenance.
- Station registry fields use Public source unless the pair source tier points
  to an authority-backed fixture.
- Visibility windows are model-derived computations over public satellite rows,
  station coordinates, terrain-mask/elevation thresholds, and sample cadence.
- Handover events are model-derived service-layer selections over visibility
  candidates plus the active policy disclosure.
- Runtime caps, actor filtering, altitude compression, camera framing, label
  density, lane offsets, and generic meshes are Display transform.
- Rain rate and selected time window are Simulation input unless a sourced
  weather or schedule payload is present.
- Missing packet traces, missing station RF hardware profiles, missing local
  rain calibration, unavailable atmospheric lookup grids, and unwired antenna
  outputs are Source gap. Do not upgrade them through modeled link metrics.
- A stale, missing, malformed, or unresolvable satellite source manifest is
  Source gap for satellite rows; downstream visibility and handover rows that
  depend on it must fail closed.

## Tab Responsibilities

| Tab | Responsibility | Not responsible for |
| --- | --- | --- |
| Summary | Requirement-facing overview and the most important lineage chips. | Full row inventory. |
| Visibility | Mutual visibility windows, filtering logic, and per-row source class. | Service-level or commercial reachability claims. |
| Handover | Modeled service-layer selection events and policy gates. | Native RF handover or measured operator event logs. |
| Sources | Source ledger: station, TLE, inventory, caps, gaps, and non-claims. | Re-explaining every formula in detail. |
| Models | Standards, formulas, assumptions, RF chain, and policy sources. | Claiming missing operator data as measured data. |
| Raw data | Complete payload for audit/debug. | Main reader comprehension. |

## Requirement Mapping Rules

- Requirement IDs may be shown only when the report has a value or source
  boundary that directly supports the evidence.
- Modeled values must be labelled as modeled, even when they satisfy
  a requirement-facing visualization need.
- Packet-test wording must remain a source gap unless packet traces are
  actually present in the runtime payload.
- Antenna-pattern support must remain a source gap for the selected-pair visual
  runtime path until an antenna output is wired into that path.
- Report-layer deliverables from the consolidated requirements list must not be
  claimed by this standalone HTML report.

## Field Explanation Coverage Audit

This section is the page-by-page field audit for the current report surface.
It records where the report already carries data, where the reader still lacks
an explanation, and where source authenticity or source gaps need a stronger
presentation pattern.

### Coverage Classes

| Class | Use for | Presentation rule |
| --- | --- | --- |
| Metric detail | Summary cards and compact totals. | When Evidence Detail is on, show a short `How to read`, `Source`, and `Not a claim` panel directly under the metric. Truth/source chips stay visible when detail is off. |
| Column guide | Repeated table columns. | Explain each column once per table or table group. Do not attach a help button to every cell. |
| Row drawer | Rows whose interpretation depends on that row's source or gap. | Let the row expand, or provide one row-level info/source button that opens a compact detail block. |
| Source ledger anchor | Fields whose full provenance lives in Sources. | Keep a visible truth/source chip near the field and link or jump to the Sources ledger row. |
| Source issue marker | Any missing, substituted, unavailable, defaulted, or display-only value. | Use a distinct source-gap/source-issue affordance that is not the same as a generic explanation button. It must be visible even when Evidence Detail is off. |
| Raw dictionary | Raw payload keys and debug JSON. | Explain top-level payload groups and their report mappings. Do not annotate every JSON leaf. |

### Current Gap Summary

The current report has a global field-guide helper, but that is not enough.
Readers can still miss explanations because many values are not tied to a
nearby detail panel, a column guide, or a source ledger anchor. The largest
gaps are:

- Summary `Evidence lineage` cards and `Summary field guide` are too detached
  from the values they are supposed to explain.
- Summary metrics and setup rows show values without nearby `How to read`,
  `Source`, and `Not a claim` detail.
- Large Sources tables contain useful provenance data, but their columns lack
  an explicit data dictionary and source issue affordance.
- Models and Raw data need group-level dictionaries instead of long prose that
  only appears before or after the data.
- Existing smoke coverage checks for text presence more than real
  user-visible affordances, so it can pass while the UI still feels
  under-explained.

### Summary Tab Audit

| Surface | Fields | Explanation status | Source status | Recommended presentation |
| --- | --- | --- | --- | --- |
| Evidence lineage cards | Requirement values, pair source, satellite source, station lineage, known gaps | Missing nearby per-card explanation. Current wording can look like labels rather than readable guidance. | Partly present, but source strength and source-gap meaning are not obvious enough. | Metric detail plus Source ledger anchor. Source gaps use Source issue marker. |
| Dashboard cards | Available Time, Handovers | Missing direct explanation of modeled communication duration and event count. | Source is model/runtime-derived but not tied to the card. | Metric detail under each card with value, method, inputs, non-claim. |
| Summary metrics | Visibility Windows, Source Boundary | Missing direct explanation of what is counted and what boundary is being summarized. | Partly present through chips. Needs stronger source issue marker when boundary includes gaps. | Metric detail and Source ledger anchor. |
| Projection setup table | Station A, Station B, time window, duration, shared supported orbits, source tier, evidence kind, precision label, route mode, empty reason | Missing table-level column guide. | Source tier and precision appear, but coordinate authority and render-position truth need a source anchor. | Column guide plus Source ledger anchor for stations and route source. |
| Requirement evidence map | Requirement IDs and short answers for communication time, handovers, rain, CSV/report evidence | Some rows have readable prose, but not all explain what the value cannot prove. | Source class present only at a high level. | Row drawer with `Answer`, `How to read`, `Source`, `Gap / non-claim`. |
| Communication by orbit | Orbit, duration, duration ms | Missing explanation of modeled pair-intersection duration and sample/window limits. | Source is derived from visibility windows but not linked per row. | Column guide plus Source ledger anchor to Visibility. |
| Formulas | FSPL/rain/delay or related formulas when detail is on | Formula presence is useful but not tied to every dependent value. | Standards/model sources are present elsewhere. | Keep as supporting detail, but each dependent metric still needs Metric detail. |

### Requirements Tab Audit

| Surface | Fields | Explanation status | Source status | Recommended presentation |
| --- | --- | --- | --- | --- |
| Coverage matrix | Bucket, requirement ID, requirement, answer/value, how to read, source/truth class, evidence location, gap/non-claim | Best-covered tab because the table already separates the three questions. Still needs a column guide so readers know how to use the matrix. | Source/truth class and gap columns exist. Rows outside runtime evidence must stay clearly labeled as external evidence or source gap. | Column guide for all columns; Row drawer for long gaps and non-claims. |
| Requirement row statuses | All 34 consolidated rows | Some rows may look like satisfaction claims if the source class is not visually prominent. | Source boundary exists in text, but source issue rows need stronger visual treatment. | Source issue marker on any external-evidence or source-gap row. |

### Visibility Tab Audit

| Surface | Fields | Explanation status | Source status | Recommended presentation |
| --- | --- | --- | --- | --- |
| Visibility lineage panel | Satellite source, station source, pair intersection, thresholds, cadence | Present but detached from table cells. | Source classes exist at group level. | Metric detail or compact group detail above the table. |
| Visibility table | Satellite, orbit, source, truth class, Station A source, Station B source, elevation threshold, start UTC, end UTC, duration | Missing per-column definitions and method explanation for pair intersection. | Row-level source ids are present, but station coordinate/elevation/terrain source issues need anchors. | Column guide plus Source ledger anchor for satellite and station source columns. |
| Duration values | Window duration and pair intersection time | Missing explanation that this is modeled mutual visibility over sampled windows. | Derived from public source rows and station inputs. | Metric detail or row drawer for selected/expanded rows. |

### Handover Tab Audit

| Surface | Fields | Explanation status | Source status | Recommended presentation |
| --- | --- | --- | --- | --- |
| Handover lineage panel | Policy, visibility candidate source, station lineage, satellite lineage | Present but not attached to each event. | Model-derived source class should stay visible per event. | Compact group detail plus row-level Source ledger anchor. |
| Handover table | Time UTC, from, to, reason, policy, station lineage, truth class | Missing column guide and non-claim explanation for service-layer selection. | Source is model-derived. Missing packet traces or native RF event logs must remain source gaps. | Column guide plus Source issue marker for missing measured-event evidence. |

### Sources Tab Audit

| Surface | Fields | Explanation status | Source status | Recommended presentation |
| --- | --- | --- | --- | --- |
| Source boundary summary | Source tier, evidence kind, badge label, truth boundary | Needs clearer explanation of how this differs from station, satellite, and model source truth. | Present. | Metric detail with source class definitions. |
| Pair source non-claims | Pair source limits | Mostly explanatory already. | Present, but should link back to summary chips. | Source ledger anchor. |
| Station coordinate and elevation table | Station, coordinate precision, source tier, coordinate authority/note, elevation, terrain mask, effective threshold | Missing column guide. | Source data present, but terrain mask default and DEM provenance gaps need explicit issue markers. | Column guide plus Source issue marker for default/unknown/unavailable rows. |
| Station lineage table | Coordinate truth, authority, URL, note, raw lat/lon, coordinate use, render position, elevation source/provenance, DEM details, terrain mask/source, effective threshold | Data-rich but hard to read without a dictionary. | Source data present; gaps are embedded as values. | Column guide and row drawer for each station. |
| Station RF profile gaps | Antenna diameter/source, peak EIRP/source, Tx polarization/source, boundary | Explanation exists only if the reader understands null/unavailable values. | Source gaps are the point of the table and must be more visible. | Source issue marker always visible; row drawer with impact on modeled claims. |
| TLE source manifest | Source, orbit, policy, records, accepted, rejected, parser failures, cap, health, timestamp | Missing definitions for accepted/rejected/parser failure/cap. | Source present, but runtime cap is a display/compute transform, not catalog truth. | Column guide. |
| Runtime inventory | Orbit, source mode, active, accepted, runtime cap, capped, visible actors | Missing explanation of accepted vs visible vs capped. | Source and display transforms mixed in one table. | Column guide plus Source ledger anchor to display transforms. |
| Satellite / TLE lineage | Orbit, truth class, source, path, format/API, records, accepted, rejected, parser failures, excluded reasons, runtime cap, capped, visible actors | Missing table dictionary and source issue markers for stale/malformed/unavailable future cases. | Source data present. | Column guide and row drawer per orbit. |
| Orbit freshness | Source, truth class, mode, snapshot path, fetched UTC, max epoch UTC, policy, constellation membership | Missing explanation of freshness versus validity. | Source present. | Column guide. |
| Display transforms | Transform, truth class, inputs, non-claim | Explanation mostly present, but should be linked from all fields affected by transforms. | Present as display transform. | Source ledger anchor from Summary and Sources tables. |
| Atmospheric / rain lineage | Source, truth class, midpoint/cell coordinates, lookup value/unit, interpolation, source id, non-claim | Missing column guide and source issue markers when lookup values are unavailable. | Source can be simulation input, standards-derived, or source gap depending on row. | Column guide plus Source issue marker. |
| Source gaps | Field, requirement, truth class, current boundary | Explanation exists but may be read as a worklog unless kept terse. | Present. | Row drawer with user-facing impact, no internal planning language. |

### Models Tab Audit

| Surface | Fields | Explanation status | Source status | Recommended presentation |
| --- | --- | --- | --- | --- |
| Assumptions and limits | Model boundaries and non-claims | Present, but broad. | Source boundaries need anchors to affected model cards. | Compact group detail and Source ledger anchor. |
| Standards used | Standard/citation list | Present. | Present when a model cites it. | Column guide or compact dictionary. |
| Modeled output cards | Kind, model name, unit, truth class, provenance, rain control, applicable standards, non-claim, model inputs | Cards carry much of the data but need a consistent per-field structure. | Source present for model, not always for every input. | Metric detail per card with `Inputs`, `Method`, `Source`, `Not a claim`. |
| Handover policy gates | Policy, threshold, value, truth class, source, model, non-claim | Missing column guide. | Model-derived source present. | Column guide. |
| RF chain cards | Term kind, model name, contribution, truth class, provenance, standards, non-claim, inputs | Needs consistent explanation of contribution and standards-derived versus missing station RF hardware. | Model source present; station RF profile gaps need anchors. | Metric detail plus Source ledger anchor to station RF gaps. |

### Raw Data Tab Audit

| Surface | Fields | Explanation status | Source status | Recommended presentation |
| --- | --- | --- | --- | --- |
| Actor provenance table | Satellite, orbit, source, samples, cadence, first UTC, last UTC, window count, truth class | Missing column guide. | Row-level source class present. | Column guide. |
| Visibility provenance table | Satellite, orbit, source, Station A windows, Station B windows, pair intersection, elevation threshold, cadence, start/end UTC, truth class | Missing column guide. | Row-level source class present. | Column guide. |
| Raw JSON payload | Full runtime result tree | Raw values are available but not individually explained. | Source boundaries are encoded in nested fields but not readable without context. | Raw dictionary for top-level groups; no per-leaf help buttons. |

### Development Order For Coverage

1. Summary first: add nearby detail for Evidence lineage, summary metrics,
   setup rows, requirement map cards, and orbit-duration values.
2. Add table column guides for Requirements, Visibility, Handover, and the
   major Sources tables.
3. Add source issue markers and anchors for station RF gaps, DEM provenance
   gaps, terrain-mask defaults, atmospheric lookup gaps, packet-test gaps,
   antenna-output gaps, runtime caps, and display transforms.
4. Normalize Models cards into consistent `Inputs`, `Method`, `Source`, and
   `Not a claim` blocks.
5. Add Raw data top-level dictionary and report mapping.
6. Extend smoke checks to verify the Evidence Detail toggle reveals the actual
   nearby affordances, not only that guide text exists somewhere in the DOM.

## Interaction Rules

- Use permanent chips for truth/source class. Do not hide them behind a help
  button.
- Use help buttons or expanded explanation blocks for interpretation, method,
  and non-claims.
- Avoid one help icon per table cell. Prefer one explanation per field group
  plus row-level truth chips where row provenance differs.
- Any source gap must be visible whether Evidence Detail is on or off.

## First Implementation Slice

1. Replace the density control with a single Evidence Detail toggle.
2. Keep truth/source chips visible whether Evidence Detail is on or off.
3. Add a compact lineage summary to Summary, Visibility, Handover, Sources,
   and Models.
4. Add source-gap entries for important missing or not-yet-wired data.
5. Extend the selected-pair source report smoke so it checks the Evidence
   Detail toggle, truth chips, lineage summaries, and source-gap text.
