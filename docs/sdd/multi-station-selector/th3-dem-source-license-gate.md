# Multi-Station Selector - TH3 DEM Source/License Gate

Status: gate closed, docs-only.
Decision date: 2026-05-21.

## Decision

TH3 remains blocked for numeric replacement. The repo may document the source
order and future sample-generation plan, but must not generate, commit, or
stage new 69-row elevation values in this slice.

The gate is closed until:

- Copernicus access and license acceptance are recorded.
- Every generated row has complete source, sample, license, citation, and
  non-claim provenance.
- No raw DEM tiles, source downloads, or temporary sampling artifacts appear in
  git status.
- Walkthrough visibility/link/handover deltas are reviewed against the current
  D6 baseline.

## Source Order

1. Primary: Copernicus DEM GLO-30 DGED / `COPERNICUS_30`, with GLO-90 fallback
   where 30 m public tiles are unavailable.
2. Fallback: Copernicus DEM GLO-90 DGED.
3. Optional US-only cross-check or override: USGS 3DEP, but only after the raw
   tile versus EPQS decision and datum policy are settled.
4. Audit/cross-check only: NASA SRTMGL1 V003. Do not use it as the primary
   source because its official spatial extent is 60 N to 56 S, which misses
   high-latitude and Antarctic stations.

First replacement recommendation: use Copernicus-only for all 69 rows. This
avoids mixed datum/source semantics in the first cache replacement. Treat USGS
3DEP as a later cross-check or reviewed override, not as part of the first
replacement set.

## Official Facts

Copernicus:

- The Copernicus DEM collection page describes the product as a DSM, with
  GLO-30 and GLO-90 worldwide coverage at 30 m and 90 m respectively:
  https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM
- Sentinel Hub DEM documentation is the API-side reference for
  `COPERNICUS_30` and related DEM identifiers:
  https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Data/DEM.html
- The current Copernicus contributing mission license bundle is the controlling
  license evidence for GLO-30/GLO-90 access, attribution, adapted-product,
  liability, and non-endorsement notices:
  https://dataspace.copernicus.eu/sites/default/files/media/files/2025-06/copernicus_contributing_mission_data_access_v2_cop_dem_licenses.pdf
- The Copernicus DEM product handbook is the technical reference for product
  packaging, format, grid, coordinate reference system, and vertical datum:
  https://dataspace.copernicus.eu/sites/default/files/media/files/2024-06/geo1988-copernicusdem-spe-002_producthandbook_i5.0.pdf

NASA SRTM:

- NASA Earthdata identifies SRTMGL1 V003 as global 1 arc-second / about 30 m
  SRTM data with official spatial extent 60 N to 56 S:
  https://www.earthdata.nasa.gov/data/catalog/lpcloud-srtmgl1-003
- NASA Earthdata use guidance says NASA-led mission data are generally open
  but still require source acknowledgment, citation, non-endorsement, and
  attention to any marked use restrictions:
  https://www.earthdata.nasa.gov/engage/open-data-services-software-policies/data-use-guidance

USGS 3DEP:

- USGS says EPQS returns interpolated elevations from the 3DEP dynamic
  elevation service and warns that EPQS values are not official ground-survey
  measurements:
  https://www.usgs.gov/faqs/how-accurate-are-elevations-generated-elevation-point-query-service-national-map
- USGS National Map data delivery is the raw-data entry point for GIS/DEM
  downloads:
  https://www.usgs.gov/the-national-map-data-delivery/gis-data-download

## License And Redistribution Posture

Derived per-station cache rows look acceptable for Copernicus only if the
project records:

- the account/access path used to obtain source tiles;
- license acceptance date and accepting account or role;
- the exact dataset id, version/release, tile or cell reference, and sample
  method for every row;
- required source attribution and adapted-data notices;
- required liability and non-endorsement notices in committed evidence/cache
  metadata.

Do not commit raw Copernicus, NASA, or USGS DEM tiles. Raw downloads and
sampling work products must stay outside the repo.

## 69-Row Input Artifact Plan

Future replacement should generate one reviewed input artifact:

`deliverable/ground-station-elevation/th3/station-elevations-dem-derived-input-YYYY-MM-DD.json`

The file must be a JSON array with exactly 69 objects, one per registry
station. Required fields must match `scripts/refresh-station-elevation.mjs`:

- `stationId`
- `elevationM`
- `sourceAccessedUtc`
- `elevationSourceKind`
- `elevationDatasetId`
- `elevationDatasetVersion`
- `elevationDatasetResolutionM`
- `elevationVerticalDatum`
- `elevationTileId`
- `elevationCellId`
- `elevationSampleLat`
- `elevationSampleLon`
- `elevationSamplingMethod`
- `elevationSampledAtUtc`
- `elevationCacheGeneratedUtc`
- `elevationLicenseId`
- `elevationLicenseUrl`
- `elevationCitation`
- `elevationProvenanceStatus`
- `elevationNonClaim`

For accepted replacement rows:

- `elevationSourceKind` must be `dem-derived`.
- `elevationSamplingMethod` must be `dem-cell-sample`.
- `elevationProvenanceStatus` must be `dem-provenance-complete`.
- dataset version, positive resolution, vertical datum, tile id, cell id,
  sample coordinates, UTC timestamps, license URL, citation, and non-claim text
  must be non-empty where the validator requires them.

Raw DEM tiles and source downloads should live outside the repo, for example:

`/tmp/sgv-th3-dem-work/`

## Future Validation Commands

Run these before any replacement cache is reviewed:

```bash
node scripts/refresh-station-elevation.mjs --input <input-json> --dry-run --output public/fixtures/ground-stations/station-elevations-cache.json
node scripts/verify-station-elevation-input-mode.mjs
npm run build
node scripts/verify-tle-first-data-completeness.mjs --port=<port>
node scripts/verify-g1-bucket-a-coverage.mjs --port=<port>
node scripts/verify-information-density.mjs --port=<port>
node scripts/verify-random-pair-projection-budget.mjs --port=<port>
node scripts/verify-60x-replay-continuity.mjs --port=<port>
git diff --check
```

## Block Conditions

Stop the replacement if any condition is true:

- Copernicus access/license acceptance is not recorded.
- Any row is missing provenance, sample, license, citation, or non-claim
  metadata.
- Raw DEM/source artifacts appear in git status.
- W2 is no longer a zero-window case without explicit approval.
- Walkthrough deltas fall outside tolerance without an explicit reviewed
  baseline update.
- Any R6 hot file is modified.

This document does not authorize fixture, cache, registry, test, raw-data, or
runtime changes. It only closes the TH3 documentation gate and records the
sample-generation plan for a later implementation slice.
