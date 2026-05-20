# Multi-Station Selector — Truth-Source Hardening Roadmap

Draft date: 2026-05-20
Status: proposed v1, SDD-only. No implementation in this slice.

## Scope

This document defines the truth-source hardening layer for the selected-pair
runtime route (`/?stationA=<id>&stationB=<id>`). It turns the findings from
`deep-research-report-v2.md` plus the adjudication review into an executable
roadmap.

This is not a greenfield replacement for
`tle-first-fidelity-uplift.md`. It reconciles with that wave-2 SDD:

- F2 antenna + RSRP remains blocked by spike S2a/S2b.
- F3 atmospheric chain remains blocked by legal spike S3.
- F4 rain climatology remains blocked by legal spike S3.
- F6 elevation + terrain already shipped a runtime wiring layer but still
  needs stronger upstream DEM provenance.
- F7 live TLE + constellation already shipped a CelesTrak snapshot layer but
  does not yet provide GP/OMM-first ingestion.
- F8 cap + policy surfacing already shipped Row 5/CSV disclosures, but the
  inventory/cap language needs stronger disambiguation.
- F9 visual evidence already shipped selected evidence surfaces; this SDD only
  changes truth semantics and provenance, not visual polish.

The goal is to reduce the amount of modeled/default data and to make every
remaining modeled/default/unavailable field impossible to mistake for real
operator/customer truth.

## 1. Verdict Framing

There are two different verdict frameworks:

| Framework | Verdict | Meaning |
| --- | --- | --- |
| Functional demo delivery | PASS WITH RISKS | Bucket A in `requirements-consolidated.md` is functionally covered by the selected-pair demo, standards-derived models, and disclosure surfaces. |
| Strict truth-source hierarchy | FAIL | Not every data-driven behavior uses the strongest currently available public or official source. Several values remain modeled, weakly sourced, defaulted, or unavailable. |

These verdicts are not contradictory. The first asks whether the demo exists
and is reviewable. The second asks whether every field uses the strongest
available source of truth. This roadmap addresses the second framework without
undoing the first.

## 2. Source Truth Hierarchy

Every field in the selected-pair runtime should resolve to the strongest
available class below, in order:

1. `operator-validated` - retained operator/customer authority package or
   measured trace.
2. `official-public` - official government, standards body, or official
   operator filing/source.
3. `open-public` - public source with stable provenance and acceptable
   redistribution or derived-cache terms.
4. `standards-derived` - formula/model from 3GPP, ITU-R, or equivalent
   standards source, with explicit input provenance.
5. `modeled-control` - repo-owned runtime control, performance cap, threshold,
   or policy parameter.
6. `modeled-estimate` - standards-informed estimate using repo-owned anchors.
7. `default-unknown` - default value used because source data is missing.
8. `unavailable` - field intentionally absent because no defensible source is
   available.
9. `display-only` - render/camera/label/mesh transform that does not alter
   source truth.

Rules:

- Do not backfill fake values.
- Do not present same-operator-family inference as pair-level operator
  attestation.
- Do not present source inventory as the same thing as interactive runtime cap
  or visible actor count.
- Do not present modeled throughput, jitter, or latency as measured network
  KPI.
- Do not bundle restricted standards grids until legal spike S3 is closed.
- Do not wire RF/EIRP/RSRP values until spike S2a/S2b is closed or a defensible
  public/operator source is available.

## 3. Current SDD-Ready Facts

These facts are verifiable in the current repo and should be treated as the
baseline for future implementation prompts:

1. `runtime-projection.ts` caps interactive compute at LEO 200, MEO 100, GEO 60.
2. `runtime-projection.ts` uses clear-sky reference capacity LEO 200, MEO 100,
   GEO 50 Mbps.
3. `runtime-projection.ts` uses baseline jitter LEO 3, MEO 5, GEO 8 ms.
4. `runtime-projection.ts` uses fixed processing delay 2 ms.
5. `runtime-projection.ts` gates rain attenuation to 10-30 GHz.
6. `runtime-projection.ts` uses nominal altitude LEO 550 km, MEO 23222 km, GEO
   35786 km for modeled link metrics.
7. Runtime policy defaults share hysteresis 2 dB, minimum visibility window
   60000 ms, and latency budget 600 ms.
8. The default runtime policy is `cross-orbit-live`.
9. The local fallback LEO TLE path points at the Starlink 2026-05-12 snapshot.
10. The network snapshot manifest currently carries LEO 600, MEO 33, GEO 30
    records.
11. The local fallback source inventory is much larger than the network
    snapshot for LEO, and `requirements-consolidated.md` records roughly
    11015 local Starlink + OneWeb satellites.
12. `buildDefaultTimeWindow` resolves to 360 minutes.
13. `inferPairSourceTier` currently returns `public-disclosed` when station A
    and station B share canonical `operatorFamily`.
14. Same `operatorFamily` is an inference, not pair-level operator attestation.
15. The public station registry methodology mixes operator disclosures,
    Wikipedia, FCC/ITU filings, WTA profiles, news, and other public sources.
16. Station elevation source is currently `open-elevation-cache`.
17. Station terrain-mask source is currently `default-unknown`.
18. RF chain breakdown exists but all five terms are `unavailable` with null
    `contributionSignedDb`.
19. Atmospheric lookup sources are enumerated, but all current lookup values
    are null and interpolation is `unavailable`.
20. Station RF profile fields `antennaDiameterM`, `peakEirpDbm`, and
    `txPolarization` are null.
21. Carrier defaults are orbit-class defaults: LEO Ku 12 GHz, MEO L 1.5 GHz,
    GEO Ka 20 GHz.
22. SATCAT operator family is currently a regex/owner-code heuristic, not
    official owner validation.
23. `verify-tle-first-data-completeness.mjs` already asserts Row 5 text for
    `LEO: 200 cap / 600 inventory`.

## 4. Assumptions

These are defensible enough for planning but must remain marked as assumptions
until re-verified by a slice:

| ID | Assumption | Required follow-up |
| --- | --- | --- |
| A1 | CelesTrak terms allow the current redistributed snapshot pattern with attribution. | Reconfirm in F7/TH5 source-policy notes. |
| A2 | Space-Track GP/GP_History and OMM are stable enough to design a GP/OMM-first ingestion path. | Confirm account, rate-limit, and redistribution constraints before implementation. |
| A3 | Copernicus DEM GLO-30/90 derived elevation cache can be bundled with citation. | Confirm derived-cache license posture before replacing the elevation source. |
| A4 | USGS 3DEP can improve US-resident station elevation/horizon masks. | Audit US-station coverage and fallback behavior. |
| A5 | Current 600 ms / 2 dB / 60 s handover thresholds are repo-owned defaults, not numeric 3GPP mandates. | Reframe as `modeled-control` unless a standard/operator anchor is supplied. |
| A6 | Measured packet trace, real service latency/jitter/throughput, pair routing, and SLA truth cannot be replaced by public data. | Keep as unavailable until an authority package is delivered. |

## 5. Open Questions And Blockers

| ID | Question | Blocks |
| --- | --- | --- |
| Q1 | Can ITU-R P.835/P.836/P.837/P.838/P.839/P.840 grid contents be bundled in public fixtures, or only referenced/fetched with a license banner? | TH6, existing F3/F4 |
| Q2 | What is a defensible satellite `peakEirpDbm` anchor? The older TR 38.821 table interpretation is not accepted as EIRP truth. | TH7, existing F2 |
| Q3 | Does the 2 dB cross-orbit hysteresis survive once EIRP and antenna gain enter the proxy? | TH7, existing F2/F5 |
| Q4 | Should this roadmap supersede wave-2 F-slices, or remain a narrow source-hardening overlay? | SDD governance |
| Q5 | Should same-family pairs be renamed to `inferred-same-operator-family`, or should `public-disclosed` be gated by an explicit `pairAttestation` field? | TH1 |
| Q6 | Is Space-Track migration in scope now, given account/rate-limit/parser blast radius, or deferred after CelesTrak OMM/JSON support? | TH5 |
| Q7 | Should station `sourceAuthority` be in the first implementation slice, even though it requires re-authoring 69 registry rows? | TH1/TH2 |
| Q8 | Should report-layer requirements R1-D5/K-F8 be covered by this SDD, or tracked in a separate delivery/report SDD? | SDD scope |

## 6. Risk Register

| ID | Risk | Mitigation |
| --- | --- | --- |
| R1 | Bundling ITU grids before S3 closes may violate redistribution terms. | Treat TH6 as blocked until S3 is resolved. |
| R2 | FCC/ITU station RF data will be incomplete and jurisdictionally uneven. | Store per-field provenance and keep missing fields `unavailable`. |
| R3 | GP/OMM-first migration touches parser, manifest, freshness, and smoke tests. | Split TH5 into parser-addition and default-source-switch sub-slices. |
| R4 | Registry schema changes can collide with concurrent sessions. | Use prep-PR pattern and specific `git add` only. |
| R5 | Renaming source tiers can break tests and user-facing copy. | Add compatibility aliases and update D6/G1 smokes in the same slice. |
| R6 | UI may still imply real KPI through precise values. | Move modeled-anchor disclosures into Row 5/CSV/debug before changing formulas. |

## 7. Slice Plan

### Slice TH1 - Disclosure Narrowing + Inventory Disambiguation

Status: ready to design. No S2a/S2b/S3 dependency.

Purpose:

- Remove over-strong `public-disclosed` semantics from same-family inference.
- Separate inventory-of-record, inventory-on-disk/fallback, accepted records,
  runtime cap, and visible actor count.
- Surface orbit-class carrier defaults and modeled metric anchors more clearly.

Decision point:

- Option A: add explicit `pairAttestation` data and gate `public-disclosed` on
  that field.
- Option B: keep registry unchanged and rename unattested same-family pairs to
  `inferred-same-operator-family`.

Acceptance:

- Same-family pairs without pair-level attestation no longer display copy that
  implies operator-validated pair capability.
- Row 5 and CSV expose, per orbit, at least: inventory source mode, inventory
  count, accepted count, cap, and capped-at-runtime.
- Runtime disclosure distinguishes network-snapshot inventory from local
  fallback inventory when both are relevant.
- Carrier selection text (`orbit-class-default`) is visible in Row 5 or an
  equivalent disclosure, not only in raw CSV/debug.
- D6 smoke asserts the new source-tier/cap/inventory/carrier disclosures.

Likely files:

- `src/features/multi-station-selector/tier-inference.ts`
- `src/features/multi-station-selector/runtime-data-completeness.ts`
- `src/features/multi-station-selector/runtime-projection-csv.ts`
- `src/features/multi-station-selector/v4-projection-side-panel.ts`
- `scripts/verify-tle-first-data-completeness.mjs`
- registry schema only if Option A is selected.

Do not touch R6 hot files unless a later prompt explicitly scopes that work.

### Slice TH2 - Station Source Authority

Status: ready for prep design, implementation should be separate from TH1 unless
Option A requires a minimal schema field.

Purpose:

- Add station-level source authority labels so `exact-coords` does not imply
  official filing truth when the source is secondary.

Candidate values:

- `official-filing`
- `operator-web`
- `teleport-directory`
- `secondary-web`
- `wikipedia`
- `news`
- `mixed-public`
- `unknown-public`

Acceptance:

- Every station row has `coordinateSourceAuthority`.
- Runtime station precision state and CSV export include the authority field.
- UI disclosure explains precision separately from source authority.
- D6 asserts the field is present and non-empty.

Risk:

- Requires a 69-station registry prep pass. Keep it isolated from runtime
  wiring.

### Slice TH3 - DEM Elevation Provenance Replacement

Status: ready for research/design, not a quick implementation.

Purpose:

- Replace or augment `open-elevation-cache` with reproducible DEM provenance.

Candidate sources:

- Copernicus DEM GLO-30/GLO-90.
- NASA SRTMGL1 V003.
- USGS 3DEP for US stations.

Acceptance:

- Each station elevation record includes dataset id, version, tile/cell
  reference, sampling method, timestamp, and license/citation note.
- Runtime still reads bundled fixture/cache only; no browser DEM fetch.
- Negative elevations remain allowed for visibility geometry.
- Rain attenuation input still clamps below sea level to 0 where required by
  the model.
- D6 asserts elevation source metadata is present.

Relationship to existing F6:

- F6 already wired `elevationM` and `terrainMaskDeg`.
- TH3 hardens F6 upstream provenance and cache schema.

### Slice TH4 - DEM Terrain/Horizon Mask

Status: dependent on DEM pipeline from TH3.

Purpose:

- Replace bulk `terrainMaskDeg = 0` defaults with DEM-derived horizon masks
  where possible.

Acceptance:

- Every terrain mask has `terrainMaskSourceId` and `terrainMaskIsDefault`.
- DEM-derived masks include viewshed/horizon method metadata.
- Unsupported stations remain `default-unknown`, not fake zeros.
- Visibility deltas against the five walkthrough URLs are captured and bounded.
- D6 asserts mask source coverage and default/non-default counts.

Relationship to existing F6:

- F6 accepts 0 as unknown/default.
- TH4 adds a stronger source for stations where open DEM coverage is adequate.

### Slice TH5 - GP/OMM-First Orbit Source

Status: design needed. Higher blast radius than TH1-TH4.

Purpose:

- Move from TLE/3LE-first ingestion to GP/OMM/JSON/CSV-capable ingestion while
  preserving bundled snapshots and fallback behavior.

Candidate path:

1. Add parser support for CelesTrak OMM/JSON/CSV output while keeping existing
   TLE parser.
2. Extend manifest schema with `format`, `apiClass`, `sourcePolicy`, and
   `catalogNumberCompatibility`.
3. Only after parser and smokes are stable, consider Space-Track GP/OMM as an
   optional official-public refresh source.

Acceptance:

- TLE fallback behavior remains deterministic.
- Freshness/state disclosure includes format and source API class.
- A smoke covers a catalog number that would be unsafe in legacy TLE-only
  assumptions.
- D6 compares manifest/debug/CSV for the new fields.

Relationship to existing F7:

- F7 shipped CelesTrak snapshot refresh.
- TH5 extends F7 toward GP/OMM-first source robustness.

### Slice TH6 - Atmospheric Lookup Layer

Status: blocked by S3.

Purpose:

- Replace null atmospheric lookup placeholders with site/pair-specific values
  where license permits.

Candidate sources:

- ITU-R P.835/P.836/P.837/P.839/P.840 where redistribution is allowed.
- NASA GPM IMERG for precipitation context.
- ECMWF/C3S ERA5 for reanalysis fields where appropriate.

Acceptance:

- No restricted grid is bundled before S3 closes.
- Runtime completeness shows source, cell, interpolation, value, unit, and
  license/citation id per lookup.
- Rain slider becomes an override/control, not the primary truth source.
- Existing modeled outputs remain labeled when lookup coverage is incomplete.

Relationship to existing F3/F4:

- TH6 is the truth-source version of F3/F4 and inherits their blockers.

### Slice TH7 - Station RF Profile + Carrier Authority

Status: blocked by S2a/S2b for numeric RF proxy, partially open for public
filing research.

Purpose:

- Fill station RF profile and carrier assumptions from public filings or
  operator documents when available.

Candidate sources:

- FCC IBFS/ULS for US earth stations.
- ITU filings where accessible.
- Operator teleport specs or official web disclosures.

Acceptance:

- RF fields are per-field sourced; partial records are allowed.
- Missing fields remain `unavailable`.
- Carrier selection becomes station/pair/satellite-family aware where a
  defensible source exists.
- RSRP/EIRP proxy remains disabled until S2a/S2b closes.

Relationship to existing F2/F5:

- TH7 supplies source authority for F2/F5.
- It must not introduce EIRP or antenna defaults without source provenance.

## 8. Acceptance Strategy

Every implementation slice derived from this SDD must include:

- runtime data-completeness contract update, when the slice adds a source field;
- CSV parity update;
- D6 smoke assertion;
- Row 5 or Row 6 disclosure update when user-visible semantics change;
- no fake data;
- no silent downgrade from a stronger source to a weaker source;
- explicit blocked/unavailable status when source data is missing.

Minimum smoke set for TH1:

- `npm run build`
- `node scripts/verify-tle-first-data-completeness.mjs --port=<port>`
- `node scripts/verify-g1-bucket-a-coverage.mjs --port=<cdp-port>`
- `node scripts/verify-information-density.mjs --port=<cdp-port>`

Additional smokes are required for slices that touch runtime compute, source
loading, or large fixture data.

## 9. Constraints

- This SDD does not authorize implementation by itself; each slice needs its
  own implementation prompt or task.
- Keep registry schema edits in prep commits when they touch many station rows.
- Use specific `git add <path>` only.
- Do not touch R6 hot files unless explicitly scoped.
- Do not add new customer-specific terminology to source code or UI strings.
- Documentation may refer to external authority requirements when needed, but
  implementation identifiers should remain neutral.

## 10. Recommended First Implementation Slice

Start with TH1.

Reasons:

- It closes the highest-severity semantic risk: same-family inference presented
  too strongly.
- It has no S2a/S2b/S3 blocker.
- It mostly extends existing disclosure surfaces that already pass D6.
- It reduces reviewer confusion before larger data ingestion work.
- It can be reviewed without changing physics, RF math, DEM processing, or
  orbit propagation.

Do not start with TH3/TH4/TH5/TH6/TH7 until TH1 is accepted, because those
slices have larger data, licensing, or parser blast radius.
