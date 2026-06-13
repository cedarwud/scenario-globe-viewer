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

---

## 5. Verification record

| Gate | Result |
|---|---|
| `tsc --noEmit` | PASS (exit 0) |
| `npm run build` (tsc + vite) | PASS |
| Rain numeric re-computation (compiled module) | PASS (sane, monotonic, latitude-sensitive, no NaN) |
| `npm run test:m8a-v4.11:slice5` (acceptance smoke; regenerates report) | PASS |
| `npm run verify:g1` | FAIL — `driver-fatal: panel did not reach ready` — **pre-existing WSL2 headless-chromium env issue; fails identically on a clean tree (changes stashed), so not caused by these edits.** slice5 (same panel + projection) passes. |

Blast-radius note: every measured path defaults to rain = 0, where the rain code returns 0
before any new logic runs. The wave-1 baselines (`throughputMbps` identical across pairs =
clear-sky) and the retained 2026-06-12 evidence (CSV rows all `"rainRateMmPerHour":0`) are
therefore unchanged; no regeneration was required.

---

## 6. Not changed (intentional)

- Dated delivery snapshots under `deliverable/selected-pair-source-evidence/` still carry the
  old SANSA URL — left as historical retained evidence, not back-edited.
- No commit made (per user instruction). Changes are in the working tree; commit with explicit
  `git add <path>` per repo rule R6 (never `git add -A`).
