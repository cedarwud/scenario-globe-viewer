# Multi-Station Selector - TH7 Public RF Filing Source Gate

Status: docs-only gate recorded.
Decision date: 2026-05-21.

This document does not authorize runtime, fixture, schema, test, or
default-source changes. Current runtime RF-chain terms and station RF profile
fields remain `null` / `unavailable`.

## Decision

TH7 public filing research may build an availability/provenance matrix for RF
fields. It may not implement numeric RF values, defaults, station RF fixtures,
EIRP values, carrier defaults, or received-power proxy arithmetic.

Satellite Tx EIRP, station antenna diameter, station filing EIRP, carrier
band/frequency, polarization, bandwidth, and `T_sys` are separate roles. A
source for one role must not be reused as authority for another role.

## RF Source Hierarchy

For every RF field, use the strongest applicable source in this order:

1. Official regulator filing or authorization: FCC ICFS/Form 312/Schedule B,
   and ITU BR IFIC/SNL where accessible.
2. Official operator disclosure or station technical sheet.
3. Other public source as locator/context only. It may point to a callsign,
   filing, site, or document, but is not numeric RF authority.
4. `unavailable` when no defensible source exists.

The hierarchy is per-field. A station may have an official source for location
and antenna diameter while carrier EIRP, bandwidth, polarization, or `T_sys`
remain `unavailable`.

## Official Source Notes

FCC ICFS:

- FCC 23-1 describes ICFS as the database, application-filing, and processing
  system for international and satellite services, with public access to filed
  information:
  https://docs.fcc.gov/public/attachments/FCC-23-1A1_Rcd.pdf
- FCC DA-24-635 announced a public preview of the upgraded ICFS cloud platform:
  https://docs.fcc.gov/public/attachments/DA-24-635A1.pdf

FCC Form 312 Schedule B:

- FCC Form 312 Schedule B is the earth-station technical/operational
  description form. Its fields include location/site items, antenna size/gain
  entries, frequency-band rows, polarization, emission designators,
  modulation/service descriptions, and maximum EIRP/EIRP-density per carrier:
  https://docs.fcc.gov/public/attachments/FCC-312A1.pdf
- Treat Schedule B values as field-specific filing facts. Do not treat station
  carrier EIRP as satellite Tx EIRP, and do not infer `T_sys` unless the filing
  or an attached technical exhibit states it directly.

FCC incumbent earth-station lists:

- FCC DA-25-960 says the updated incumbent earth-station list exposes items
  such as licensee/registrant/applicant name, earth-station callsign, site ID,
  antenna ID, dish count, address, GPS coordinates, and file numbers:
  https://docs.fcc.gov/public/attachments/DA-25-960A1.pdf
- These lists are useful locators and cross-checks. They are not full RF-profile
  authority by themselves.

ITU BR IFIC and SNL:

- ITU describes BR IFIC Space Services as containing particulars of frequency
  allotments and assignments to space services, published every two weeks:
  https://www.itu.int/en/ITU-R/space/brific/Pages/default.aspx
- ITU publishes the BR IFIC schedule here:
  https://www.itu.int/en/ITU-R/space/brific/Pages/brificSchedule.aspx
- ITU states that detailed network characteristics are in BR IFIC databases,
  with graphical information in GIMS:
  https://www.itu.int/en/ITU-R/space/Pages/brificDatabase.aspx
- ITU's SNL quarterly page says the quarterly publication ceased and points to
  online services for up-to-date space-station and earth-station information;
  the historical file list includes CSV sections:
  https://www.itu.int/en/ITU-R/space/snl/Pages/SNLquaterlyPublication.aspx
- The SNL frequency/orbital-position page is a locator surface for lists of
  space networks and earth stations:
  https://www.itu.int/snl/freqtab_snl.html
- Access, redistribution, and storage terms may be constrained. Treat BR IFIC
  and SNL output as `restricted` in the availability matrix until the access
  and redistribution path is reviewed.

## Field Policy

No numeric values are authorized in this gate.

| Field | Acceptable authority | Implementation status now | Blockers | Notes |
| --- | --- | --- | --- | --- |
| `antennaDiameterM` | FCC Form 312 Schedule B antenna entry, official regulator earth-station filing, or official operator station sheet. | `unavailable`; gate-only matrix may record whether source exists. | Per-field provenance schema; no fixture/schema change authorized. | Station antenna diameter is not satellite antenna gain and not EIRP. |
| Station antenna gain / pattern if available | Official antenna manufacturer/operator exhibit attached to filing, regulator technical exhibit, or official operator station sheet. | `unavailable`; gate-only. | Pattern format, frequency applicability, off-axis convention, provenance schema. | Do not infer gain from diameter unless a later implementation slice explicitly authorizes a model and labels it modeled. |
| Station filing EIRP or EIRP density | FCC Form 312 Schedule B carrier rows or equivalent official regulator/operator filing. | `unavailable`; gate-only. | Per-carrier mapping, unit conversion policy, transmit/receive mode split, provenance schema. | This is station/carrier filing EIRP, not satellite Tx EIRP. |
| Carrier band/frequency / emission designator | FCC Form 312 Schedule B frequency/emission rows, ITU BR IFIC/SNL where accessible, or official operator carrier sheet. | `unavailable`; gate-only. | Pair/satellite mapping and redistribution/storage decision. | Other public sources may locate likely filings only. |
| Tx/Rx polarization | FCC Form 312 Schedule B polarization row, ITU filing field where accessible, or official operator technical sheet. | `unavailable`; gate-only. | Per-carrier direction and station-role mapping. | Do not default to circular/linear without per-field source or explicit unavailable path. |
| Satellite `peakEirpDbm` | Official satellite filing, official operator satellite technical disclosure, or S2a-approved standards anchor if explicitly accepted. | `unavailable`; numeric proxy remains blocked. | S2a anchor decision; S2b if used in handover; provenance schema. | Do not use station filing EIRP as satellite Tx EIRP. |
| `txAllocatedBandwidthHz` | Official carrier assignment, regulator filing row, operator carrier plan, or S2a-approved anchor. | `unavailable`; numeric proxy remains blocked. | S2a anchor decision; carrier mapping; provenance schema. | Bandwidth authority is separate from frequency-band presence. |
| `T_sys` | Official equipment/operator technical sheet, filing exhibit that states system noise temperature, or S2a-approved anchor. | `unavailable`; numeric proxy remains blocked. | S2a anchor decision; receiver-chain role split; provenance schema. | Do not derive from generic station class unless a later modeled path is explicitly approved. |

## Availability Matrix Template

Use this template for research notes or a future reviewed artifact. It carries
no numeric RF values.

| station id | field | candidate source system | filing/callsign/file number/document locator | authority class | status | access date | redistribution/storage note | extraction locator | non-claim |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `<station-id>` | `<field-name>` | `FCC ICFS / FCC Form 312 / ITU BR IFIC / ITU SNL / operator sheet / locator-only public source` | `<callsign-or-file-or-url>` | `official-filing / operator-disclosure / locator-context / unavailable` | `available | ambiguous | restricted | missing` | `YYYY-MM-DD` | `<store citation only / derived row allowed / restricted / do not store>` | `<page/table/exhibit/row locator>` | `<why this is not measured service telemetry and what role it does not claim>` |

If a source is `restricted`, store only the minimum citation/locator allowed by
the reviewed access terms. Do not commit raw source output.

## Stop Rules

- No raw FCC, ITU, or operator scrape corpus or bulk data in git.
- No credentials, private session state, cookie data, or browser/account
  artifacts in git or docs.
- No numeric defaults or copied RF values without per-field provenance.
- No partial RF proxy. If any required term is `unavailable`, the proxy stays
  `unavailable`.
- No Row 5, Row 6, UI, or CSV semantics change unless the implementation slice
  updates D6, G1, and information-density checks together.
- No fixture, schema, runtime, script, or test edits from this docs-only gate.

## Current Protections

- D6 already asserts the RF chain and station RF fields are unavailable today.
- CSV export already has RF-chain and station-RF sections, and D6 compares CSV
  parity against the runtime disclosure surface.
- There is no dedicated unit test yet for RF unavailable placeholders. A future
  implementation slice should add one before landing mixed-provenance RF data.

## Known Contract Mismatch

The SDD target term is `atmospheric-composite`, while current code/D6 still use
`rain-attenuation`. Do not fix that mismatch in this slice. Resolve it only in
an implementation slice that updates data completeness, CSV, D6, Row 5/6, and
visible copy together.

## Future Implementation Gate

Before any RF values land:

- S2a/S2b must close, or an explicit `unavailable` path must be accepted for
  the affected proxy and handover decisions.
- The per-field provenance schema must be finalized before station rows or
  carrier rows are authored.
- `runtime-data-completeness.ts`, CSV export, D6, and Row 5/6 disclosure must
  update together if data lands.
- Mixed provenance must be supported: one field can be official while adjacent
  fields remain `unavailable`.
- Tests/smokes for the implementation slice must include `npm run build`,
  relevant unit tests for RF unavailable and mixed provenance,
  `node scripts/verify-tle-first-data-completeness.mjs --port=<port>`, plus G1
  and information-density smokes if visible copy changes.

This document is a source gate only. It records how to research official public
RF filings without changing the current unavailable runtime behavior.
