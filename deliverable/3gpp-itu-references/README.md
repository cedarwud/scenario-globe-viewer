# 3GPP / ITU-R Standards References (Public Disclosure Tier)

This folder ships the 12 open-public standards documents that back the
`scenario-globe-viewer` viewer's link-budget, antenna, atmosphere, and
handover compute modules. These are the **Tier B public-disclosed** sources
the viewer uses today (until operator-validated data is supplied). For the
full delivery-facing source map, see
[`../../docs/data-source-index.md`](../../docs/data-source-index.md) and
[`../../requirements-consolidated.md`](../../requirements-consolidated.md).

All twelve PDFs are open public standards; redistribution as a delivery
artefact is permitted.

## File map

### 3GPP NTN (system + handover)

| File | Spec | Cited in viewer | Requirement IDs covered |
|---|---|---|---|
| `38811-f40.pdf` | 3GPP TR 38.811 (NTN system aspects), §6.6 path loss · §6.7 propagation delay · §6.8 Doppler | `src/runtime/link-budget/free-space-path-loss.ts` | K-A2 (latency/jitter regime) |
| `38821-g20.pdf` | 3GPP TR 38.821 (NTN solutions for 5G NR), §7.3 handover trigger metrics | `src/runtime/link-budget/handover-policy.ts` | K-F4 / R1-F4 (handover strategy switch) |
| `ts_138300v190000p.pdf` | 3GPP TS 38.300 NR overall (mobility chapter background) | walkthrough context | K-F4 / R1-F4 (mobility chain) |
| `ts_138331v190000p.pdf` | 3GPP TS 38.331 RRC (handover messaging detail) | walkthrough context | K-F4 / R1-F4 (handover messaging) |
| `38214-j30.pdf` | 3GPP TS 38.214 NR PHY procedures for data | measurement context | K-F4 (PHY metric definitions) |
| `38215-j20.pdf` | 3GPP TS 38.215 NR PHY layer measurements | measurement context | K-F4 (RSRP / RSRQ definitions) |
| `36214-j00.pdf` | 3GPP TS 36.214 LTE PHY measurements | measurement context | K-F4 (legacy LTE measurement reference) |
| `R1-1913224.pdf` | 3GPP RAN1 contribution (NTN propagation reference) | walkthrough context | K-A2 (latency baseline) |

### ITU-R (atmosphere + antenna)

| File | Spec | Cited in viewer | Requirement IDs covered |
|---|---|---|---|
| `R-REC-P.618-14-202308-I!!PDF-E.pdf` | ITU-R P.618-14, §2.2.1.1 γR = k · R^α · §2.2.1.2 effective slant path | `src/runtime/link-budget/rain-attenuation.ts` | K-A3 (rain) · K-E6 (rain visualisation) |
| `R-REC-P.676-13-202208-I!!PDF-E.pdf` | ITU-R P.676-13 (gas absorption, oxygen + water vapor) | `src/runtime/link-budget/gas-absorption.ts` | K-A2 (atmospheric loss term) |
| `R-REC-S.1528-0-200106-I!!PDF-E.pdf` | ITU-R S.1528 (LEO / non-GSO satellite antenna pattern) | `src/runtime/link-budget/antenna-pattern.ts` | K-A3-a (satellite antenna pattern) |
| `R-REC-S.465-6-201001-I!!PDF-E.pdf` | ITU-R S.465-6 (Earth-station antenna pattern) | `src/runtime/link-budget/antenna-pattern.ts` | K-A3-a (ground antenna pattern) |

## Requirement ID convention

Cite requirements by ID from
[`../../requirements-consolidated.md`](../../requirements-consolidated.md):

- `K-A2` — link quality rules (latency / jitter / network speed) per orbit
- `K-A3-a` — antenna parameters (peak gain, beamwidth, pattern)
- `K-A3-b` — rain attenuation model
- `K-E6` — rain attenuation visualisation
- `K-F4` / `R1-F4` — handover strategy switch
- `K-A1` — multi-orbit switching (refined by user verbal addendum V-MO1 to mean cross-orbit LIVE handover)

## Standards source-tier policy

- **Tier A operator-validated** — empty for now; reserved for operator-supplied retained data.
- **Tier B public-disclosed** — this folder. Open standards, safe to ship.
- **Tier C geometric-derived** — SGP4 + local TLE; see `public/fixtures/`.

For each viewer surface that relies on a Tier B source, the UI displays a
"Public-disclosed · ITU-R/3GPP" badge with the cited section, so a reviewing
engineer can re-verify against the PDF in this folder.

## Retained PDF checksums

These SHA-256 values identify the retained PDF copies in this delivery folder.

| File | SHA-256 |
|---|---|
| `36214-j00.pdf` | `79e0cf9150cf70e05b32ca89d4a590f9c650fb0a74b5db9f4b9ad05542a4c201` |
| `38214-j30.pdf` | `8ecb7ea85bffa5d0b2e50565e09e9d8356aac3cfa24d133669d9bec10d8cd7c9` |
| `38215-j20.pdf` | `e953b2357875f171abc74d13ae5bec85d88ada33ae8b4cbedaf8905945470c2b` |
| `38811-f40.pdf` | `824ea7d359a432778dec9ccdc3a796d801a0f5f881153ebb24f73b1c5b3346ea` |
| `38821-g20.pdf` | `4ac0c498187d91c17b1a8cb900364e6c692d1ce29619bd243a678c2bfdc67378` |
| `R-REC-P.618-14-202308-I!!PDF-E.pdf` | `9812e7f34bd8ca0fe71827c1a7ef389761eefe758d0e8862a1c8de4b7065b249` |
| `R-REC-P.676-13-202208-I!!PDF-E.pdf` | `8c09b2d2c120bdae33f60c2a7abff873374d54075ce0dc71060de8a5507bbe2f` |
| `R-REC-S.1528-0-200106-I!!PDF-E.pdf` | `a3b3d6b79ce267524594e3cb0d82d0300b1faa1c57f47a21ba90c761312f8d41` |
| `R-REC-S.465-6-201001-I!!PDF-E.pdf` | `a813d82235c24ad52681634d5d8a1275da621317ddb1a6754cd983643024f98a` |
| `R1-1913224.pdf` | `7004cbbfaf998c00b87a2d81ee18661cd8fe9b88e76668d4da403380455ab96c` |
| `ts_138300v190000p.pdf` | `a9db286dd98c51cec87fee27d2dd280ac0f69c092884b55f6d0ffd33c6a0d341` |
| `ts_138331v190000p.pdf` | `7fe858d6c52ca0322d857ba02771c37b68010975c9c178fa4025ad6ee2b456b2` |

## Update procedure

When a newer revision of a standard is released, replace the PDF in place
and update the `Spec` column above. Do not delete superseded copies inside
the same delivery — keep them in `archive/` if downstream audits need
historical reference.
