# Multi-Station Selector - TH3b Elevation Prep Baseline

Status: prep baseline. No numeric elevation replacement in this slice.
Capture date: 2026-05-21.
Commit baseline: `ef79573`.

Gate note: `th3-dem-source-license-gate.md` records the 2026-05-21 docs-only
source/license decision. It supersedes this baseline's source-link details
without authorizing numeric value replacement.

## Current Fixture State

- Registry rows: 69.
- Elevation cache rows: 69.
- Current provenance labels: all rows are `legacy-service-cache` with
  `legacy-upstream-dem-unknown`.
- Current elevation range: `-2..1538` meters.
- Current negative rows: `viasat-inmarsat-burum:-2`,
  `speedcast-biddinghuizen:-2`.

## Walkthrough D6 Pins

| Walkthrough | Pair | Elevations m | Visibility / link / handover |
| --- | --- | ---: | ---: |
| W1 | Svalbard / Tromso | 0 / 0 | 26 / 2 / 1 |
| W2 | Svalbard / TrollSat | 0 / 0 | 0 / 0 / 0 |
| W3 | Intelsat Fuchsstadt / Atlanta | 337 / 241 | 15 / 3 / 2 |
| W4 | Singtel Bukit Timah / Measat Cyberjaya | 58 / 22 | 117 / 7 / 6 |
| W5 | CHT Yangmingshan / SANSA Hartebeesthoek | 470 / 1538 | 9 / 3 / 2 |

These values are baseline pins only. TH3b-0/1 preserves them.

## Source Verdict

Derived per-station DEM elevations can be committed with row-level provenance,
but the actual value replacement is still blocked.

Recommended source order:

1. Copernicus DEM GLO-30 DGED as the primary global source.
2. Copernicus DEM GLO-90 as the global fallback.
3. USGS 3DEP for United States rows only if the raw-tile versus EPQS decision
   is settled.
4. NASA SRTMGL1 V003 as cross-check or fallback only.

Official source links:

- Copernicus DEM page:
  https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM
- Copernicus CCM documentation:
  https://documentation.dataspace.copernicus.eu/Data/Others/CCM.html
- Copernicus GLO-30 license PDF:
  https://docs.sentinel-hub.com/api/latest/static/files/data/dem/resources/license/License-COPDEM-30.pdf
- NASA SRTMGL1 V003:
  https://www.earthdata.nasa.gov/data/catalog/lpcloud-srtmgl1-003
- NASA open data policy:
  https://www.earthdata.nasa.gov/engage/open-data-services-software-policies
- USGS 3DEP:
  https://www.usgs.gov/3d-elevation-program
- USGS National Map data download:
  https://www.usgs.gov/the-national-map-data-delivery/gis-data-download
- USGS EPQS FAQ:
  https://www.usgs.gov/faqs/how-accurate-are-elevations-generated-elevation-point-query-service-national-map

## Blockers Before Value Replacement

- CDSE credentials and license acceptance must be completed.
- The USGS 3DEP path must choose raw DEM tiles or EPQS-derived samples before
  United States row overrides are generated.
- No raw DEM tiles should be committed unless separately scoped.

## TH3b-2 Contract

- Produce a complete 69-row DEM sample JSON for
  `scripts/refresh-station-elevation.mjs --input <path>`.
- Keep each row keyed by registry `stationId`.
- Use `elevationSourceKind: "dem-derived"`,
  `elevationSamplingMethod: "dem-cell-sample"`, and
  `elevationProvenanceStatus: "dem-provenance-complete"`.
- Include dataset id, version, resolution, datum, tile or cell reference,
  sample coordinates, sampled/cache timestamps, license id, license URL,
  citation, and non-claim text.
- Capture value deltas against the five D6 walkthrough pins before any write.
- Do not bundle raw DEM tiles in the app repo unless a later scope explicitly
  asks for that artifact.

## Prep Hardening Acceptance

- Strict `--input` mode accepts complete DEM-derived rows and still allows
  negative `elevationM` values inside the existing sanity range.
- Strict `--input` mode rejects partial DEM metadata, invalid UTC timestamps,
  invalid sample coordinates, non-positive resolution, legacy markers,
  duplicate rows, orphan rows, and missing station rows.
- Dry-run output includes the full provenance column set so metadata loss is
  visible before any cache replacement slice.
- D6 remains compatible with the current legacy cache until a separately
  scoped DEM-derived 69-row cache replacement lands.
