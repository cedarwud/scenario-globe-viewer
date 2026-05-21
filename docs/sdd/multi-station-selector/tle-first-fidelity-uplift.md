# Multi-Station Selector — TLE-First Fidelity Uplift

Draft date: 2026-05-18
Status: proposed v2 + F9 (wave 2 follow-up to `tle-first-3d-pipeline.md` Slice 5
and `tle-first-data-completeness.md` D7; v1 codex-challenge findings reconciled
2026-05-18; codex-challenge v2 findings reconciled 2026-05-18 — RF math +
schema nullability + cadence-gating contradictions resolved; Slice F9 visual
evidence layer + gaps F43-F50 added 2026-05-19; perf-spike S1,
EIRP/bandwidth/T_sys-anchor spike S2a, hysteresis re-tune spike S2b,
legal-spike S3 pending per §12.1; TH5 orbit source policy gate recorded
2026-05-21 with no default-source migration authorized)

## Scope

This document defines the wave-2 fidelity uplift for the selected-pair runtime
route (`/?stationA=<id>&stationB=<id>`, `sourceMode = tle-first-runtime`). It
addresses the 42 fidelity gaps catalogued in the 2026-05-18 audit + 8
visual-evidence gaps (F43-F50) added 2026-05-19 to expose wave-2 data impact
on the rendered 3D scene and side-panel disclosures (see the audit appendix
in §14), plus the open-source datasets that can satisfy them.

The uplift covers nine families:

1. cheap internal wiring (parser, freshness, cadence, per-output provenance);
2. antenna pattern wiring + RSRP rigor;
3. atmospheric chain rigor (gas, cloud, scintillation, water vapour grid);
4. rain climatology (rain-height grid, exceedance grid);
5. throughput + handover policy rigor;
6. station precision + DEM + terrain mask;
7. live TLE + constellation membership;
8. cap raise + policy surfacing;
9. visual evidence of wave-2 data impact on 3D scene + Row 5 disclosures.

It does not change the runtime data contract layers defined in
`runtime-data-contract.md`, nor the 3D scene view-model contract defined in
`tle-first-3d-pipeline.md` §5. It extends the data-completeness payload defined
in `tle-first-data-completeness.md` §6 with new provenance fields and adds new
modeled-output kinds.

No new customer-specific identifier or project-external agency name is part of
this document's terminology.

## 1. Mission

The selected-pair runtime should remain TLE-first, model-explicit, and
display-transform-explicit, while raising every modeled quantity to the
strongest publicly defensible source. Specifically:

1. Every link-budget output is grounded in an ITU-R or 3GPP standard, cited
   inline, with parameter inputs that come from a published grid or table —
   not a project-internal magic constant.
2. Every modeled quantity that has a public open-source grid (water vapour
   density, surface pressure, rain rate exceedance, rain height) reads from
   that grid for the selected pair coordinates, not from a global default.
3. Antenna gain is part of the visible compute chain, not a standalone helper.
4. Handover policy thresholds (latency budget, hysteresis, minimum visibility
   window) are anchored to 3GPP TR 38.821 §7.3 reference values, not magic
   constants.
5. TLE source freshness is reported against the maximum record epoch and the
   in-bundle snapshot date, and the runtime can consume a CelesTrak-refreshed
   snapshot delivered via a build-step downloader.
6. Station precision exposes altitude and terrain mask, not just disclosed lat
   / lon.
7. The selected-pair cap (60 / orbit) and the policy in use are first-class
   review surfaces, not buried in non-claim strings.
8. Empty / unsupported states remain truthful: no slice introduces fake actors
   or fake links.
9. The selected-pair route never claims operator measured telemetry, regardless
   of how many of the above slices are wired.
10. Wave-2 data impact is visible on the 3D scene and side-panel disclosures
    through encoded visual primitives (per-satellite RSRP color, antenna gain
    polar plot, TLE freshness chip color, handover reason animation, dominant
    factor pill, atmospheric composite bar, pre/post comparison view, wave-2
    active badge) so a reviewer can SEE the wave-2 contract is live without
    reading raw numbers alone. All visual encodings retain non-color
    redundancy (shape, size, or text) so they remain interpretable for
    color-blind reviewers.

## 2. Current State After Wave-1 D7

### 2.1 What landed (recap)

As of commit `e338766`:

- selected-pair runtime projection emits `RuntimeProjectionResult.dataCompleteness`
  (see `src/features/multi-station-selector/runtime-data-completeness.ts:528-552`);
- per-orbit TLE source manifest with health flag derived from filename mtime
  (`runtime-data-completeness.ts:207-227`);
- station precision state + Row 6 disclosure
  (`runtime-data-completeness.ts:241-259`);
- actor + visibility provenance with `tle:<orbit>` source ids
  (`runtime-data-completeness.ts:330-386`);
- six modeled-output kinds (`handover`, `link-budget`, `throughput`, `jitter`,
  `latency`, `rain-impact`) with model id + standards refs + non-claim text
  (`runtime-data-completeness.ts:388-472`);
- five enumerated display-only transforms
  (`runtime-data-completeness.ts:474-502`);
- empty-reason-code resolution
  (`runtime-data-completeness.ts:504-526`);
- selected-pair compute uses FSPL (3GPP TR 38.811 §6.6.2) + gas (ITU-R P.676-13
  Annex 2) + rain (ITU-R P.618-14 §2.2.1 × ITU-R P.838-3 table) only;
- antenna pattern (ITU-R S.1528 + S.465-6) lives standalone at
  `src/runtime/link-budget/antenna-pattern.ts` and is not imported by
  `runtime-projection.ts`;
- only the `cross-orbit-live` policy is wired
  (`src/features/multi-station-selector/runtime-projection.ts:74-79`).

### 2.2 Where this SDD extends

The uplift extends — does not replace — the wave-1 surfaces:

| Wave-1 surface | Wave-2 extension |
| --- | --- |
| `RuntimeTleSourceManifestEntry.health` | health resolves against `max(sourceTimestampUtc, epochEndUtc)`; live network fetch optional |
| `RuntimeModeledOutputMetadata` | gains `cloud-attenuation`, `scintillation`, `eirp-rsrp` kinds; `inputSummary` becomes per-output |
| `RuntimeActorProvenanceState.propagatedSampleCount` | per-satellite success count, not window-wide |
| `RuntimeStationPrecisionState` | gains `elevationM`, `terrainMaskDeg`, `antennaDiameterM`, `peakEirpDbm`, `txPolarization` |
| `RuntimeDataCompletenessState.tleSources` | gains `noradIdRangeSummary` and `cospar` coverage |
| Row 5 d1 disclosure copy | adds antenna + cloud + scint lines; cites ITU-R S.1528 / S.465-6 / P.840-9 |
| Row 5 d3 disclosure copy | shows live policy parameters (latency budget, hysteresis) with TR 38.821 §7.3 cite |
| Row 6 footer | adds cap-disclosure target |
| TLE telemetry chip | gains `data-source-mode="local-snapshot"` ∨ `data-source-mode="network-snapshot"` |

### 2.3 Inventory roll-up

The 42 gaps land into 8 slices. The compact ID table sits in §14; per-slice
detail sits in §7.

| Slice | Theme | Gap count | Open-source dataset | Schema delta |
| --- | --- | --- | --- | --- |
| F1 | Cheap internal wiring | 12 | none | none |
| F2 | Antenna + RSRP rigor | 5 | 3GPP TR 38.821 §6.1.1 Set-1 (PENDING-SPIKE S2a + S2b) | registry +3 fields |
| F3 | Atmospheric chain | 5 | ITU-R P.835-6, P.836-6, P.840-9 (LEGAL-SPIKE S3) | none |
| F4 | Rain climatology | 2 | ITU-R P.837-8, P.839-4 (LEGAL-SPIKE S3) | none |
| F5 | Throughput + handover policy | 9 | 3GPP TR 38.821 §6.1.5 / §7.3 / Table 6.1.6.1.2-1 | none |
| F6 | Station precision + DEM | 3 | NASA SRTM 1arcsec | registry +2 fields; **prep-PR before F6 wiring** |
| F7 | Live TLE + constellation | 2 | CelesTrak GP + SATCAT | none; build-step downloader + generated manifest; TH5 policy gate keeps the current CelesTrak refreshed artifact as default |
| F8 | Tier + cap surfacing | 4 | none | none; UI cap-disclosure row; S1 authorises LEO 200 cap at cadence 30 s; combined LEO 200 + LEO 10 s gated on PERF-FOLLOWUP-PENDING |
| F9 | Visual evidence layer | 8 (F43-F50) | none | none; Cesium actor styling + SVG plots + Row 5 / Row 6 extensions; **depends on F2/F3/F5/F7 outputs** |

## 3. Truth Classes

The five truth classes defined in `tle-first-data-completeness.md` §4 carry
forward unchanged:

| Truth class | Source | May claim |
| --- | --- | --- |
| `tle-derived` | TLE propagation + station geometry | satellite identity, sampled position, station visibility, pair intersection |
| `public-registry-derived` | registry entry | station id, name, operator family, coordinates, supported orbits, supported bands, disclosed precision, **station altitude**, **terrain mask**, **antenna diameter**, **peak EIRP**, **Tx polarization** |
| `modeled` | local physical or policy model | handover decision, throughput estimate, jitter estimate, latency estimate, rain impact, **cloud attenuation**, **scintillation**, **EIRP-anchored RSRP** |
| `display-only` | renderer / layout choice | camera framing, altitude compression, label density, actor mesh, visual lane placement |
| `unavailable` | missing or unsupported | absence rather than simulated truth |

Bold entries are wave-2 additions. The bold registry entries remain
`public-registry-derived` because they are sourced from public operator
disclosures, not measured telemetry, and the wave-2 schema treats them as
authoring inputs to the registry JSON.

Hard rule (unchanged): a value may move from a stronger truth class to a
weaker display class for readability, but may not move from a weaker class
to a stronger claim.

## 4. Data Policy

### 4.1 RF chain truth policy

The visible RF chain for the selected-pair route follows ITU-R P.618-14 §2.4
total-attenuation composition. Atmospheric losses are NOT all linearly
additive: gas absorption is linear-additive; rain, cloud, and scintillation
combine via quadratic composition. The signed formula is:

```
P_rx_proxy_dBm =
    EIRP_tx_dBm                                            (signed: positive; modeled, §12.1 spike S2a)
  − FSPL_dB                                                (signed: negative; 3GPP TR 38.811 §6.6.2)
  − A_gas_dB                                               (signed: negative; ITU-R P.676-13 Annex 2)
  − sqrt( (A_rain_dB + A_cloud_dB)^2 + A_scint_dB^2 )      (signed: negative; ITU-R P.618-14 §2.4 eq. 65)
  + G_rx_dBi(look-angle)                                   (signed: positive; ITU-R S.465-6 within 2-31 GHz; V-band carveout per §7 F2)
```

**EIRP definition (binding on implementation)**: `EIRP_tx_dBm` by definition
already incorporates satellite Tx antenna peak gain — `EIRP = Tx_transmit_power_dBm +
Tx_antenna_peak_gain_dBi` (at boresight, off-axis loss applied
separately if needed). Listing both `EIRP_tx_dBm` and `G_tx_dBi` as separate
sum-contributing terms would double-count the Tx antenna gain. The RF chain
exposes ONE Tx-side term (`tx-eirp`); for audit traceability, the operator-
disclosed Tx transmit power and Tx antenna peak gain components are surfaced
inside `tx-eirp.inputSummary` as `{txTransmitPowerDbm, txAntennaPeakGainDbi}`
when known, but only the combined EIRP value contributes to the sum.

Sign convention (binding on implementation): each
`RfChainTerm.contributionSignedDb` carries a SIGNED scalar with the same sign
the formula above uses. The breakdown root reports
`P_rx_proxy_dBm = Σ(RfChainBreakdown.terms[*].contributionSignedDb)` exactly,
with no separate EIRP base addition (the `tx-eirp` term IS the EIRP
contribution).

**Nullability rule (binding on implementation)**: any `RfChainTerm` whose
`contributionSignedDb` cannot be computed at runtime (e.g., `tx-eirp` while
S2a is unresolved; `rx-antenna-gain` while V-band has no S.465-6 coverage)
carries `contributionSignedDb = null` and `provenance.truthClass =
"unavailable"`. The proxy `RfChainBreakdown.receivedPowerProxyDbm` then
propagates as `null` (NOT a partial sum), and downstream consumers (RSRP
proxy in handover policy, SNR / throughput in F5) treat the candidate's
RSRP as `unavailable`. Partial sums are forbidden because they would silently
mis-rank candidates.

`RfChainBreakdown.terms` contains exactly five entries, one per
`RfChainTermKind`: `tx-eirp`, `free-space-path-loss`, `gas-absorption`,
`atmospheric-composite`, `rx-antenna-gain`. The individual
rain / cloud / scintillation dB values remain auditable inside
`atmospheric-composite.inputSummary` as `{rainAttenuationDb,
cloudAttenuationDb, scintillationDb}`, but they do not appear as separate
sum-contributing terms — the quadratic composition is already evaluated and
stored once on the `atmospheric-composite` term so the sum cannot be
double-counted.

All terms carry model id + standards ref + non-claim text. The non-claim
text must say modeled, not measured.

### 4.2 Atmospheric input policy

Atmospheric inputs (surface pressure, temperature, water vapour density, rain
rate, rain height, cloud liquid water) must come from an ITU-R public grid
keyed by the pair-midpoint coordinate, with bilinear interpolation. The global
ITU standard atmosphere (P.835-6 §1) remains the fallback when the pair-mid
falls into a grid no-data cell.

The rain-rate slider in Row 2 remains user-driven. Its default position is 0
mm/h to preserve the current G1 baseline; the disclosure copy in Row 5 d1 may
quote the pair-mid P.837-8 R_0.01 reference value as an informational anchor
without changing the slider default. The anchor is display-only climatology
context, not a compute input — it never feeds rain attenuation unless the
user moves the slider.

### 4.3 Handover policy truth policy

Handover policy thresholds must reference 3GPP TR 38.821 §7.3 numerical anchors
where they exist (latency budget, hysteresis, minimum visibility window). Any
policy parameter that does not have a direct standards anchor must carry a
non-claim string ending in `not a measured operator threshold`.

The visible policy stays `cross-orbit-live` by default. Alternate policies
(`leo-first`, `bootstrap-balanced-v1`) become reachable via a URL parameter
`?policy=<id>` for operator-curated walkthroughs. The chip + Row 5 d3 reflect
the live policy id.

### 4.4 Station precision policy

Each station carries five public-registry-derived fields beyond lat / lon:

- `elevationM` — station altitude above sea level (DEM-derived for the
  registry entry, frozen into the registry snapshot);
- `terrainMaskDeg` — single-value horizon elevation mask (0° if unknown);
- `antennaDiameterM` — operator-disclosed or, where unavailable, a heuristic
  derived from `disclosurePrecision` (`exact-coords` → 13 m, `operator-family-region`
  → 4.5 m), with the heuristic recorded as the `provenance.nonClaim`;
- `peakEirpDbm` — Effective Isotropic Radiated Power per Tx beam (dBm).
  When operator-disclosed value is unavailable, the field is null and the
  station's row tags as `unavailable` per §3 truth class until §12.1 spike
  S2a returns a defensible anchor. The v1 SDD cited "3GPP TR 38.821 Table
  6.1.1.1-9 LEO Set-1 30 dBi / MEO 35 dBi / GEO 38 dBi"; codex-challenge
  2026-05-18 flagged two errors with that citation: Table 6.1.1.1-9 is the
  calibration-cases index (not the EIRP table; the system-parameter source
  is §6.1.1 Set-1 / Set-2), and the cited values are antenna gains (dBi),
  not EIRP (dBm). The seed is therefore unresolved; F2 implementation is
  BLOCKED on S2a;
- `txPolarization` — `circular` ∨ `linear-h` ∨ `linear-v` ∨ `dual` (defaults
  to `circular` when the operator does not disclose).

The registry JSON `multi-orbit-public-registry.json` is the single authoring
surface for the five fields; they are not computed at runtime.

### 4.5 TLE source freshness policy

`RuntimeTleSourceManifestEntry.health` is computed as:

```
sourceAgeDays = referenceUtc − max(sourceTimestampUtc, epochEndUtc)
health = sourceAgeDays ≤ threshold[orbitClass] ? "fresh" : "stale"
```

Thresholds: LEO 14, MEO 30, GEO 30 days (carried over from `tle-first-data-completeness.md`
§12 #1).

The build-step downloader at `scripts/refresh-tle.mjs` (added in F7) fetches
fresh snapshots from CelesTrak and writes them into
`public/fixtures/satellites-network/`. The runtime cannot dynamically probe
the browser bundle filesystem; selection is driven by a generated manifest at
`public/fixtures/satellites-network/manifest.json` (also written by the
downloader). At bootstrap the runtime fetches the manifest once: when
`manifest.json` is present and lists a fresh entry per orbit class, the
runtime resolves TLE URLs to `satellites-network/`; otherwise it falls back
to the in-bundle `satellites/` paths. Both paths render a chip dataset
attribute so the review surface stays explicit. The manifest carries
`generatedAtUtc`, per-orbit `path`, `recordCount`, and `epochRangeUtc`
fields so the runtime can compute `health` without re-parsing the TLE.

2026-05-21 TH5 policy addendum: OMM-capable parser, manifest, propagation,
and provenance readiness has landed, but this SDD does not switch the runtime
or default source. The current CelesTrak refreshed artifact remains the
repo-bundled/demo default. Space-Track direct GP/OMM ingestion remains gated
by account/user-agreement review, rate-limit compliance, redistribution and
storage permission, and a local acquisition flow that keeps private
credentials outside git. See
`docs/sdd/multi-station-selector/th5-orbit-source-policy-gate.md`.

### 4.6 Fixture fallback boundary (unchanged)

The fixed demo route (`/?scenePreset=regional&m8aV4GroundStationScene=1`)
remains `fixture-fallback`. None of the wave-2 slices alters that path. The
retained `operator-validated` fixture (Taiwan CHT + Singapore Speedcast) is
untouched.

## 5. Runtime Contract Additions

The exact TypeScript names may evolve in implementation; this section is a
target shape.

### 5.1 RF chain breakdown

```ts
export type RfChainTermKind =
  | "tx-eirp"
  | "free-space-path-loss"
  | "gas-absorption"
  | "atmospheric-composite"
  | "rx-antenna-gain";

export interface RfChainTerm {
  readonly kind: RfChainTermKind;
  readonly modelId: string;
  readonly standardsRef: ReadonlyArray<string>;
  // SIGNED scalar that the §4.1 formula adds (positive) or subtracts
  // (stored as negative). The CSV / debug sum across terms exactly equals
  // RfChainBreakdown.receivedPowerProxyDbm; no separate base addition.
  // `null` when the term cannot be computed (e.g., S2a-blocked tx-eirp,
  // V-band rx-antenna-gain). Any null term forces the proxy to null.
  readonly contributionSignedDb: number | null;
  readonly inputSummary: Readonly<Record<string, string | number | boolean | null>>;
  readonly provenance: RuntimeProvenanceTag;
}

export interface RfChainBreakdown {
  readonly carrierFrequencyGHz: number;
  readonly carrierBand: "L" | "S" | "C" | "X" | "Ku" | "Ka" | "V";
  readonly polarization: "horizontal" | "vertical" | "circular" | "dual";
  readonly elevationDeg: number;
  readonly slantRangeKm: number;
  readonly terms: ReadonlyArray<RfChainTerm>;
  // `null` when any term in `terms` has contributionSignedDb === null.
  // Partial sums are forbidden — see §4.1 nullability rule.
  readonly receivedPowerProxyDbm: number | null;
  readonly receivedPowerNonClaim: string;
}
```

The five terms enumerated in `RfChainTermKind` appear once each in
`RfChainBreakdown.terms`. The order is fixed so the CSV diff stays stable:
`tx-eirp`, `free-space-path-loss`, `gas-absorption`, `atmospheric-composite`,
`rx-antenna-gain`. Component dB values for the quadratic
composition (rain, cloud, scintillation) live inside
`atmospheric-composite.inputSummary` and are audit-visible but not
sum-contributing.

### 5.2 Atmospheric grid lookup

```ts
export type AtmosphericGridSource =
  | "p835-6-annex-1"
  | "p836-6-rev-2017"
  | "p840-9"
  | "p837-8"
  | "p839-4";

export interface AtmosphericGridLookup {
  readonly source: AtmosphericGridSource;
  readonly midpointLatDeg: number;
  readonly midpointLonDeg: number;
  readonly cellLatDeg: number;
  readonly cellLonDeg: number;
  readonly lookupValue: number;
  readonly lookupUnit: string;
  readonly interpolation: "bilinear" | "nearest" | "fallback-global";
  readonly provenance: RuntimeProvenanceTag;
}
```

Each interpolation result feeds a single `RfChainTerm.inputSummary` entry,
not a side payload. The `interpolation = "fallback-global"` case fires when
the lookup lands in a no-data cell, and the term's non-claim text records the
fallback path.

### 5.3 Station RF profile

```ts
export type TxPolarization = "horizontal" | "vertical" | "circular" | "dual";

export interface StationRfProfile {
  readonly stationId: string;
  readonly elevationM: number;
  readonly terrainMaskDeg: number;
  readonly antennaDiameterM: number;
  readonly antennaDiameterSource: "operator-disclosed" | "precision-heuristic";
  readonly peakEirpDbm: number;
  readonly peakEirpSource: "operator-disclosed" | "orbit-class-anchor";
  readonly txPolarization: TxPolarization;
  readonly txPolarizationSource: "operator-disclosed" | "fallback-circular";
  readonly provenance: RuntimeProvenanceTag;
}
```

Each `*Source` field documents whether the value is operator-disclosed or
project-applied. The Row 6 footer carries an aggregate `disclosure-coverage`
chip — count of `operator-disclosed` fields divided by total fields across
both stations — so the truth-tier anchor reflects how much of the chain is
authored vs. anchored.

### 5.4 TLE freshness source

```ts
export type TleSourceMode = "local-snapshot" | "network-snapshot" | "fallback-local-snapshot";

export interface RuntimeTleSourceFreshness {
  readonly sourceMode: TleSourceMode;
  readonly snapshotFetchedUtc: string | null;
  readonly snapshotPath: string;
  readonly maxEpochUtc: string | null;
  readonly noradIdRangeSummary: ReadonlyArray<{
    readonly start: number;
    readonly end: number;
    readonly count: number;
  }>;
  readonly constellationMembership: Readonly<Record<string, number>>;
  readonly provenance: RuntimeProvenanceTag;
}
```

`constellationMembership` is keyed by SATCAT operator family (e.g.,
`STARLINK`, `ONEWEB`, `GALILEO`) with the count of TLE records mapped to that
family.

### 5.5 RuntimeDataCompletenessState extensions

```ts
export interface RuntimeDataCompletenessState {
  // existing fields preserved
  readonly rfChainBreakdown: RfChainBreakdown;
  readonly atmosphericLookups: ReadonlyArray<AtmosphericGridLookup>;
  readonly stationRfProfiles: ReadonlyArray<StationRfProfile>;
  readonly tleFreshness: ReadonlyArray<RuntimeTleSourceFreshness>;
  readonly capDisclosure: {
    readonly perOrbitCap: Readonly<Record<OrbitClass, number>>;
    readonly perOrbitInventory: Readonly<Record<OrbitClass, number>>;
    readonly cappedAtRuntime: Readonly<Record<OrbitClass, boolean>>;
  };
  readonly policyDisclosure: {
    readonly activePolicyId: "cross-orbit-live" | "leo-first" | "bootstrap-balanced-v1";
    readonly thresholds: {
      readonly latencyBudgetMs: number;
      readonly hysteresisDb: number;
      readonly minVisibilityWindowMs: number;
      readonly elevationThresholdDeg: number;
    };
    readonly thresholdSources: Readonly<Record<string, RuntimeProvenanceTag>>;
  };
}
```

## 6. Open-Source Datasets

The license posture for each dataset is recorded below. **Five ITU-R grids
are subject to LEGAL-SPIKE-PENDING (§12.1 spike S3)** because ITU Terms of
Use (https://www.itu.int/en/about/Pages/terms-of-use.aspx) restrict
modification / reproduction / distribution beyond personal, educational, or
non-commercial use; "free download" does not equal "free redistribution
inside a project bundle". Implementation slices F3 + F4 are BLOCKED on S3
until policy is decided: (a) bundle with retained ITU notices + legal
opinion, (b) build-step download-on-demand into local cache, or (c)
runtime fetch with cache-and-licence-banner. **F2 anchor values from 3GPP
TR 38.821 are subject to PENDING-SPIKE S2a** (3GPP IPR per Article 3.2.2 +
correct table identification).

| Dataset | Canonical URL | License posture | Payload | Refresh | Slice |
| --- | --- | --- | --- | --- | --- |
| CelesTrak GP (active / GNSS / GEO) | `https://celestrak.org/NORAD/elements/gp.php?GROUP=<group>&FORMAT=tle` | CelesTrak Usage Policy: download only needed data once per update, GP cadence 2 hours, stop on HTTP errors; runtime disclosure keeps existing CelesTrak attribution | <= 500 KB / group | build-step only | F7 / TH5 |
| CelesTrak SATCAT | `https://celestrak.org/satcat/satcat.csv` | same policy posture; no runtime/browser fetch | about 5 MB CSV | build-step only | F7 / TH5 |
| ITU-R P.835-6 Annex 1 reference atmospheres | `https://www.itu.int/rec/R-REC-P.835` | **LEGAL-SPIKE-PENDING S3**; ITU-R Recommendation text is Free / non-commercial only; embedded numerical table small but redistribution status to be confirmed | embedded table, < 2 KB | static (Rec frozen) | F3 |
| ITU-R P.836-6 surface water vapour density (rev 2017) | `https://www.itu.int/oth/R0A0400000F` | **LEGAL-SPIKE-PENDING S3**; ITU "free download for personal/educational/non-commercial use" wording — bundling status TBD | 360 × 720 grid, ≈ 250 KB | static (rev 2017) | F3 |
| ITU-R P.840-9 cloud liquid water | `https://www.itu.int/rec/R-REC-P.840` | **LEGAL-SPIKE-PENDING S3** | columnar grid, ≈ 200 KB | static (Rec frozen) | F3 |
| ITU-R P.837-8 (2023) rain rate exceedance | `https://www.itu.int/rec/R-REC-P.837` | **LEGAL-SPIKE-PENDING S3**; supersedes P.837-7 | native 0.125° × 0.125°; resampling method TBD per S3 | static (2023) | F4 |
| ITU-R P.839-4 mean rain height | `https://www.itu.int/rec/R-REC-P.839` | **LEGAL-SPIKE-PENDING S3** | 0.5° × 0.5° grid, ≈ 200 KB | static (Rec frozen) | F4 |
| NASA SRTM 1arcsec global DEM | `https://earthexplorer.usgs.gov/` (also `https://srtm.csi.cgiar.org/`) | USGS public domain | pre-baked 69-station elevation + terrain mask table (≈ 4 KB) | static; refresh during registry edit | F6 |
| 3GPP TR 38.821 §6.1.1 / §6.1.5 / §6.1.6.1.2 / §7.3 | `https://www.3gpp.org/ftp/Specs/archive/38_series/38.821/` | **PENDING-SPIKE S2a + S3**; 3GPP IPR Article 3.2.2 — OPs jointly own TR copyright; SDD permits §-anchor citation, not table redistribution; per-value extraction (e.g., bandwidth, latency) policy TBD | inline citations only (target) | static (Rel-16 frozen) | F2 + F5 |
| 3GPP TR 38.811 §6.6.2 / §6.7 | `https://www.3gpp.org/ftp/Specs/archive/38_series/38.811/` | same | inline citations only | static | already in F-A baseline |

License compliance checklist (post-S3):

- CelesTrak: honor usage-policy cadence and HTTP error-stop behavior; include
  attribution string in `[data-tle-telemetry-chip]` dataset
  (`data-tle-attribution="CelesTrak"`) and in Row 5 d3 source list when
  `sourceMode = network-snapshot`.
- ITU-R grids: held pending S3 outcome; do not bundle until S3 returns a
  policy. F3 / F4 implementation must not land before S3 closes.
- 3GPP TR: cite by §-anchor only; numerical extractions from tables held
  pending S2a + S3 outcome.
- USGS SRTM: public domain, no attribution required; record the source URL in
  `slice-0-baseline.md` §6 inventory appendix for the elevation table.

## 7. Implementation Slices

Each slice gates on its smoke set staying green and on the §11 risk-table
mitigations being satisfied.

### Slice F1 — Cheap internal wiring

Covers gaps F03, F04, F05, F06, F34, F35, F36, F37, F38, F39, F41, F42.

Acceptance:

- `RuntimeTleSourceManifestEntry.health` reads
  `max(sourceTimestampUtc, epochEndUtc)` and the smoke captures both
  components;
- `RuntimeTleSourceParseStats` carries NORAD id range (line1 col 3-7) and
  COSPAR designator (line1 col 10-17);
- per-satellite SGP4 error retention (count of records that returned
  `satrec.error !== 0` in `visibility-utils.ts:127-129, 134-135, 137-145`)
  surfaces under `RuntimeTleSourceManifestEntry.sgp4ErrorCount`;
- `RuntimeActorProvenanceState.propagatedSampleCount` is per-satellite, derived
  from the SGP4 success count rather than the window-wide step count;
- `RuntimeModeledOutputMetadata.inputSummary` is per-output, not shared;
- `RuntimeDataCompletenessState.displayTransforms` reflects the chosen camera
  hint, altitude compression factor, and label density derived from the scene
  view-model — not a static enumeration;
- per-orbit cadence WRAPPER ships with LEO cadence held at 30 s in db018a6
  (F1 landing commit), MEO 60 s, GEO 120 s. The S1 spike (closed §12 entry
  14) authorises LEO 10 s at the current LEO 60 cap; a follow-up runtime
  change can flip the wrapper's LEO cadence value to 10 s once the
  implementation team is ready to re-baseline G1 R1-T2 / R1-F4 row counts
  against the finer cadence. The wrapper API itself
  (`Record<OrbitClass, number>`) is unchanged. Combined LEO 200 cap + LEO
  10 s is NOT authorised; see §11 PERF-FOLLOWUP-PENDING row. The current
  `visibility-utils.ts:107-151` `computeVisibilityWindowsForStation` API
  takes a single `config.stepSeconds`; F1 introduces a new module
  `src/features/multi-station-selector/visibility-cadence-multi.ts` that
  wraps it with a per-orbit cadence map, runs three separate
  single-cadence passes (one per orbit) per station, and merges results
  into a single `Map<satelliteId, VisibilityWindow[]>` keyed by satellite
  id. The existing `intersectStationWindowsForPair` continues to work
  unchanged because its inputs are already per-satellite window lists
  that carry absolute UTC timestamps, not per-grid sample indices — the
  mismatched-grid concern reduces to "two stations may use different
  cadence for the SAME satellite", which never happens (cadence is per
  orbit class, identical on both stations);
- `buildDefaultTimeWindow` default unified to 360 minutes (matches
  `runtime-data-contract.md` §Resolved decisions #2);
- D6 smoke gains assertions for each of the above.

Smokes that must keep passing: `npm run build`,
`verify-g1-bucket-a-coverage`, `verify-random-pair-projection-budget`,
`verify-60x-replay-continuity`, `verify-information-density`,
`verify-tle-first-data-completeness`.

Risk highlights: per-orbit cadence wrapper ships with LEO 30 s in db018a6;
no pass-edge regressions expected from F1 alone. The authorised future LEO
10 s upgrade at the current LEO 60 cap will multiply LEO sample count 3× vs
30 s — that change records pre-change Row 4 visibility timestamps for the 5
walkthrough URLs as the regression baseline. Combined LEO 200 cap + LEO
10 s remains gated on §11 PERF-FOLLOWUP-PENDING.

LOC estimate: ≈ 600 (all small-class edits) + ≈ 80 for the new
`visibility-cadence-multi.ts` wrapper.

### Slice F2 — Antenna pattern wire-in + RSRP rigor

Covers gaps F09, F10, F11, F12, F16.

Acceptance:

- `runtime-projection.ts` consumes `computeEarthStationAntennaGainDb` (S.465-6)
  from `src/runtime/link-budget/antenna-pattern.ts` to produce the
  `rx-antenna-gain` term in `RfChainBreakdown.terms`. **The satellite Tx
  antenna gain is NOT a separate term** — EIRP definition already incorporates
  it (see §4.1 EIRP definition note); operator-disclosed Tx power and Tx
  peak gain values are exposed inside `tx-eirp.inputSummary` for audit only,
  not added to the sum. `computeSatelliteAntennaGainDb` (S.1528-A) is
  retained in `antenna-pattern.ts` for off-axis-angle / non-boresight cases
  but is not consumed by the standard RF chain;
- **F.699 is retired** from runtime: `bootstrap-physical-input-seeds.ts`
  drops its `computeAntennaGain` import (from
  `itu-r-f699-antenna-pattern.ts`); earth-station antenna pattern is
  S.465-6 only. If the bootstrap-seeds module needs antenna-gain numbers
  at module-load time, it uses `computeEarthStationAntennaGainDb` from
  `antenna-pattern.ts` and is retitled an offline seed-table generator
  clearly labelled "bootstrap seeds — not runtime";
- **V-band carveout**: `computeEarthStationAntennaGainDb` validates
  `carrierFrequencyGHz` within 2-31 GHz (S.465-6 valid range; see
  `antenna-pattern.ts:50-51`). When the pair's selected carrier band is
  V-band (40-75 GHz), the `rx-antenna-gain` term is tagged `unavailable`
  per §3 truth class with `contributionSignedDb = null` and non-claim
  "Earth-station antenna pattern not defined by S.465-6 above 31 GHz;
   V-band Rx gain requires ITU-R S.580 or operator-disclosed pattern, not
   wired in this slice." The proxy then propagates as `null` per §4.1
   nullability rule. Falling back to the satellite S.1528 pattern for an
   earth-station Rx term is forbidden — antenna geometry differs;
- carrier frequency is picked per pair from the narrowest mutually-supported
  band in `stationA.supportedBands ∩ stationB.supportedBands`, with the
  selection echoed in `RfChainBreakdown.carrierBand`;
- RSRP proxy in `toLivePolicyCandidate`
  (`runtime-projection.ts:398-418`) becomes
  `Σ(RfChainBreakdown.terms[*].contributionSignedDb)`, exposed as
  `RfChainBreakdown.receivedPowerProxyDbm`. **This is blocked on §12.1
  spike S2a** (EIRP-anchor): until S2a returns a defensible
  `peakEirpDbm` seed for satellites without operator disclosure, F2 must
  not ship the proxy with a hardcoded EIRP. F2 may land the
  `rx-antenna-gain` term and the `RfChainBreakdown` shape with the
  `tx-eirp` term tagged `unavailable` per §3 (and `receivedPowerProxyDbm =
  null` per §4.1 nullability rule). Handover policy must treat
  `null`-proxy candidates as "unavailable" rather than scoring against
  partial sums;
- **Hysteresis re-tuning is tracked separately as spike S2b**. 2 dB
  hysteresis was tuned against path-loss-only RSRP. When EIRP + antenna-gain
  enter the proxy, candidates may differ by 5-10 dB on those terms alone,
  swamping the original 2 dB threshold. S2b deliverable returns the
  re-tuned hysteresis value with cross-orbit RSRP-delta distribution for
  the 5 walkthrough URLs;
- polarization comes from `stationA.txPolarization ∩ stationB.txPolarization`
  (with `circular` as the fallback when one side is `dual`);
- registry JSON gains `antennaDiameterM`, `peakEirpDbm`, `txPolarization` per
  station;
- D6 smoke asserts `RfChainBreakdown.terms` contains the five expected
  kinds (per §5.1 ordering), and that
  `RfChainBreakdown.receivedPowerProxyDbm = Σ(terms[*].contributionSignedDb)`
  within 0.5 dB rounding error, OR `receivedPowerProxyDbm = null` when any
  term is null.

Smokes that must keep passing: same set as F1, plus a new fixture-baseline
diff for Row 5 d1 throughput numbers (captured in slice-0 before F2 lands).

Risk highlights: RSRP proxy non-constant across candidates may flip the
handover-event count for borderline cases. The pre-F2 event count per
walkthrough URL is the regression baseline; G1 R1-F4 row may need
re-baselining inside the same commit. Hysteresis re-tune (within S2b)
deliverable closes the cross-orbit RSRP-delta concern.

LOC estimate: ≈ 400 (excluding S2a + S2b deliverables).

### Slice F3 — Atmospheric chain rigor

Covers gaps F13, F17, F18, F19, F20.

Acceptance:

- `runtime-projection.ts` removes the 10-30 GHz rain gate
  (`RAIN_MODEL_MIN_FREQUENCY_GHZ` / `RAIN_MODEL_MAX_FREQUENCY_GHZ` at lines
  52-53); rain attenuation applies whenever the P.838-3 table covers the
  carrier (1-100 GHz);
- new `src/runtime/link-budget/cloud-attenuation.ts` implements ITU-R P.840-9
  cloud liquid-water attenuation with the columnar grid bundled at
  `public/fixtures/itu-r-grids/p840-9-cloud.json`;
- new `src/runtime/link-budget/scintillation.ts` implements ITU-R P.618-14 §2.5
  scintillation fade depth;
- `src/runtime/link-budget/gas-absorption.ts` reads
  `surfacePressureHPa` / `surfaceTemperatureC` from P.835-6 Annex 1
  latitudinal references and `surfaceWaterVaporDensityGM3` from a bundled
  P.836-6 grid at `public/fixtures/itu-r-grids/p836-6-wv-density.json`;
- both grids resolve via `AtmosphericGridLookup` with bilinear interpolation
  and explicit `interpolation = "fallback-global"` when the cell lands in
  no-data;
- the computed cloud and scintillation dB values feed
  `atmospheric-composite.inputSummary` under keys `cloudAttenuationDb` and
  `scintillationDb` (audit-only, not separate sum terms). The
  `atmospheric-composite.contributionSignedDb` continues to carry the
  quadratic composition per §4.1 formula:
  `-(A_gas + sqrt((A_rain + A_cloud)^2 + A_scint^2))` is split as
  `-A_gas` on the `gas-absorption` term and
  `-sqrt((A_rain + A_cloud)^2 + A_scint^2)` on the `atmospheric-composite`
  term. **No new `RfChainTermKind` values are introduced by F3** — the
  five-kind contract from §5.1 is preserved;
- D6 smoke asserts both lookups appear in `RuntimeDataCompletenessState.atmosphericLookups`
  with non-fallback interpolation for the 5 walkthrough URLs (or with explicit
  fallback when the URL is in a known no-data region).

Smokes that must keep passing: same as F2 set. Bundle size budget after F3:
+ ≈ 450 KB total for the three grids.

Risk highlights: F3 changes Row 5 d1 numbers by tens of percent in humid
tropical pairs; capture pre-F3 Row 5 d1 panel screenshots for the five
walkthrough URLs as regression baselines.

LOC estimate: ≈ 500.

### Slice F4 — Rain climatology

Covers gaps F14, F15.

Acceptance:

- `rain-attenuation.ts` reads rain height from `public/fixtures/itu-r-grids/p839-4-rain-height.json`
  (ITU-R P.839-4 mean rain height grid) keyed on the pair-midpoint, replacing
  the simplified lat-dependent formula at lines 137-149;
- new copy in Row 5 d1 disclosure body header quotes the pair-midpoint
  P.837-8 R_0.01 reference value (`public/fixtures/itu-r-grids/p837-8-rain-rate.json`)
  with the standards citation, explicitly labelled "climatology reference,
  display-only; the rain-rate slider remains user-driven (default 0 mm/h)".
  The disclosure must distinguish display-only-anchor from compute-driving
  input; the R_0.01 reference value never feeds the rain attenuation
  calculation unless the user moves the slider to that value;
- the rain-rate slider default stays 0 mm/h per §4.2;
- `RuntimeDataCompletenessState.atmosphericLookups` gains `p837-8` and
  `p839-4` entries;
- **BLOCKED on §12.1 spike S3** (ITU grid bundling): the grid JSON files
  do not land until S3 clears the licensing path;
- D6 smoke asserts both lookups resolve for each walkthrough URL.

Smokes that must keep passing: same as F3 set. Bundle size: + ≈ 450 KB total
for the two grids (subject to S3 resampling method); combined with F3 the
bundle delta sits below 1 MB.

LOC estimate: ≈ 400.

### Slice F5 — Throughput + handover policy rigor

Covers gaps F21, F22, F23, F24, F25, F26, F27, F28, F29.

Acceptance:

- `networkSpeedMbps` becomes a Shannon-derived estimate
  `B · log2(1 + SNR_linear)` where:
  - `B` (bandwidth, Hz) is sourced from the registry per station per band
    via a new `txAllocatedBandwidthHz` field (PENDING-SPIKE S2a deliverable —
    no project-internal default values; operator-disclosed allocations only
    where available, otherwise the field is null and `networkSpeedMbps` tags
    as `unavailable`);
  - `SNR_linear = 10^((receivedPowerProxyDbm − noiseFloorDbm) / 10)` where
    `noiseFloorDbm = 10·log10(k · T_sys · B / 1mW)` per ITU-R V.665 and
    standard noise-temperature physics, with `k = 1.38e-23 J/K`, `T_sys`
    sourced from 3GPP TR 38.821 §6.1.5 system noise temperature (PENDING-SPIKE
    S2a). The §6.1.5 system-temperature anchor must be confirmed by S2a — the
    v1 SDD claimed the section "gives a noise-floor anchor", but codex
    challenge 2026-05-18 noted it gives only G/T system temperature; the
    arithmetic is straightforward once T_sys is anchored;
- **Non-shipping condition for throughput**: when S2a returns path (c)
  (`peakEirpDbm = null`) AND no station carries a disclosed
  `txAllocatedBandwidthHz`, F5 ships the Shannon term as `unavailable`
  rather than computing a meaningless number. In that case Row 5 d1 throughput
  cell displays the non-claim string only ("Bandwidth + EIRP anchors
  unresolved; modeled throughput unavailable for this route"); Row 3
  comm-time stat continues to work (it only depends on visibility windows,
  not throughput). The F5 PR landing condition is therefore "ships the
  arithmetic AND the `unavailable` fallback path with explicit Row 5 d1
  copy", not "ships only when S2a returns useful anchors";
- clear-sky reference capacity replaces the magic table (`CLEAR_SKY_REFERENCE_CAPACITY_MBPS_BY_ORBIT`,
  `runtime-projection.ts:62-66`) with the Shannon-derived envelope at the
  band's nominal SNR. Magic per-orbit values (LEO 200 / MEO 100 / GEO 50)
  are removed; per-orbit hardcoded bandwidth values (`Ka 1.0 GHz`,
  `Ku 500 MHz`, `L 20 MHz`) from the v1 SDD are also removed — they were
  uncited and replaced by registry-sourced allocations gated on S2a;
- baseline jitter pulls from 3GPP TR 38.821 Table 6.1.6.1.2-1 per orbit-class
  RTT, with the jitter scale anchored at ≈ 5 % of one-way latency
  (cited inline, not magic);
- latency processing constant becomes per-orbit (LEO 1 ms, MEO 3 ms, GEO 5 ms)
  citing 3GPP TR 38.821 §6.1.6.1.2;
- handover policy `latencyBudgetMs` becomes per-orbit (LEO 50, MEO 200,
  GEO 600 — cited inline);
- `hysteresisDb` defaults to 2 dB (kept) but is sourced as TR 38.821 §7.3.4
  rather than magic;
- `minVisibilityWindowMs` becomes per-orbit (LEO 90 s, MEO 600 s, GEO 1800 s);
- `predictedVisibilityRemainingMs` surfaces both the pair-intersection
  residual and the satellite's single-station residual for the side panel;
- D6 smoke asserts `RuntimeDataCompletenessState.policyDisclosure.thresholds`
  matches the table and `thresholdSources` cite TR 38.821 §-anchors.

Smokes that must keep passing: same as F4 set. Bundle size: no change.

Risk highlights: Row 4 link-selection event count drops for selected pairs
where the loose budget was holding marginal links; capture pre-F5 event
counts as regression baselines for the 5 walkthrough URLs and update G1
R1-F4 expectations inside the same commit.

LOC estimate: ≈ 500.

### Slice F6 — Station precision + DEM + terrain

Covers gaps F07, F08, F40.

**Prep-PR requirement**: the 69-station registry JSON edit must land as a
separate prep-PR BEFORE the F6 wiring PR. R6 concurrent-session caution
(AGENTS.md §5 R6) applies to `multi-orbit-public-registry.json` because
parallel sessions may be editing the marker UI atop the same registry rows;
splitting the prep into a dedicated, name-staged commit ensures the wiring
PR does not touch the registry simultaneously with marker-UI work.

Acceptance:

- registry JSON gains `elevationM` (DEM-derived) and `terrainMaskDeg`
  (single-value horizon mask, defaulted to `0` per §4.4) per station,
  authored in a dedicated prep-PR;
- new `scripts/refresh-station-elevation.mjs` re-runs the DEM lookup for the
  69 stations and writes a `public/fixtures/ground-stations/station-elevations.json`
  cache; the script is a build-time tool, not runtime;
- `visibility-utils.ts:48-61` reads `altMeters` from `elevationM`;
- `rain-attenuation.ts:274` reads `stationHeightAboveSeaKm` from `elevationM / 1000`;
- elevation threshold per look-angle now combines `DEFAULT_ELEVATION_THRESHOLD_DEG`
  (10°) with per-station `terrainMaskDeg`;
- `RuntimeStationPrecisionState` gains `elevationM` and `terrainMaskDeg`;
- Row 6 footer + `[data-station-precision-disclosure]` expose the values;
- D6 smoke asserts both values appear per station.

Smokes that must keep passing: same as F5 set. Bundle size: + ≈ 4 KB for
the elevation cache.

Risk highlights: pair compute may change visibility window count for stations
where the DEM moves them above sea level by tens of metres at non-zero
elevation — capture pre-F6 visibility window counts.

LOC estimate: ≈ 350 (most of it the build-time DEM refresh script).

### Slice F7 — Live TLE + constellation membership

Covers gaps F01, F33.

Acceptance:

- new `scripts/refresh-tle.mjs` build-time downloader fetches CelesTrak GP
  endpoints (`active` → LEO, `gnss` → MEO, `geo` → GEO), writes
  `public/fixtures/satellites-network/<orbit>-<utc>.tle`, AND writes
  `public/fixtures/satellites-network/manifest.json` listing the paths plus
  `generatedAtUtc`, `recordCount`, and `epochRangeUtc` per orbit;
- new `scripts/refresh-satcat.mjs` fetches `satcat.csv` (~5 MB) and emits
  `public/fixtures/satellites-network/satcat-summary.json` (target payload
  ≈ 250 KB; ~20× reduction). The summary retains **only**: `noradId` (int),
  `objectName` (string), `operatorFamily` (string, mapped via internal
  alias table), `constellationName` (string, e.g., "STARLINK", "GALILEO"),
  `orbitClass` (`"LEO" | "MEO" | "GEO"` from SATCAT orbital params), and
  `decayDate` (ISO string or null). Dropped at build time: international
  designator, launch date, launch site, country of origin, period / apogee /
  perigee / inclination, RCS size, data status, ops status, owner.
  Reviewers needing dropped fields go to the upstream SATCAT CSV directly
  (referenced in Row 5 d3). Runtime parses only the summary JSON, never the
  full CSV;
- `runtime-projection.ts` fetches `manifest.json` once at bootstrap (a single
  HTTP GET against the bundle path, NOT a filesystem probe — browser bundles
  cannot enumerate the bundle's filesystem). **Explicit sourceMode
  resolution rules** (in evaluation order):
    1. **`local-snapshot`** — `manifest.json` HTTP fetch returns 404 (manifest
       absent from build). This is the default production-bundled-offline
       state. Runtime uses in-bundle `satellites/` paths.
    2. **`network-snapshot`** — `manifest.json` HTTP fetch returns 200 AND
       every orbit's `health = fresh` per §4.5 freshness rule. Runtime uses
       `satellites-network/` paths.
    3. **`fallback-local-snapshot`** — `manifest.json` HTTP fetch returns
       200 BUT at least one orbit's `health ∈ {stale, unknown-age,
       rejected}` OR the manifest JSON fails to parse OR a referenced
       `satellites-network/*.tle` file fetch fails. Runtime uses in-bundle
       `satellites/` paths but tags the source as a "tried-and-failed
       network refresh" so reviewers can see the difference.

  Rule (3) is the ONLY path that produces `fallback-local-snapshot`. Rule
  (1) is `local-snapshot`. The two paths are mutually exclusive — a missing
  manifest is NEVER `fallback-local-snapshot`. This eliminates the v2 smoke
  ambiguity codex flagged.
- **D6 smoke is deterministic on sourceMode** via two pinned scenarios:
  (i) **`offline-baseline` smoke**: bundle deliberately omits
      `satellites-network/` directory entirely. Asserts
      `sourceMode = local-snapshot` (rule 1).
  (ii) **`network-frozen-fresh` smoke**: bundle ships
      `satellites-network/manifest.json` + matching frozen TLE files +
      a frozen `referenceUtc` build-step substitution that holds the
      snapshot within freshness threshold. Asserts
      `sourceMode = network-snapshot` (rule 2).
  Neither smoke triggers rule 3 (`fallback-local-snapshot`) — that path
  requires a corrupt/stale network bundle, which is a runtime degradation
  case, not a baseline. A separate optional smoke
  `network-frozen-stale` could exercise rule 3 later; not required for
  F7 ship gate.

  Earlier v2 wording mixed rules 1 and 3 into a single
  `fallback-local-snapshot` outcome; v3 separates them so the smoke can
  assert the right one without ambiguity.

(Original "Two modes:" paragraph below superseded by §4.5 + the
resolution rules above; left only for line-numbered audit traceability.)
- D6 smoke pins `sourceMode = local-snapshot` (offline-deterministic
  contract); the smoke must NEVER accept both `local-snapshot` and
  `fallback-local-snapshot` as valid, because that ambiguity would mask
  a real fallback bug. Two modes:
  (i) "offline" smoke: deliberately deletes any `satellites-network/manifest.json`
      from the test bundle before run; asserts `sourceMode = local-snapshot`;
  (ii) "network-frozen" smoke: ships a frozen `satellites-network/manifest.json`
      + matching frozen TLE files (with snapshot epoch held within freshness
      threshold by a build-step substitution); asserts `sourceMode =
      network-snapshot`. CI runs both; neither uses live network;
- `RuntimeTleSourceFreshness.constellationMembership` aggregates SATCAT
  membership counts; Row 5 d3 names the top three constellations by count
  (e.g., "60 Starlink, 30 OneWeb, 18 GPS");
- the TLE telemetry chip in `chrome.bottomLeft` carries
  `data-source-mode="local-snapshot" | "network-snapshot" | "fallback-local-snapshot"`;
- CelesTrak attribution string lands in the chip dataset and in Row 5 d3
  references.

Smokes that must keep passing: same as F6 set. The smokes themselves must
remain offline-deterministic by reading `public/fixtures/satellites/` (in-bundle)
or a frozen `public/fixtures/satellites-network/` artefact, never live network.
CI must execute `scripts/refresh-tle.mjs` as an opt-in step (e.g., manual
trigger or scheduled job), not on every test run.

Risk highlights: G3 60× replay continuity must not regress when
`sourceMode = network-snapshot` flips to `fallback-local-snapshot` mid-session
(it should not — refresh runs at bootstrap only); record the bootstrap-only
contract in the smoke.

LOC estimate: ≈ 400 (most of it the two refresh scripts).

### Slice F8 — Tier + cap surfacing + policy selector

Covers gaps F02, F30, F31, F32. **F8 is rescoped vs v1**: codex challenge
2026-05-18 confirmed that `tier-inference.ts:48-56` already returns only
`public-disclosed | geometric-derived` and `PublicPairSourceTier` already
excludes `operator-validated`; the "remove operator-validated tier from
runtime" item is a no-op and is dropped. F8 v2 focuses on the S1-authorised
cap raise at cadence 30 s, policy selector, alias canonicalisation, and the
cap-disclosure surface.

Acceptance:

- per-orbit TLE cap raise target: LEO 200, MEO 100, GEO 60. **Cap raise is
  LEO-effective only in practice**: current fixture inventory has MEO = 33
  satellites (99 lines / 3) and GEO = 30 satellites (90 lines / 3), both
  below the 60 cap. Raising MEO to 100 and GEO to 60 is a no-op against
  current fixtures; LEO is the only orbit class where the cap currently
  binds (1800 lines / 3 = 600 satellites in inventory, capped at 60 today).
  F8 documents this explicitly in the slice commit message so reviewers
  know the cap raise's real impact is LEO-only. The MEO/GEO cap values are
  raised in parallel for future-proofing (when inventories grow), with no
  runtime change at landing time.
- LEO cap raise to 200 is authorised at cadence 30 s per S1 entry 14
  (p95 = 391 ms, comfortably under the 1 s G4 gate). F8 ships the LEO 200
  cap with cadence HELD at 30 s (the F1 wrapper's production LEO value).
  MEO 100 cap raise is a no-op against current fixture inventory
  (33 satellites) but ships for future-proofing. GEO cap unchanged at 60
  (current inventory 30 satellites). Combined LEO 200 cap + LEO 10 s
  cadence is NOT shipped in F8; it remains gated on the §11
  PERF-FOLLOWUP-PENDING row and requires a separate follow-up PR after the
  post-F7 empirical smoke confirms ≤ 1 s p95 under per-orbit cadence;
- URL parameter `?policy=cross-orbit-live | leo-first | bootstrap-balanced-v1`
  selects an alternate handover policy; absence preserves the default;
- the visible Row 5 d3 disclosure quotes the active policy id and threshold
  values;
- `operatorFamily` alias canonicalisation is implemented as a small
  `public/fixtures/ground-stations/operator-family-aliases.json` lookup, with
  `tier-inference.ts` comparing canonicalised families before falling back to
  exact string match;
- new `[data-cap-disclosure]` element in Row 5 d3 reports the per-orbit cap
  versus per-orbit inventory; D6 smoke asserts the element exists and reports
  matching counts.

Smokes that must keep passing: same as F7 set. The G4 budget regression must
be re-baselined inside the same commit per the S1 outcome. Bundle size:
+ ≈ 4 KB for the alias table.

Risk highlights: cap raise is the only slice that changes G4 baseline numbers
materially; document the pre-F8 worst-case, S1 measured envelope, and
post-F8 worst-case in the slice commit message.

LOC estimate: ≈ 250 (down from v1 ≈ 300 after dropping the no-op
operator-validated removal).

### Slice F9 — Visual evidence of wave-2 data impact

Covers gaps F43, F44, F45, F46, F47, F48, F49, F50 (new visual-evidence
gaps added 2026-05-19; not part of the original 2026-05-18 audit). F9
exposes wave-2 contract outputs (F2 RSRP, F3 atmospheric components,
F5 throughput, F7 TLE freshness) as encoded visual primitives so reviewers
can SEE the wave-2 layer is live without reading raw dB / Mbps numbers.

**Scope clarification**: F9 extends the existing `TleFirstSceneViewModel`
with styling and disclosure-body content; it does NOT introduce a second
scene contract. R6 forbids touching `marker-*.ts`, `station-markers.ts`,
`composition.ts`, `styles.css`; F9 routes all styling through module-scoped
`<style>` injection from `chrome-telemetry.ts` / `v4-projection-side-panel.ts`
/ the selected-pair scene layer that already owns Cesium actor styling. No
global stylesheet edit.

Acceptance:

- **F43 per-satellite RSRP marker**: Cesium actor color encodes
  `receivedPowerProxyDbm` per visible satellite. Color band thresholds
  (project-tuned; documented in slice-0 baseline appendix):
  green ≥ −110 dBm, amber −110 to −120 dBm, red < −120 dBm, grey =
  `unavailable` (proxy = null per §4.1 nullability rule). Encoding also
  carries a shape redundancy: triangle for LEO, square for MEO, circle for
  GEO. Cesium actor recolor is **event-driven only on
  `receivedPowerProxyDbm` change**, not per replay tick (perf
  requirement; per §11 risk row). Row 5 d3 gains a small legend chip
  documenting the color × shape band;
- **F44 antenna gain polar plot**: SVG mini-plot inside Row 5 d1 body
  showing S.1528 (sat boresight + off-axis) and S.465 (ground) gain
  rolloff at the current `RfChainBreakdown.carrierFrequencyGHz`. Plot
  axes: angle (-90° to +90°), gain dBi. Updates when carrier band
  changes via re-selection. V-band fallback (`rx-antenna-gain =
  unavailable`) renders an empty plot with non-claim copy "S.465-6 not
  defined above 31 GHz; see §7 F2 carveout";
- **F45 TLE freshness chip color** via `data-source-mode` attribute
  selector on `[data-tle-telemetry-chip]`:
    - `data-source-mode="network-snapshot"` → green tint background;
    - `data-source-mode="fallback-local-snapshot"` → amber tint background;
    - `data-source-mode="local-snapshot"` → neutral grey (default).
  Colors live in module-scoped `<style>` from `chrome-telemetry.ts`
  (NOT in global `styles.css` per R6). Chip dataset attribute is the
  smoke target; computed background-color is the visual confirmation;
- **F46 handover reason link-line animation**: at each `handoverEvents`
  emission during replay, the selected-pair active link polyline
  briefly flashes color for 500 ms:
    - `cross-orbit-migration` → purple (matches V-MO1 modifier in Row 4);
    - `better-candidate-available` → blue;
    - `current-link-unavailable` → red;
    - `policy-tie-break` → grey;
    - `initial-acquisition` → neutral white (no flash).
  Animation owned by the selected-pair scene layer (already R6-safe
  territory; polyline NOT shared with marker module). Shape redundancy:
  pill text in `chrome.bottomRight` replay event pill already names the
  reasonKind, so color is supplementary;
- **F47 dominant factor pill**: Row 5 d1 disclosure body header gains a
  one-line text computed from `atmospheric-composite.inputSummary`,
  format "Top atmospheric contributor: rain 8.3 dB at 23°N tropical"
  where the contributor with max `*AttenuationDb` is named (rain /
  cloud / scintillation / gas). When all four components are < 0.1 dB,
  the pill shows "Atmospheric loss minimal (< 0.1 dB total)";
- **F48 atmospheric composite stacked bar**: Row 5 d1 SVG horizontal bar
  with four colored segments (rain / cloud / scintillation / gas)
  proportional to each component's dB contribution; total bar length
  scales to the `atmospheric-composite.contributionSignedDb`. Hover
  tooltip per segment shows the absolute dB value and the standards
  citation (P.618 for rain/scint, P.840 for cloud, P.676 for gas). When
  composite is null (F3 grids unavailable per S3), the bar renders empty
  with non-claim copy;
- **F49 pre/post comparison view**: URL parameter
  `?compare=pre-wave-2` triggers a split-pane Row 3 stats + Row 4
  event-list rendering. Left pane shows current wave-2 numbers; right
  pane shows the wave-1 baseline frozen in `slice-0-baseline.md` §6
  (must be captured BEFORE F2/F3/F5/F7 land — slice-0 baseline becomes a
  data prerequisite for F9 to ship usefully). Without `?compare=`
  param, the view renders as today (single pane). Deltas in event
  count, comm time, and per-orbit throughput are highlighted via
  green ↑ / red ↓ arrows + numeric delta;
- **F50 wave-2 active indicator**: Row 6 footer extends with
  `[data-wave2-active]` badge that renders "wave-2 data layer: ACTIVE"
  when `RfChainBreakdown.receivedPowerProxyDbm != null` AND
  `RuntimeDataCompletenessState.atmosphericLookups.length > 0`. Renders
  "wave-2 data layer: PENDING-SPIKE" when proxy is null due to S2a.
  Renders nothing when wave-2 has not yet wired (legacy mode);
- D6 smoke gains assertions for the 8 visual primitives:
    - F43: every visible Cesium actor has a non-default color encoding
      (RGB ≠ default white) and a shape attribute (triangle/square/circle);
    - F44: SVG element `[data-antenna-pattern-plot]` exists inside Row 5 d1
      when F2 is wired;
    - F45: TLE chip dataset `data-source-mode` ∈ {fresh, fallback, local};
      computed background-color RGB matches the documented band;
    - F46: replay smoke at 60× emits at least one polyline color
      transition matching a handover event timestamp;
    - F47: Row 5 d1 body contains "Top atmospheric contributor:" string
      or "Atmospheric loss minimal" string;
    - F48: SVG element `[data-atm-composite-bar]` has four sub-segments
      (or zero when composite is null) and hover-text per segment;
    - F49: `?compare=pre-wave-2` renders both Row 3 panes; default URL
      renders single pane;
    - F50: Row 6 contains `[data-wave2-active]` element with text
      matching one of {ACTIVE, PENDING-SPIKE, hidden}.

Smokes that must keep passing: same as F8 set, plus:
- `verify-information-density` re-baselined for Row 5 d1 + Row 6 height
  changes;
- new `verify-wave2-visual-evidence.mjs` covering the 8 D6 assertions
  above;
- new `verify-replay-fps.mjs` measuring 60× replay frame rate with F43
  per-event recolor; gate: ≥ 30 fps p95 on baseline hardware.

Dependencies (acceptance items per slice that must land first):
- F43, F44, F46 depend on F2 (`RfChainBreakdown` + carrier band) which
  itself depends on §12.1 S2a anchor closure for `tx-eirp` to be
  non-null;
- F47, F48 depend on F3 (`atmospheric-composite.inputSummary` carrying
  the four component dB values) which itself depends on §12.1 S3
  ITU-grid legal closure;
- F45 depends on F7 (`RuntimeTleSourceFreshness.sourceMode`);
- F49 depends on slice-0 baseline capture run BEFORE F2/F3/F5/F7 land
  (captures the comparison reference);
- F50 depends on F2 + F3 visibility into the runtime contract.

F9 can land **incrementally**: F45 + F50 ship as soon as F7 + the
contract shape are live; F47 + F48 ship after F3; F43 + F44 + F46 ship
after F2 + S2a; F49 ships once slice-0 baseline is captured. The slice
is gated on no single spike — each visual primitive ships when its
data-source prerequisite is met.

Risk highlights:
- Cesium actor recolor across visible satellites can drop replay fps at
  60× if recolor runs every tick. **Mitigation**: F43 recolor is
  event-driven on `receivedPowerProxyDbm` value change only (which
  changes at the cadence of `runtime-projection-worker-client` compute
  events, not per replay tick). See §11 new row.
- Color encoding could fail for color-blind reviewers. **Mitigation**:
  shape (triangle/square/circle for F43; pill text for F46) provides
  non-color redundancy.
- Pre/post comparison (F49) requires the wave-1 baseline be captured
  BEFORE F2/F3/F5/F7 land, otherwise the "before" numbers leak post-
  wave-2 data. **Mitigation**: slice-0 baseline capture is a hard
  prerequisite committed before any wiring PR; the captured baseline
  lives in `slice-0-baseline.md` §6 appendix.

LOC estimate: ≈ 600 (SVG plots ≈ 150 + Cesium color/shape binding ≈ 200
+ animation timer + comparison view ≈ 150 + Row 6 badge + module-scoped
styles ≈ 100).

## 8. Acceptance Criteria

### A1. RF chain breakdown

For every selected-pair runtime route:

- `RuntimeDataCompletenessState.rfChainBreakdown.terms` contains the five
  kinds defined by `RfChainTermKind`, in the §5.1 documented order
  (`tx-eirp`, `free-space-path-loss`, `gas-absorption`,
  `atmospheric-composite`, `rx-antenna-gain`);
- each term has a non-null `modelId`, a non-empty `standardsRef`, and a
  `contributionSignedDb` that is either a finite number (positive for
  gains, negative for losses) OR `null` when the term is `unavailable` per
  §3 truth class;
- **Null propagation rule**: if any term has `contributionSignedDb = null`,
  then `receivedPowerProxyDbm = null`. Otherwise `receivedPowerProxyDbm`
  exactly equals `Σ(terms[*].contributionSignedDb)` within 0.5 dB rounding
  error — no separate EIRP base addition (the `tx-eirp` term already
  carries that contribution);
- when §12.1 spike S2a is unresolved at A1 evaluation time, the
  `tx-eirp` term carries `provenance.truthClass = "unavailable"` and
  `contributionSignedDb = null`; D6 smoke asserts that the proxy is
  reported as `null` whenever any term is `unavailable`, not silently
  computed without it.

### A2. Atmospheric grid lookup

For every selected-pair runtime route:

- `RuntimeDataCompletenessState.atmosphericLookups` contains at least one
  entry per active grid source (P.835-6, P.836-6, P.840-9, P.837-8, P.839-4);
- each lookup carries a non-null cell size and an explicit `interpolation`
  field;
- `interpolation = "fallback-global"` is allowed only when the lookup cell
  lands in a published no-data region.

### A3. Station RF profile coverage

Both stations on the selected-pair route expose:

- non-null `elevationM`, `terrainMaskDeg`, `antennaDiameterM`, `peakEirpDbm`,
  `txPolarization`;
- the `*Source` field for each value documents `operator-disclosed` vs
  project-applied path;
- the Row 6 footer aggregate disclosure-coverage chip is non-null.

### A4. TLE source freshness

For every selected-pair runtime route:

- `RuntimeTleSourceFreshness.sourceMode` ∈
  `{"local-snapshot", "network-snapshot", "fallback-local-snapshot"}`;
- `maxEpochUtc` is non-null whenever the snapshot has at least one parsed
  record;
- `noradIdRangeSummary` is non-empty for non-empty snapshots;
- `constellationMembership` is non-empty when SATCAT data is bundled.

### A5. Policy disclosure

For every selected-pair runtime route:

- `RuntimeDataCompletenessState.policyDisclosure.activePolicyId` matches the
  policy actually applied to handover decisions;
- `thresholds` is non-null and matches the policy table in §7 slice F5;
- `thresholdSources` carries a non-null `RuntimeProvenanceTag` per threshold.

### A6. Cap disclosure

For every selected-pair runtime route:

- `capDisclosure.perOrbitCap` records the runtime cap (post-F8: LEO 200,
  MEO 100, GEO 60);
- `perOrbitInventory` records the in-bundle TLE record count per orbit;
- `cappedAtRuntime[orbit] === true` when the inventory exceeds the cap.

### A7. Modeled-output completeness

`RuntimeDataCompletenessState.modeledOutputs` carries the existing six
kinds plus the three wave-2 kinds (`cloud-attenuation`, `scintillation`,
`eirp-rsrp`), each with a per-output `inputSummary` (not a shared object).

### A8. CSV + debug parity

The CSV export carries one section per new contract addition:

- `# RF chain breakdown` (one row per `RfChainTerm`);
- `# Atmospheric lookups` (one row per `AtmosphericGridLookup`);
- `# Station RF profile` (one row per station);
- `# TLE freshness` (one row per orbit);
- `# Cap disclosure` (one row per orbit);
- `# Policy disclosure` (one row);

The D6 smoke parses each section and compares to the debug payload.

## 9. Verification Matrix

| Gate | Purpose | Slices affected |
| --- | --- | --- |
| `npm run build` | type + bundling regression | all |
| `npx tsx --test tests/unit/tle-first-scene-view-model.test.mjs` | scene adapter | F1 (per-orbit cadence), F2 (carrier/band), F8 (policy selector) |
| `node scripts/verify-tle-first-scene-view-model-runtime.mjs` | selected-pair runtime mode, actor/link/cue, fixed fallback mode | all |
| `node scripts/verify-g1-bucket-a-coverage.mjs --port=<port>` | requirement coverage surface | F2 (R1-T5 row), F5 (R1-F4 row), F7 (K-A4 chip dataset), F8 (cap disclosure row) |
| `node scripts/verify-random-pair-projection-budget.mjs --base-url=<dev-url> --port=<port> --seed=<int>` | compute budget | F1 (per-orbit cadence), F8 (cap raise) |
| `node scripts/verify-information-density.mjs --port=<port>` | panel density and no-overlap checks | F2 (Row 5 d1 line count), F3 (Row 5 d1 line count), F8 (Row 5 d3 line count) |
| `node scripts/verify-60x-replay-continuity.mjs --port=<port>` | replay continuity | F1 (cadence), F7 (bootstrap-only network refresh) |
| `node scripts/verify-tle-first-data-completeness.mjs --port=<port>` | provenance coverage | all (each slice extends the smoke) |

Per-slice smoke deltas:

- **F1**: D6 adds assertions for max-epoch health, NORAD/COSPAR coverage,
  per-satellite SGP4 error count, per-orbit cadence values.
- **F2**: D6 adds assertions for `rfChainBreakdown.terms` length and order;
  G1 R1-T5 row regenerated.
- **F3**: D6 adds assertions for the three atmospheric lookups
  (P.835-6, P.836-6, P.840-9).
- **F4**: D6 adds assertions for the two rain-climatology lookups
  (P.837-8, P.839-4).
- **F5**: D6 adds assertions for `policyDisclosure.thresholds` matching the
  per-orbit table; G1 R1-F4 row regenerated.
- **F6**: D6 adds assertions for `stationRfProfiles[*].elevationM` and
  `terrainMaskDeg` per station.
- **F7**: D6 adds assertions for `tleFreshness.sourceMode` and
  `constellationMembership` shape; verify-60x asserts no source-mode flip
  mid-session.
- **F8**: D6 adds assertions for `capDisclosure` per-orbit counts and Row 5
  d3 cap-disclosure element; G4 budget re-baselined.

## 10. Non-Goals

- This SDD does not change the URL contract or the route shape.
- It does not introduce a second 3D scene view-model; the existing
  `TleFirstSceneViewModel` continues to render the runtime. F9 visual
  evidence extends actor styling + disclosure body content on top of the
  existing contract; the contract shape is unchanged.
- It does not change the fixed demo `fixture-fallback` route's data path.
- It does not claim measured operator handover logs, measured throughput,
  measured jitter, or measured congestion. Every wave-2 addition is modeled.
- It does not introduce live operator telemetry feeds or commercial routing
  truth.
- It does not move the visible policy selector into the default UI; alternate
  policies remain URL-parameter-gated.
- It does not redistribute 3GPP TR table content; it cites §-anchors only.
- It does not require Internet access at runtime; CelesTrak refresh runs at
  build time, runtime stays offline-safe.
- It does not switch the default orbit source to Space-Track, nor does it
  switch the default runtime format to OMM/JSON/CSV. TH5 keeps that migration
  gated by `th5-orbit-source-policy-gate.md`.

## 11. Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| **PERF-FOLLOWUP-PENDING** — combined LEO 200 cap + per-orbit LEO 10 s cadence not yet empirically measured (S1 measured global cadence only) | F8 + F1 LEO 10 s upgrade cannot ship simultaneously until confirmed | Run post-F7 smoke at config (LEO 200 cap, per-orbit cadence LEO 10 s / MEO 60 s / GEO 120 s) with seed 20260517 × 3 runs; gate at p95 ≤ 1000 ms; report appends to `docs/spike/multi-station-selector/spike-S1-cap-cadence-perf.md` as §-followup or new spike-S1b report |
| **LEGAL-SPIKE-PENDING (S3)** — ITU-R grid bundling (P.835-6, P.836-6, P.837-8, P.839-4, P.840-9) under ITU Terms of Use; bundling for non-commercial vs free-redistribution status TBD | F3 + F4 BLOCKED on S3 | S3 deliverable: legal opinion on ITU rights notice + 3GPP Article 3.2.2 covering (a) bundle, (b) build-step download, (c) runtime cache. Decision sets which §6 path lands |
| **EIRP/BW/T_sys-anchor-SPIKE-PENDING (S2a)** — satellite EIRP, allocated bandwidth, system noise temperature seeds for F2 RSRP proxy + F5 SNR + Shannon throughput | F2 RSRP arithmetic BLOCKED; F5 throughput BLOCKED (with `unavailable` fallback per §7 F5 non-shipping condition) | S2a deliverable per §12.1: defensible per-orbit anchors (3GPP TR 38.821 §6.1.1 + §6.1.5 system parameters via §-anchor citation subject to S3 IPR, or operator-disclosed per station, or `unavailable`-tagged with explicit non-claim) |
| **HYSTERESIS-RETUNE-SPIKE-PENDING (S2b)** — handover policy 2 dB hysteresis tuned against path-loss-only RSRP; needs re-tune for EIRP+gain proxy | F2 cross-orbit hysteresis decisions risk thrash | S2b deliverable per §12.1: measured cross-orbit RSRP-delta distribution for 5 walkthrough URLs + recommended hysteresis value + fallback value. Depends on S2a outcome |
| F2 RSRP proxy flips handover-event counts near boundaries | G1 R1-F4 row baseline shift | capture pre-F2 event counts per walkthrough URL; re-baseline in same commit |
| F3 / F4 grids increase bundle size | G7 build size, page-load | bundle delta budget set to < 1 MB across F3 + F4; grids stored as JSON, not WASM |
| F3 humid-tropics throughput swings credibly | Row 5 d1 panel screenshots regress | capture pre-F3 panel screenshots; documented in slice commit |
| F5 latency budget tightening drops marginal links | G1 R1-F4 row baseline shift | re-baseline; document expected event-count delta per URL |
| F6 DEM lookup adds station altitude → rare visibility window changes | G4 budget tail | re-run worst-case smoke under F6 set; document any tail change |
| F7 network refresh fails or returns malformed TLE | runtime starts under `fallback-local-snapshot` | hard-gate parser failure path; D6 asserts both modes work |
| F7 CelesTrak attribution missing | license violation | dataset attribute on TLE chip + Row 5 d3 reference list; D6 asserts presence |
| F8 cap raise breaks G4 budget | G4 fails post-merge | tighten compute path before merge; raise cap incrementally LEO 60 → 120 → 200 if needed |
| Polar / antipodal pair degenerates rain-height grid lookup | `interpolation = fallback-global` | non-claim copy explains fallback; smoke covers both walkthrough antarctic-arctic and tropical URLs |
| Schema delta breaks existing fixture path | `operator-validated` fixture stops compiling | the fixture path types retain their existing shape; wave-2 types are additive |
| `txPolarization` registry default `circular` overrides operator-disclosed linear | misleading polarization metadata | seed registry with `txPolarization: "circular"` only where no operator disclosure exists, otherwise carry operator value; `txPolarizationSource` records which path applied |
| Multiple Claude / Codex sessions edit registry JSON concurrently | parallel-session collision (R6 caution applies to registry too) | always `git add` registry JSON by name; never `git add -A` |
| **F9 Cesium per-sat recolor at 60× replay** can drop fps below 30 if recolor runs per replay tick | replay continuity G3 + G5 visual-density regress | F43 acceptance pins recolor to event-driven on `receivedPowerProxyDbm` change (driven by `runtime-projection-worker-client` compute events, not per-tick); new `verify-replay-fps.mjs` smoke gates ≥ 30 fps p95 |
| F9 color encoding excludes color-blind reviewers | accessibility regression | F43 + F46 acceptance require non-color redundancy (shape for F43 actors, pill text for F46 reasonKind); D6 smoke asserts shape attribute presence |
| F49 pre/post comparison requires wave-1 baseline captured before wave-2 wires | "before" numbers leak post-wave-2 data if baseline captured too late | slice-0 baseline capture is hard prerequisite before any F2/F3/F5/F7 wiring PR; baseline frozen in `slice-0-baseline.md` §6 appendix |

## 12. Resolved Decisions

1. **Registry schema delta is +5 fields per station**: `elevationM`,
   `terrainMaskDeg`, `antennaDiameterM`, `peakEirpDbm`, `txPolarization`.
   Antenna diameter falls back to a documented heuristic when the operator
   does not disclose; `peakEirpDbm` falls back to `null` (tagged
   `unavailable` per §3) pending §12.1 spike S2a. The `*Source` field per
   profile records which path applied. (Open Q #8 resolved (a); EIRP seed
   path moved to S2a.)
2. **Rain-rate slider default remains 0 mm/h** in Row 2 to preserve the G1
   baseline. The pair-midpoint P.837-8 R_0.01 reference value renders as a
   **display-only climatology anchor** in Row 5 d1 disclosure body header
   (clearly labelled "climatology reference; slider remains user-driven"),
   never feeding the compute path unless the user moves the slider. (Open
   Q #6 resolved; double-truth concern reconciled by explicit display-only
   labelling.)
3. **TLE refresh is build-time, not runtime**: `scripts/refresh-tle.mjs` is
   an opt-in build-step downloader; the runtime never opens a network
   connection on its hot path. Runtime selects between in-bundle
   `satellites/` and refreshed `satellites-network/` via a generated
   manifest at `satellites-network/manifest.json` (single HTTP GET at
   bootstrap, not a filesystem probe). (Open Q #3 resolved (α); manifest
   shape per §4.5.)
   TH5 source-policy closure keeps this decision in force: no Space-Track or
   CelesTrak live browser/runtime fetch is authorized by this SDD.
4. **Carrier band selection picks the narrowest mutually-supported band**
   from `stationA.supportedBands ∩ stationB.supportedBands`. The previous
   per-orbit canonical default (LEO Ku, MEO L, GEO Ka) becomes a fallback
   when the intersection is empty (shared-orbit guard already rejects
   non-shared orbits). (Open Q #1 resolved (a).)
5. **Alternate handover policies are URL-parameter-gated**: `?policy=<id>`
   selects from `cross-orbit-live | leo-first | bootstrap-balanced-v1`.
   Absence preserves the default. The visible Row 5 d3 disclosure quotes the
   active policy id and threshold values from `policyDisclosure`. (Open Q #4
   resolved.)
6. **Cap-disclosure UI surface lands in Row 5 d3** as a small additional
   line, not as a chip in chrome. The selector `[data-cap-disclosure]` is
   the smoke target. (Open Q #5 resolved.)
7. **Antenna diameter heuristic by precision**: `exact-coords` → 13 m,
   `operator-family-region` → 4.5 m. Operator-disclosed diameter overrides.
   (Open Q #8 — heuristic component resolved.)
8. **Satellite EIRP / bandwidth / T_sys anchors UNRESOLVED — tracked as
   §12.1 spikes S2a (anchors) + S2b (hysteresis re-tune).** The v1 SDD
   cited 3GPP TR 38.821 Table 6.1.1.1-9 LEO Set-1 30 dBi / MEO 35 dBi /
   GEO 38 dBi. Codex challenge 2026-05-18 found two errors: (a) Table
   6.1.1.1-9 is the calibration-cases index, not the EIRP table; the
   system-parameter source is §6.1.1 Set-1 / Set-2; (b) the cited values
   are antenna gains (dBi), not EIRP (dBm) — EIRP combines Tx power +
   antenna gain. Codex v2 (2026-05-18) additionally noted bundling
   hysteresis re-tune with the anchors was over-scoped; v3 splits to
   S2a + S2b. F2 + F5 BLOCKED on S2a (with the F5 `unavailable`
   fallback path per §7 F5 non-shipping condition).
9. **DEM dataset is pre-baked**: `public/fixtures/ground-stations/station-elevations.json`
   stores the 69 station elevations from a one-time SRTM lookup, refreshed via
   `scripts/refresh-station-elevation.mjs` when the registry edits. The
   runtime does not open a DEM connection. (Open Q #10 resolved.)
10. **Polarization registry field defaults to operator-disclosed value where
    available**, falls back to `circular` for stations without a disclosed
    polarization. The `txPolarizationSource` field records which path applied.
    (Open Q #7 resolved.)
11. **Atmospheric chain composition follows ITU-R P.618-14 §2.4 eq. 65**
    (quadrature for {rain, cloud, scint}; linear-additive for gas). Sum
    convention: `RfChainTerm.contributionSignedDb` is signed so
    `P_rx_proxy_dBm = Σ(terms[*].contributionSignedDb)` directly. No
    separate EIRP base addition. (Codex challenge 2026-05-18 finding;
    reconciled in §4.1 and §5.1.)
12. **F.699 antenna pattern is retired from runtime** in favour of
    S.465-6. Bootstrap-physical-input-seeds drops its F.699 import.
    (Codex challenge 2026-05-18 ambiguity resolved.)
13. **F8 operator-validated tier removal is a no-op** and is dropped from
    F8 scope. `tier-inference.ts` already returns only
    `public-disclosed | geometric-derived`. F8 v2 covers the S1-authorised
    LEO 200 cap raise at cadence 30 s, policy selector, alias
    canonicalisation, and cap-disclosure UI only. (Codex challenge
    2026-05-18 finding.)
14. **S1 perf spike closed (2026-05-19, commit 83ed47d)**:
    configuration LEO 60 cap + 10 s global cadence stays under 1 s G4
    gate (p95 = 795 ms); configuration LEO 200 cap + 30 s global cadence
    stays under 1 s G4 gate (p95 = 391 ms); combined LEO 200 cap + LEO
    10 s global cadence fails (p95 = 1027 ms, 27 ms over). Flame graph
    identifies `computeVisibilityWindowsForStation` as 86.2 % inclusive
    cost; SGP4 propagation (`sgp4`) as 38.1 % self-cost. Single-worker baseline
    (`runtime-projection-worker.ts`) is sufficient at the passing
    configurations. See
    `docs/spike/multi-station-selector/spike-S1-cap-cadence-perf.md` for
    the full envelope.
15. **F1/F8 cadence-cap split authorised from S1 evidence**: F1 LEO 10 s
    cadence upgrade is authorised at LEO 60 cap (S1 entry 14 evidence).
    F8 LEO 200 cap raise is authorised with cadence held at 30 s (S1
    entry 14 evidence). Combined LEO 200 cap + LEO 10 s per-orbit cadence
    remains gated on §11 PERF-FOLLOWUP-PENDING row; the combined upgrade
    lands only after the post-F7 follow-up smoke confirms ≤ 1 s p95.
    Per-orbit cadence (F1 `visibility-cadence-multi.ts`, landed db018a6)
    is the assumed implementation surface for the follow-up;
    global-cadence S1 measurement is an upper bound, not the production
    case.

## 12.1 Pending Spikes

Three spikes must close before their respective slices can ship. Each spike
returns a written report (lands at `docs/spike/multi-station-selector/spike-S<n>-<slug>.md`)
that this SDD §11 / §12 will incorporate.

| Spike | Title | Blocks | Deliverable | Notes |
| --- | --- | --- | --- | --- |
| **S1** | cap × cadence performance (CLOSED 2026-05-19, see §12 entry 14) | F1 cadence upgrade; F8 cap raise | Measured G4 envelope (worst-case, p50, p95) across {LEO 60 / 120 / 200} × {30 s / 10 s cadence}, MEO 60/100, GEO 60. Hardware = Chromium 1217 + 4-core + swiftshader (baseline). **Acknowledge the existing `src/features/multi-station-selector/runtime-projection-worker.ts` (≈ lines 30-45) + `runtime-projection-worker-client.ts` (≈ lines 39-83) — the worker exists; the spike measures its current behaviour first, and only recommends additional workers (e.g., worker pool) if the single-worker baseline fails.** Report includes flame graph of `computeVisibilityWindowsForStation`, identifies the linear cost factor, and recommends a (cap, cadence) configuration that stays under 1 s G4 gate | If no configuration stays under 1 s, S1 also returns a compute-path-optimisation proposal (additional worker via pool, SGP4 batching, sample-time memoisation) before F8 wiring lands |
| **S2a** | satellite EIRP / bandwidth / T_sys anchor | F2 RSRP proxy; F5 SNR / throughput | Defensible per-orbit-class anchor for THREE values: (i) `peakEirpDbm`; (ii) `txAllocatedBandwidthHz`; (iii) `T_sys` (system noise temperature). Spike returns one path per value: (a) 3GPP TR 38.821 §6.1.1 / §6.1.5 system parameters extracted by §-anchor citation (subject to S3 IPR policy); (b) operator-disclosed value per station, registry-authored, with `*Source` field; (c) `null` + `unavailable` tag with explicit non-claim. **F5 acceptance includes the non-shipping condition** (per §7 F5): if path (c) for both EIRP and bandwidth, Shannon throughput renders `unavailable` rather than misleading numbers | Must coordinate with S3 if path (a) is chosen, since 3GPP IPR Article 3.2.2 applies. v2 SDD bundled this with hysteresis re-tune; v3 split S2b out so the deliverables track independently |
| **S2b** | cross-orbit hysteresis re-tune | F2 handover policy hysteresis | Cross-orbit RSRP-delta distribution measurement for the 5 walkthrough URLs (post-S2a, since the proxy needs the anchor values). Spike returns a re-tuned hysteresis value (replacing the v1 default 2 dB) that absorbs cross-orbit EIRP + gain deltas without thrashing handover events. Returns measured 5-URL distribution + 1 recommended value + 1 fallback value with rationale | Depends on S2a outcome. If S2a returns path (c) for EIRP (no useful proxy), S2b deliverable is "hysteresis remains 2 dB tagged not-validated-for-cross-orbit" + non-claim string |
| **S3** | ITU + 3GPP redistribution legal | F3 + F4 grid bundling; F2 / F5 3GPP table extractions | Legal opinion on (i) ITU-R Terms of Use coverage for bundling P.835-6 / P.836-6 / P.837-8 / P.839-4 / P.840-9 grids inside the project bundle; (ii) 3GPP Partnership Agreement Article 3.2.2 coverage for extracting numerical values from TR tables vs §-anchor citation. Returns a policy decision per dataset: (a) bundle with retained notice, (b) build-step download-on-demand into local cache, (c) runtime fetch with cache-and-licence-banner | Spike may decline path (a) and force (b) for ITU grids — F3 / F4 acceptance text and §6 license column would update accordingly |

### 12.1.1 Spike closure procedure

Each spike closes when the following four checks pass:

1. **Author**: the engineer or reviewer who runs the spike writes the spike
   report at `docs/spike/multi-station-selector/spike-S<id>-<slug>.md` —
   following the report shape defined in this row's "Deliverable" column.
   Report has a `Status: closed` line at the top once review is signed off.
2. **Reviewer**: an independent reviewer (not the spike author) confirms the
   report addresses every item in the Deliverable column and the conclusion
   is internally consistent. A `Reviewed-by: <name>` line lands at the top
   of the report.
3. **Evidence**: every numerical value in the report cites either a measured
   smoke output (referenced by smoke script name + run ID), a standards
   §-anchor (3GPP / ITU-R / IETF), or an operator-disclosed source (URL +
   accessed date). Magic numbers without citation block closure.
4. **SDD v3 patch**: the spike author (or a co-author) lands a patch to
   THIS SDD (`tle-first-fidelity-uplift.md`) that updates §11 risks table
   (remove the SPIKE-PENDING row, add a NEW row only if the spike result
   surfaced a follow-up risk), updates §12 Resolved Decisions (move the
   relevant decision from §12.1 into §12 with the chosen path), and
   updates the §7 slice acceptance bullets that referenced the spike id.
   The patch references the spike report by path.

Spike closure does NOT automatically unblock the dependent slice — the
slice PR author confirms that the closure-patch SDD update matches the
slice acceptance language before opening the slice PR. This prevents a
spike report from one branch silently unblocking work on another branch
that has not picked up the patch yet.

## 13. References

### Internal SDDs and runtime modules

- `docs/sdd/multi-station-selector/tle-first-data-completeness.md` — wave-1
  data-completeness baseline (D0-D7).
- `docs/sdd/multi-station-selector/tle-first-3d-pipeline.md` — 3D scene
  view-model contract (Slice 5 final).
- `docs/sdd/multi-station-selector/runtime-data-contract.md` — base data
  contract; 2026-05-18 addendum already names the data-completeness payload.
- `docs/sdd/multi-station-selector/information-architecture.md` — IA §5
  Row 5 disclosure structure; IA §6.1 records the antenna-pattern wiring
  as a deferred follow-up to Bucket A.
- `docs/sdd/multi-station-selector/acceptance-criteria.md` — gate G1-G7.
- `docs/sdd/multi-station-selector/slice-0-baseline.md` §6 — TLE source
  inventory appendix (extended in F1 with NORAD/COSPAR coverage).
- `docs/sdd/multi-station-selector/th5-orbit-source-policy-gate.md` — source
  policy gate for CelesTrak default retention, OMM-capable future path, and
  Space-Track direct-ingestion blockers.
- `src/features/multi-station-selector/runtime-projection.ts` — selected-pair
  compute entry.
- `src/features/multi-station-selector/runtime-data-completeness.ts` — wave-1
  payload (extended by every wave-2 slice).
- `src/features/multi-station-selector/visibility-utils.ts` — TLE
  propagation + visibility geometry.
- `src/features/multi-station-selector/tier-inference.ts` — pair source-tier
  inference.
- `src/runtime/link-budget/free-space-path-loss.ts` — FSPL (3GPP TR 38.811
  §6.6.2).
- `src/runtime/link-budget/gas-absorption.ts` — gas (ITU-R P.676-13 Annex 2);
  extended in F3.
- `src/runtime/link-budget/rain-attenuation.ts` — rain (ITU-R P.618-14 §2.2.1
  × P.838-3 table); extended in F3 / F4.
- `src/runtime/link-budget/antenna-pattern.ts` — S.1528 + S.465-6; wired in F2.
- `src/runtime/link-budget/handover-policy.ts` — policy module; extended in
  F5 and F8.

### Standards (local copies under `paper-catalog/3gpp/` per
`.agent-memory/reference_3gpp_itu_local_sources.md`)

- 3GPP TR 38.811 §6.6.2, §6.7 — FSPL, propagation delay.
- 3GPP TR 38.821 §6.1.1 Set-1 / Set-2 system parameters, §6.1.5, §6.1.6.1.2,
  §7.3 — link budgets, system-temperature anchor for SNR (subject to S2a),
  latency / jitter targets, handover policy thresholds. (v1 SDD cited
  Table 6.1.1.1-9 as the EIRP source; codex challenge 2026-05-18 corrected
  this to §6.1.1 Set-1 / Set-2 system parameters.)
- ITU-R P.618-14 §2.2.1, §2.4 eq. 65, §2.5 — rain attenuation, total-atmospheric
  composition (quadrature), scintillation.
- ITU-R P.676-13 Annex 2 — gas absorption.
- ITU-R P.835-6 Annex 1 — reference atmospheres (latitudinal).
- ITU-R P.836-6 — surface water vapour density.
- ITU-R P.837-8 (2023) — rain rate exceedance (current in force; supersedes
  P.837-7).
- ITU-R P.838-3 §3 — specific rain attenuation coefficients.
- ITU-R P.839-4 — mean rain height.
- ITU-R P.840-9 — cloud attenuation.
- ITU-R S.1528 Annex 1 — satellite antenna pattern.
- ITU-R S.465-6 — earth-station antenna pattern (valid 2-31 GHz; V-band
  carveout per §7 F2).
- ITU-R V.665 — noise-temperature definition for kTB noise floor.

### Open-source dataset endpoints

See §6.

## 14. Audit appendix — 42 gap inventory roll-up

The full inventory and slice-combo analysis lives in the 2026-05-18 audit. The
table below maps each gap id to the slice that closes it and to its SDD
status (acknowledged ceiling vs. new finding).

| Gap | One-line | Slice | SDD status (pre-uplift) |
| --- | --- | --- | --- |
| F01 | Live TLE refresh absent | F7 | ack §2.1[E] (data-completeness) |
| F02 | 60-record cap hides full catalog | F8 | ack §2.1[B] |
| F03 | Pass start/end drift up to 30 s | F1 | new |
| F04 | TLE health from filename, not max-epoch | F1 | new |
| F05 | NORAD / COSPAR not exposed | F1 | new |
| F06 | SGP4 errors silently dropped | F1 | new |
| F07 | No per-station terrain mask | F6 | new |
| F08 | Station altitude assumed sea-level | F6 | new |
| F09 | Carrier band hardcoded per orbit | F2 | new |
| F10 | RSRP proxy = −FSPL only (no EIRP, no gain) | F2 | new |
| F11 | S.1528 + S.465 unwired | F2 | ack §2.1[C] + IA §6.1 |
| F12 | F.699 duplicated in bootstrap-seeds | F2 | new |
| F13 | Rain gated 10-30 GHz; P.838 covers 1-100 | F3 | new |
| F14 | Rain height simplified P.839 | F4 | new |
| F15 | No rain rate climatology baseline | F4 | new |
| F16 | Polarization hardcoded `circular` | F2 | new |
| F17 | Cloud attenuation P.840 absent | F3 | new |
| F18 | Scintillation P.618 §2.5 absent | F3 | new |
| F19 | Gas absorption uses global atmosphere | F3 | new |
| F20 | Surface pressure / temp global defaults | F3 | new |
| F21 | Throughput exp model, not Shannon | F5 | new |
| F22 | Clear-sky capacity magic table | F5 | new |
| F23 | Baseline jitter magic table | F5 | new |
| F24 | `jitterScale` magic exponent | F5 | new |
| F25 | Fixed 2 ms processing delay | F5 | new |
| F26 | `latencyBudgetMs = 600` too loose | F5 | new |
| F27 | `hysteresisDb = 2` magic | F5 | new |
| F28 | `minVisibilityWindowMs = 60_000` magic | F5 | new |
| F29 | `predictedVisibility` = pair-end only | F5 | new |
| F30 | Multi-policy module unwired | F8 | ack §2.1[D] |
| F31 | `operator-validated` runtime tier unreachable | F8 | new |
| F32 | `operatorFamily` exact-string match only | F8 | new |
| F33 | No constellation membership mapping | F7 | new |
| F34 | `propagatedSampleCount` window-wide | F1 | new |
| F35 | `displayTransforms` static enumeration | F1 | new |
| F36 | `cameraHint` value not reflected in payload | F1 | new |
| F37 | Freshness threshold flat across constellations | F1 | ack §2.1[E] |
| F38 | Default time window inconsistency (20 vs 360) | F1 | new |
| F39 | Sample step 30 s hardcoded for all orbits | F1 | new |
| F40 | `stationHeightAboveSeaKm: 0` hardcoded | F6 | new |
| F41 | `inputSummary` shared across modeled outputs | F1 | new |
| F42 | TLE parser drops classification / drag terms | F1 | new |
| F43 | Per-satellite RSRP marker missing (3D scene shows uniform color regardless of received power) | F9 | new-visual-evidence (2026-05-19) |
| F44 | Antenna gain polar plot absent (S.1528 + S.465 rolloff not visible) | F9 | new-visual-evidence (2026-05-19) |
| F45 | TLE freshness chip color uniform (snapshot mode not visually distinguishable) | F9 | new-visual-evidence (2026-05-19) |
| F46 | Handover reason link-line uniform color (cross-orbit-migration / current-unavailable / better-candidate / policy-tie-break all render identically) | F9 | new-visual-evidence (2026-05-19) |
| F47 | Dominant atmospheric factor not surfaced in Row 5 d1 (rain vs cloud vs scintillation dominance hidden) | F9 | new-visual-evidence (2026-05-19) |
| F48 | Atmospheric composite breakdown not visualised (rain / cloud / scint / gas proportions invisible to reviewer) | F9 | new-visual-evidence (2026-05-19) |
| F49 | Pre/post wave-2 comparison view absent (reviewer cannot side-by-side compare wave-1 baseline vs wave-2 output) | F9 | new-visual-evidence (2026-05-19) |
| F50 | Wave-2 active indicator missing (Row 6 footer does not surface whether wave-2 data layer is live, pending-spike, or absent) | F9 | new-visual-evidence (2026-05-19) |

Gap-to-slice coverage: 50 gaps → 9 slices, no gap unassigned (42 from the
2026-05-18 audit + 8 visual-evidence gaps F43-F50 added 2026-05-19).
Acknowledged ceilings (5 gaps: F01, F02, F11, F30, F37) flow through the
same slice path as new findings; the SDD does not separately track them
after this appendix.

**v2 spike-blocked gaps**: F02 (cap raise to LEO 200 at cadence 30 s) was
BLOCKED on §12.1 S1; resolved §12 entry 14 (S1 CLOSED 2026-05-19).
F09, F10, F11, F16 (F2 antenna + RSRP rigor) and F21-F28 (F5 throughput +
handover) are partially BLOCKED on §12.1 S2a (anchors) + S2b (hysteresis); F13, F14, F15, F17, F18, F19,
F20 (F3 + F4 atmospheric + climatology grids) are BLOCKED on §12.1 S3.
**F9 visual-evidence gaps F43-F50** inherit their parent slice's spike
blocks: F43 / F44 / F46 partially blocked on S2a (until `tx-eirp` term is
non-null, RSRP color and antenna polar plot have nothing to render);
F47 / F48 blocked on S3 (until ITU grids ship, atmospheric components stay
null); F45 / F50 spike-independent (F45 needs F7 only; F50 needs the
contract shape, not the values). F49 spike-independent but gated on
slice-0 baseline capture happening BEFORE F2/F3/F5/F7 land.
Spikes deliverables are written reports at
`docs/spike/multi-station-selector/spike-S<n>-*.md`; their outcomes update
this SDD §11 / §12 in-place when they close.
