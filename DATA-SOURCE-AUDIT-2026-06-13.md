# Data-Source Verification Audit — 2026-06-13

**Scope:** Independent re-verification of every data source the project claims, across
`requirements-consolidated.md`, `docs/data-source-index.md`, the selected-pair report
HTML/CSV, the link-budget code, the satellite TLE fixtures, and the ground-station
registry. Goal: determine whether each claimed source is real and correctly cited, or
fabricated.

**Headline verdict: zero fabrication.** No fake sources, no invented quotes, no
decorative-but-wrong standards math. The project's own honesty artifacts
(`docs/data-source-index.md`, `deliverable/selected-pair-source-evidence/external-source-reconciliation.md`)
hold up under independent re-check. A set of accuracy/citation defects was found and
fixed; one model (rain) was upgraded from a simplified form to the full ITU-R P.618 path
method at the user's request.

This report is forensic evidence, not an active TODO.

---

## 1. Method

Nine parallel verification agents plus direct checks:

- 5 agents: each link-budget formula vs its cited standard PDF (read the PDF, compared the
  equation, ran a worked numeric check, confirmed the section number).
- 1 agent: report HTML / CSV / generator over-claim audit against the source-class contract.
- 1 agent: TLE/CelesTrak provenance (checksums, orbital-element sanity, live NORAD cross-check).
- 2 agents: ground-station registry citations vs live web sources (~25 sampled claims).
- Direct: PDF checksums, elevation cache vs retained query, JSON validity, numeric rain
  re-computation against the compiled module.

---

## 2. Source verdicts

### 2.1 Standards-derived (link budget). PDFs: 12/12 SHA-256 match `deliverable/3gpp-itu-references/README.md`; all real (page counts correct).

| Module | Cited | Result |
|---|---|---|
| `free-space-path-loss.ts` | TR 38.811 §6.6.2 (Eq 6.6-2) | MATCH. km/GHz variant (92.45) = m/GHz form (32.45). 20 GHz/1200 km → 180.05 dB. Citation correct. |
| latency / slant range (`runtime-projection.ts`) | was "§6.7" | Math sound (slant range = Eq 6.6-3, §6.6.2). §6.7 is "Fast fading model" — **mis-cited**. Fixed → §6.6.2 + clause 5.3.1.1. `+2 ms` processing term is non-standard (now disclosed). |
| `rain-attenuation.ts` + `itu-r-p838-rain-attenuation.ts` | P.618-14 §2.2.1.1 + P.838-3 | Coefficients EXACT vs P.838-3 Table 5 (verified 10/12/20/30 GHz). Was a simplified path (raw geometric slant path). **Upgraded to full P.618 path method** (see §4). |
| `gas-absorption.ts` | P.676-13 Annex 2 | FAITHFUL — full Annex-1 line-by-line (38 O₂ + 9 H₂O lines, exact Tables 1-2) + Annex-2 equivalent-height slant path. One disclosed simplification (oxygen height fixed 5.3 km). 20 GHz zenith ≈ 0.27 dB matches P.676 Fig 1. Label "simplified" *understates* fidelity. |
| `antenna-pattern.ts` | S.1528 + S.465-6 | MATCH, numerically exact (φ=10° → 7 dBi). **Standalone — zero runtime call sites**; not wired into the visible projection (which uses FSPL + gas + rain only). Disclosure accurate. |
| `handover-policy.ts` | TR 38.821 §7.3 | DEFENSIBLE-INSPIRED. §7.3.2.2.2 (Conditional Handover) genuinely lists elevation / RSRP-measurement / timer triggers — exactly the code's gates. `cross-orbit-live` correctly attributed to user addendum V-MO1, not 3GPP. Comment tightened "§7.3" → "§7.3.2.2". |

### 2.2 Satellite TLE (geometric-derived)

- **Data is REAL.** TLE line checksums valid; orbital elements textbook OneWeb (incl ~87.9°,
  mean motion ~13.16); live CelesTrak `gp.php?CATNR=44057` returns ONEWEB-0012 matching the
  shipped fixture to ~5 decimals (epoch-drift only). NORAD IDs map to genuine cataloged
  satellites. CelesTrak is a legitimate public source; `scripts/refresh-tle.mjs` really fetches
  `celestrak.org/.../gp.php?GROUP=oneweb|gnss|geo`.
- **Count claim was overstated.** `requirements-consolidated.md` said "~11015 Starlink+OneWeb".
  Reality loaded at runtime: **600 OneWeb LEO + 33 MEO (GNSS) + 30 GEO = 663**. The 11015 is the
  upstream CelesTrak catalog size, not the copied subset. A 600-record Starlink fixture exists at
  `public/fixtures/satellites/leo-scale/` but is **not default-loaded** (runtime LEO = OneWeb).
  The ≥500 LEO requirement is still met. **Fixed** (reworded).

### 2.3 Ground-station registry (public source) — GENUINE

~25 sampled claims across KSAT, SES/O3b, Intelsat, Eutelsat/OneWeb, Telesat, Viasat/Inmarsat,
Speedcast, Goonhilly, Telespazio/SSC, AsiaSat, Singtel, KT SAT, MEASAT, SANSA, CHT: **zero
fabricated facts, zero fabricated quotes.** Real operators, real press releases.

Selected-pair headline (the demo's main evidence) is solid:
- **SANSA Hartebeesthoek**: coordinates (25°53′S 27°42′E), altitude 1553 m, bands S/C/X/Ku
  (no Ka), LEO/MEO/GEO — all verbatim-supported by the SANSA page.
- **CHT**: ST-2 GEO Ku/C + Taipei & Fang-Shan gateways, CHT–SES O3b mPOWER MEO agreement,
  Taiwan's first OneWeb licence — all supported.
- **CHT–SANSA pair** is labelled `geometric-derived` (no pair attestation). **Justified**: no
  public source proves an official CHT Yangmingshan coordinate or any CHT–SANSA operational
  route. The conservative label is correct.

### 2.4 Elevation — self-consistent and honest

Legacy cache (SANSA 1538 m, CHT 470 m) reproduces exactly from the retained Open-Elevation
query. Registry SANSA updated to operator-stated 1553 m. Retained Copernicus GLO-30 sample
(CHT 489 m, SANSA 1533 m) uses real tile IDs / S3 URLs / cell math and is marked
comparison-only, not adopted into runtime.

### 2.5 Report HTML / CSV — PASS, no over-claim

47 "measured", 34 "packet", 20 "SLA" occurrences — **all** inside non-claim / gap disclaimers.
Pair rendered as `geometric-derived` / `cross-family-geometric`; no `operator-validated` /
`public-disclosed` / Tier-A labels. All five gaps surfaced (packet, RF handover, DEM, local
rain, acceptance thresholds). The generator renders source-class from payload fields and has no
code path that upgrades a modeled/geometric value to measured/operator-validated. No claim
stronger than its weakest source.

---

## 3. Disclosed gaps (NOT defects — openly marked "cannot prove"; do not claim in presentation)

packet-test latency/jitter/throughput/loss · native RF handover / active serving route ·
station RF hardware profile · runtime-adopted DEM elevation + terrain horizon mask · sampled
local rain calibration time series · external acceptance thresholds / final written acceptance.

---

## 4. Fixes applied 2026-06-13 (uncommitted)

| # | File(s) | Change |
|---|---|---|
| 1 | `requirements-consolidated.md` (repo + `/home/u24/papers/itri/`) | "~11015 Starlink+OneWeb" → 600 OneWeb LEO + 33 MEO + 30 GEO = 663; Starlink not default-loaded |
| 2 | registry `*-sources.md` ×3, `.json` ×2, `coordinate-authority.json` ×1 | SANSA URL 404 `products-services2/spaceoperations/` → `programmes/space-operations/` |
| 3 | `runtime-projection.ts` | latency comment "§6.7" → §6.6.2 Eq 6.6-3 + clause 5.3.1.1; `+2 ms` flagged non-standard |
| 4 | `rain-attenuation.ts`, `data-source-index.md` | §2.2.1.2 → §2.2.1.1 Step 8; **then upgraded to full P.618 path method (§4a)** |
| 5 | `handover-policy.ts` | "§7.3" → §7.3.2.2.2 (Conditional Handover) |
| 6 | registry `*-sources.md` | Intelsat→SES date "April 2024" → completed July 2025 |
| 7 | registry `*-sources.md` | KT SAT Kumsan quote URL mis-attributed → marked true source (Keysight × KT SAT press release) |
| 8 | registry `*-sources.md` | CHT Ka band marked as inference (CHT page states C/Ku only) |
| 9 | registry `.json` | `ksat-hartebeesthoek` elevation 1538 → 1553 (same-site consistency with `sansa-hartebeesthoek`) |

### 4a. Rain model upgrade — simplified → full ITU-R P.618-14 path method

The rain model previously used the raw geometric slant path as the effective path, which
over-estimates attenuation. It now implements the full P.618-14 §2.2.1.1 path method:

- specific attenuation γR = k·R^α (Step 5; k/α from P.838-3),
- slant path Ls below rain height (Step 2),
- horizontal projection LG (Step 3),
- horizontal reduction factor r0.01 (Step 6, Eq 5),
- vertical adjustment factor ν0.01 (Step 7, Eq 6; uses station latitude for the χ term —
  pair-midpoint latitude threaded through `runtime-projection.ts`),
- effective path LE = LR·ν0.01 (Step 8); attenuation A = γR·LE (Step 9).

**Domain note (disclosed in code + data-source-index):** the P.618 reduction factors are
calibrated for the R0.01 annual statistic (from P.837). This viewer drives them with the
interactive *instantaneous* rain-rate input — a deliberate what-if use, not the long-term
prediction. No percentage-of-time extrapolation (Step 10). Rain height uses a simplified P.839
rule. The full statistical method (Option A) was rejected because it would couple to the
unresolved `local-rain-calibration` source gap and change the slider's meaning.

Numeric check (compiled module, horizontal pol, sea level):
- 12 GHz / 25 mm/h / 30° → 7.35 dB (raw geometric was ~11 dB)
- 20 GHz / 50 mm/h / 45° → 27.30 dB (raw geometric was ~40 dB)
- monotonic in rain rate (0.09 → 45 dB across 0.1–120 mm/h)
- latitude-sensitive (lat 0° → 30.5 dB, lat 78° → 8.3 dB)
- no NaN/Inf across elevation 1°–90°

### 4b. Displayed-citation consistency (2026-06-13 follow-up)

The §-section fixes initially landed only in code comments + `data-source-index.md`; the
user-facing report HTML still *displayed* the old sections. Aligned every displayed
`standardsRef` string so report = code = docs — in `runtime-modeled-output.ts`, the report
generator's standards-used table + formula badges (`runtime-projection-evidence-report.ts`),
the side-panel disclosures, and `runtime-data-completeness.ts`: latency §6.7 → §6.6.2 +
clause 5.3.1.1; rain §2.2.1 → §2.2.1.1; handover §7.3 → §7.3.2.2. Regenerated the retained
deliverable report HTML/CSV and verified the HTML now contains **zero** stale/bare citations.
Updated hashes + dates in `deliverable/selected-pair-source-evidence/README.md` and
`evidence-manifest.json`. Numeric outputs unchanged (rain = 0 scenario).

---

## 5. Verification record

| Gate | Result |
|---|---|
| `tsc --noEmit` | PASS (exit 0) |
| `npm run build` (tsc + vite) | PASS |
| Rain numeric re-computation (compiled module) | PASS (sane, monotonic, latitude-sensitive, no NaN) |
| `npm run test:m8a-v4.11:slice5` (acceptance smoke; regenerates report) | PASS |
| `npm run verify:g1` | Needs a Vite dev server on :5173 — the `verify:g1` script starts none, so a bare run fails at `panel did not reach ready` (this was the earlier mistaken "env" symptom). With `npm run dev` running it reaches panel-ready (~12 s) and **21/22 rows pass, incl K-E6 rain** (reductions still render: LEO −45%, GEO −80% at 80 mm/h). The lone failure **K-A4** ("TLE telemetry chip carries a recent ISO date") is **pre-existing and unrelated**: `chrome-telemetry.ts` derives the date from a dated filename, but the active `leo-latest.tle` network path is undated → "unknown". That file is not in this audit's changed set. |

Blast-radius note: every measured path defaults to rain = 0, where the rain code returns 0
before any new logic runs, so the wave-1 baselines (`throughputMbps` identical across pairs =
clear-sky) and all numeric outputs (CSV rows all `"rainRateMmPerHour":0`) are unchanged. The
retained deliverable report HTML/CSV were regenerated on 2026-06-13 only to refresh the
displayed standards-section citations (no numeric change); their hashes/dates were updated in
the package README and `evidence-manifest.json`.

---

## 6. Not changed (intentional)

- Dated delivery snapshots under `deliverable/selected-pair-source-evidence/` still carry the
  old SANSA URL — left as historical retained evidence, not back-edited.
- No commit made (per user instruction). Changes are in the working tree; commit with explicit
  `git add <path>` per repo rule R6 (never `git add -A`).

---

## 7. Executor closure change log -- finish-public-data-gaps-2026-06

Branch: `finish-public-data-gaps-2026-06`

Scope note: sections 1-6 above are the original 2026-06-13 audit record plus earlier follow-up
fixes. This section records the Codex executor closure for the remaining public-data gaps.

### 7.1 Task 1 -- K-A4 TLE telemetry chip

Implemented in `src/features/multi-station-selector/chrome-telemetry.ts`.
The chip now prefers the newest retained TLE timestamp from runtime completeness metadata
(`dataCompleteness.tleSources[].sourceTimestampUtc` / snapshot timestamp) and only falls back to
a dated fixture filename when timestamp metadata is absent. The displayed value is an ISO date.

Source class: `public-source` CelesTrak/TLE retained metadata. No operator-validation claim.

Result: G1 K-A4 now reports `2026-05-31` and passes.

### 7.2 Task 3 -- local rain calibration sample

Added retained artifact:
`deliverable/selected-pair-source-evidence/local-rain-calibration-2026-06-13.json`.

The artifact samples public CWA hourly/10-minute observations for stations 46691 Anbu and 46693
Yangmingshan for the retained 2026-06-12/2026-06-13 window. It maps the observed 3 mm/h peak
10-minute intensity to a conservative viewer preset of 5 mm/h.

Source class: `public-source` / public local rain statistic. This is not measured-for-this-link,
not SANSA rainfall, not 2026-05-17 scenario weather, and not a long-term R0.01 statistic.

Docs/report updates: `docs/data-source-index.md`,
`deliverable/selected-pair-source-evidence/external-source-reconciliation.md`,
`runtime-projection-evidence-report.ts`, and the selected-pair evidence manifest now disclose the
retained public sample and its limits.

### 7.3 Task 4 -- selected-pair DEM elevation and terrain mask

Added retained artifact:
`deliverable/selected-pair-source-evidence/copernicus-dem-selected-pair-terrain-mask-2026-06-13.json`.

Runtime fixture updates are limited to the selected pair:

- `cht-yangmingshan`: elevation adopted from Copernicus GLO-30 sample, 489 m; terrain mask set
  to 21 deg from a retained DEM horizon-ring computation.
- `sansa-hartebeesthoek`: operator-stated 1553 m altitude remains authoritative over the
  Copernicus 1533 m sample; terrain mask set to 1 deg from the retained DEM computation.

Source classes: CHT elevation and both terrain masks are `public-DEM-derived`; SANSA elevation is
`public-source` operator-stated. Terrain mask is a local DEM screening proxy, not a surveyed RF
horizon or operator-measured obstruction profile.

Docs/report updates: data-source index, reconciliation notes, fixture provenance, data-completeness
terms, and source evidence report now disclose the selected-pair-only adoption.

### 7.4 Task 5 -- antenna pattern runtime wiring

Added `src/features/multi-station-selector/runtime-antenna-assumptions.ts` and wired
`src/runtime/link-budget/antenna-pattern.ts` into the runtime projection path.

The runtime now applies S.1528 satellite antenna gain and S.465-6 earth-station antenna gain using
disclosed Tier-B default parameters per orbit class. RSRP remains a relative proxy because EIRP is
still unknown. Throughput now includes atmospheric fade plus assumed antenna off-axis loss.

Source classes:

- Antenna pattern formulas: `standards-derived` (ITU-R S.1528-0 Annex 1, ITU-R S.465-6).
- Antenna parameters: `assumed-Tier-B`.
- Real station RF hardware, EIRP, dish size, polarization, and active RF route remain source gaps.

Docs/report/UI updates: `runtime-modeled-output.ts`, CSV export, side-panel disclosures,
data-completeness report, source evidence report, smoke assertions, and `docs/data-source-index.md`
now surface the model and the remaining operator-hardware gap.

### 7.5 Task 2 -- TLE refresh decision

Skipped intentionally. K-A4 passes after Task 1 using retained timestamp metadata, and the selected
demo route is a fixed historical 2026-05-17 window. Refreshing CelesTrak TLEs for the full fixture
would change the satellite set and force longer backward SGP4 propagation to that fixed window,
which is not warranted for this deliverable.

Source class retained: existing `public-source` CelesTrak fixture and retained manifest metadata.

### 7.6 Regenerated baselines and evidence

Because Task 5 changes modeled RSRP/throughput and Task 4 changes selected-pair terrain thresholds,
the wave-1 projection baselines were regenerated from current model output rather than hand-edited:
`src/features/multi-station-selector/v4-projection-wave1-baselines.ts`.

Retained evidence regenerated via `npm run test:m8a-v4.11:slice5` and copied to
`deliverable/selected-pair-source-evidence/`:

- `runtime-projection-evidence-cht-yangmingshan-sansa-hartebeesthoek-20260517T000000Z-360m.html`
  sha256 `d184c8dc2c9657b3752b29a31f1f95e40bb5927ddf78eb392406724517317748`
- `runtime-projection-cht-yangmingshan-sansa-hartebeesthoek-20260517T000000Z-360m.csv`
  sha256 `662b9238800c7d620ef1cf521e1ea417d69713a81e429a66c13a064f3dd446e5`
- `smoke-manifest.output.json`
  sha256 `bb636975fd1c8c0aac39e5a1b46a95dba6af04560b8e6a08d4ce1815936b1fea`

`README.md` and `evidence-manifest.json` in the evidence folder were updated with the regenerated
sizes, hashes, dates, and claim boundaries.

### 7.7 Verification record

| Gate | Result |
|---|---|
| `node_modules/.bin/tsc --noEmit` | PASS |
| `npm run build` | PASS |
| `npm run test:m8a-v4.11:slice5` | PASS |
| `npm run verify:g1` with Vite dev server on `127.0.0.1:5173` | PASS, 22/22 |
| Antenna module compile + sample inputs | PASS; LEO/MEO/GEO gains finite and physically sane |
| Link-budget sample inputs | PASS; clear/rain throughput and latency finite, no NaN |

### 7.8 Still out of scope / ITRI wall

No Tier-A/operator-validated upgrade was attempted. The following remain disclosed gaps rather
than inferred facts: packet-test latency/jitter/throughput, native RF handover / active serving
route, real station RF hardware truth, external acceptance threshold script, and any ITRI-private
operator validation.
