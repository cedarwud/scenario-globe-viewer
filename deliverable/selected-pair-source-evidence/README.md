# Selected-Pair Source Evidence Package

Status date: 2026-06-22

This folder retains one generated selected-pair evidence package for slide and
review citations. The report HTML was last regenerated on 2026-06-22 (track B —
pinned local-snapshot default) on the WS-C Audit & evidence tab, which carries the
honesty grading matrix, the model-boundary disclosure, a standards-conformance
table (formula -> clause -> retained-PDF sha256 -> sample input/output from this
route), a rain-rate sensitivity sweep, a reproducibility imprint, and a
verification-status strip. The default source is now the pinned 2026-06-15 local
snapshots (`public/fixtures/satellites/…`, 882 actors = 600 OneWeb LEO / 33 Galileo
MEO / 249 commercial GEO); the CelesTrak network catalog (651 / 33 / 574 = 1258) is
an opt-in `?tleSource=network` refresh source. WS-F context (carried over): the
per-sample link budget uses the SGP4-propagated satellite geocentric radius for
slant range and the instantaneous per-station elevation, and rain attenuation
binds to the worse of the two stations at its own latitude/height. The selected
pair's mutual-visibility geometry over this window is actor rows 17, visibility
windows 17 (window membership is gated by elevation geometry only); the handover
sequence migrates across orbit classes under the cross-orbit-live policy. The
runtime-inventory disclosure records the active pinned inventory (600 / 33 / 249)
alongside the network-snapshot reference counts (651 / 33 / 574). All link-budget
magnitudes remain modeled / standards-derived; throughput is an illustrative
capacity proxy and the received-power value is a relative proxy (EIRP is not
available). It was produced by running:

```sh
npm run test:m8a-v4.11:slice5
```

The smoke generated the original artifacts under
`output/selected-pair-source-report/`; because `output/` is ignored, the HTML,
CSV, and smoke manifest were copied here as retained delivery evidence.

## Projection

| Field | Value |
|---|---|
| Route | `/?stationA=cht-yangmingshan&stationB=sansa-hartebeesthoek&startUtc=2026-06-15T00%3A00%3A00.000Z&durationMinutes=360` |
| Generated at | `2026-06-21T16:18:45.767Z` |
| Source tier | `geometric-derived` |
| Evidence kind | `cross-family-geometric` |
| Requirement rows | `34` |
| Station rows | `2` |
| TLE rows | `3` |
| Actor rows | `17` |
| Visibility rows | `17` |

## Retained Files

| File | Role | Size bytes | SHA-256 |
|---|---|---:|---|
| `runtime-projection-evidence-cht-yangmingshan-sansa-hartebeesthoek-20260615T000000Z-360m.html` | Readable evidence report with Requirements, Sources, Models, Audit & evidence, Raw data, and HTML download state. | 942065 | `6e6546e3e6be1d4b048775b990ea4f4a38492598ca79aca7edafbc22c218620a` |
| `runtime-projection-cht-yangmingshan-sansa-hartebeesthoek-20260615T000000Z-360m.csv` | Row-level export with source, provenance, and non-claim columns. | 61992 | `17fff9d9801b213819e38df1d681eff4cddb1a33462a1efb54f4903c64d0643d` |
| `smoke-manifest.output.json` | Original smoke manifest copied from ignored `output/selected-pair-source-report/`. | 1132 | `f56d842ed4b84206002ea168d84c8d92bfd03b4a1624be2b442ab77bb6e46b50` |
| `external-source-reconciliation.md` | Public-source reconciliation for selected-pair station values, recovered elevation source method, source conflicts, repair paths, and non-observable gaps. | 14666 | `1b3194ac0e619f0e847583b6f783b28ab21f4cd1f39f0811ac0998bfff384ace` |
| `open-elevation-selected-pair-query-2026-06-12.json` | Retained Open-Elevation query response that reproduces selected-pair legacy elevation cache values. | 2425 | `b21930f25a3da975fd16ac74a2b650bb9c6f31d230c92a2f9cde70c5226217e2` |
| `copernicus-dem-selected-pair-sample-2026-06-12.json` | Retained Copernicus GLO-30 selected-pair DEM comparison sample with tile/cell/datum traceability. | 6159 | `43a0dc022f2dd687d3812a3689b8f2c036284acf2cad1b8929c86b7bf8a8f349` |
| `copernicus-dem-selected-pair-terrain-mask-2026-06-13.json` | Retained Copernicus GLO-30 selected-pair terrain-mask sample and horizon algorithm output. | 162055 | `9382f7e36f7abf0fa4988962b5bcf96a80607c208df988de43d61a73e8ce4978` |
| `rain-source-repair-candidates-2026-06-12.json` | Retained local rain calibration repair-source candidates. | 3843 | `02d4898bc2d9cd385a0e9d8564f4471bc7de533648416bf498b2636b121835ad` |
| `local-rain-calibration-2026-06-13.json` | Retained public CWA local rain statistic mapped to a bounded 5 mm/h demo preset. | 5718 | `f3a36892ccf01cc7f8cf1c720fc284328e1e92265a487c079e6efbafe0150476` |
| `evidence-manifest.json` | Delivery-local structured manifest for this retained package. | 4741 | `9d046e97a89356d5f06ed0ade5397ed4ffdfcd3936015f9f9c1d36d26ba9dbbb` |

## Source Chain

Use this package with:

- [`../../docs/data-source-index.md`](../../docs/data-source-index.md) for the
  project-wide data-source map and source gap repair plan.
- [`external-source-reconciliation.md`](external-source-reconciliation.md) for
  selected-pair public-source comparison, source conflicts, and remaining
  non-observable gaps.
- [`open-elevation-selected-pair-query-2026-06-12.json`](open-elevation-selected-pair-query-2026-06-12.json)
  for the retained Open-Elevation response that reproduces the selected-pair
  legacy elevation cache values.
- [`copernicus-dem-selected-pair-sample-2026-06-12.json`](copernicus-dem-selected-pair-sample-2026-06-12.json)
  for the selected-pair Copernicus GLO-30 comparison cells.
- [`copernicus-dem-selected-pair-terrain-mask-2026-06-13.json`](copernicus-dem-selected-pair-terrain-mask-2026-06-13.json)
  for the selected-pair DEM-derived terrain-mask algorithm, radius, azimuth
  step, and sample checksums.
- [`rain-source-repair-candidates-2026-06-12.json`](rain-source-repair-candidates-2026-06-12.json)
  for candidate public sources used to choose the retained local rain sample.
- [`local-rain-calibration-2026-06-13.json`](local-rain-calibration-2026-06-13.json)
  for the retained public CWA local rain statistic and bounded 5 mm/h demo
  preset.
- [`../3gpp-itu-references/README.md`](../3gpp-itu-references/README.md) for
  retained 3GPP / ITU-R PDF citations and checksums.
- `public/fixtures/satellites/…` pinned TLE snapshots (default delivery geometry,
  per `demo-scenario-config.json`) and `public/fixtures/satellites-network/manifest.json`
  (opt-in `?tleSource=network`) for TLE source manifest metadata.
- `public/fixtures/ground-stations/multi-orbit-public-registry.json` and
  `public/fixtures/ground-stations/multi-orbit-public-registry-sources.md` for
  station registry source notes.

## Claim Boundary

This package can support:

- the selected route and projection inputs used by the report;
- the modeled selected-pair visibility, handover, and link-budget outputs;
- the source class, source tier, and source gap disclosures rendered by the
  report;
- the selected-pair public-source reconciliation and explicit source-conflict
  notes;
- the selected-pair Copernicus DEM comparison cells, runtime-adopted CHT DEM
  elevation, SANSA operator-stated altitude, and public-DEM-derived terrain
  masks;
- the retained public CWA local rain statistic and bounded 5 mm/h demo preset;
- standards-derived antenna-pattern model output with disclosed assumed Tier-B
  parameters;
- the row-level CSV export used for slide tables.

This package cannot prove:

- packet-test latency, jitter, throughput, or loss;
- native RF handover or active serving route migration;
- operator-private station or network validation;
- station RF hardware truth;
- surveyed RF horizon, local clutter truth, or full-registry DEM/terrain
  replacement;
- measured link-local weather, SANSA rainfall, scenario-window weather, or
  long-term R0.01 calibration;
- external acceptance thresholds or final written acceptance.
