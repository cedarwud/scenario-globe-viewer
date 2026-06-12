# Selected-Pair Source Evidence Package

Status date: 2026-06-12

This folder retains one generated selected-pair evidence package for slide and
review citations. It was produced by running:

```sh
npm run test:m8a-v4.11:slice5
```

The smoke generated the original artifacts under
`output/selected-pair-source-report/`; because `output/` is ignored, the HTML,
CSV, and smoke manifest were copied here as retained delivery evidence.

## Projection

| Field | Value |
|---|---|
| Route | `/?stationA=cht-yangmingshan&stationB=sansa-hartebeesthoek&startUtc=2026-05-17T00%3A00%3A00.000Z&durationMinutes=360` |
| Generated at | `2026-06-12T13:38:43.574Z` |
| Source tier | `geometric-derived` |
| Evidence kind | `cross-family-geometric` |
| Requirement rows | `34` |
| Station rows | `2` |
| TLE rows | `3` |
| Actor rows | `9` |
| Visibility rows | `9` |

## Retained Files

| File | Role | Size bytes | SHA-256 |
|---|---|---:|---|
| `runtime-projection-evidence-cht-yangmingshan-sansa-hartebeesthoek-20260517T000000Z-360m.html` | Readable evidence report with Requirements, Sources, Models, Raw data, and HTML download state. | 573763 | `a8d8a296c5852a929f5f0090b636e1ff7b1633e0a2f4caf739d0e1da8fc0a090` |
| `runtime-projection-cht-yangmingshan-sansa-hartebeesthoek-20260517T000000Z-360m.csv` | Row-level export with source, provenance, and non-claim columns. | 35868 | `806b4abbdfc94e4ea1b88492d2e286491a9cd8732601f2934c248037c26d989e` |
| `smoke-manifest.output.json` | Original smoke manifest copied from ignored `output/selected-pair-source-report/`. | 1130 | `97ba50e639372598ccf50e0409c91bc96dffe66d73f7d358f3ec216e3512439c` |
| `external-source-reconciliation.md` | Public-source reconciliation for selected-pair station values, recovered elevation source method, source conflicts, repair paths, and non-observable gaps. | 11615 | `9b42df657555b11388d52a02f045e438c1135ca19ac2ef45c60fd68e9db74b6a` |
| `open-elevation-selected-pair-query-2026-06-12.json` | Retained Open-Elevation query response that reproduces selected-pair legacy elevation cache values. | 2425 | `b21930f25a3da975fd16ac74a2b650bb9c6f31d230c92a2f9cde70c5226217e2` |
| `copernicus-dem-selected-pair-sample-2026-06-12.json` | Retained Copernicus GLO-30 selected-pair DEM comparison sample with tile/cell/datum traceability. | 6159 | `43a0dc022f2dd687d3812a3689b8f2c036284acf2cad1b8929c86b7bf8a8f349` |
| `rain-source-repair-candidates-2026-06-12.json` | Retained local rain calibration repair-source candidates. | 3843 | `02d4898bc2d9cd385a0e9d8564f4471bc7de533648416bf498b2636b121835ad` |
| `evidence-manifest.json` | Delivery-local structured manifest for this retained package. | 3417 | `eb85e10852923feb14baea124f7f948aac059d51c0280c823a6c9f74af7fcec9` |

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
  for the selected-pair Copernicus GLO-30 comparison cells. These values are
  not adopted into runtime station elevation values.
- [`rain-source-repair-candidates-2026-06-12.json`](rain-source-repair-candidates-2026-06-12.json)
  for candidate public sources that can repair local rain calibration later.
- [`../3gpp-itu-references/README.md`](../3gpp-itu-references/README.md) for
  retained 3GPP / ITU-R PDF citations and checksums.
- `public/fixtures/satellites-network/manifest.json` for TLE source manifest
  metadata.
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
- the selected-pair Copernicus DEM comparison cells and source boundaries;
- the candidate rain-calibration source paths;
- the row-level CSV export used for slide tables.

This package cannot prove:

- packet-test latency, jitter, throughput, or loss;
- native RF handover or active serving route migration;
- operator-private station or network validation;
- station RF hardware truth;
- runtime-adopted DEM elevation or terrain horizon data;
- sampled local rain calibration time series;
- external acceptance thresholds or final written acceptance.
