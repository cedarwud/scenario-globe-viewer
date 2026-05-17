# 3GPP / ITU-R Standards References (Public Disclosure Tier)

This folder ships the 12 open-public standards documents that back the
`scenario-globe-viewer` viewer's link-budget, antenna, atmosphere, and
handover compute modules. These are the **Tier B public-disclosed** sources
the viewer uses today (until operator-validated data is supplied by the
customer V-team — see `.agent-memory/reference_3gpp_itu_local_sources.md`).

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

Cite requirements by ID from `/home/u24/papers/itri/requirements-consolidated.md`:

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

## Update procedure

When a newer revision of a standard is released, replace the PDF in place
and update the `Spec` column above. Do not delete superseded copies inside
the same delivery — keep them in `archive/` if downstream audits need
historical reference.
