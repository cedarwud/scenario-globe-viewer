# TH3 Copernicus DEM Sampling Runbook

This runbook is for a future operator who has completed Copernicus access and
license acceptance evidence review. It is not evidence, does not include station
elevation values, and does not authorize numeric TH3 replacement by itself.

## Current Blockers

Explorer reports for this handoff recorded these blocker facts:

- No CDSE, Sentinel Hub, or openEO credential indicators were found locally.
- No repo CDSE or Copernicus DEM acquisition/sampling script exists.
- Local DEM tools were absent:
  - `gdalinfo`
  - `gdallocationinfo`
  - `rio`
  - Python `rasterio`
  - Python `osgeo`
  - Node `geotiff`
  - Node `@loaders.gl/geotiff`
  - Node `gdal-async`
  - Node `sharp`

Do not proceed to replacement until the access/license template is filled with
real facts and reviewed.

## Official Links

- CDSE OData API:
  https://documentation.dataspace.copernicus.eu/APIs/OData.html
- CDSE S3 API:
  https://documentation.dataspace.copernicus.eu/APIs/S3.html
- Sentinel Hub DEM Process API examples:
  https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Process/Examples/DEM.html
- Sentinel Hub DEM data reference:
  https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Data/DEM.html
- Copernicus contributing mission DEM license bundle:
  https://dataspace.copernicus.eu/sites/default/files/media/files/2025-06/copernicus_contributing_mission_data_access_v2_cop_dem_licenses.pdf

## Recommended First Replacement Method

Use one source family for the first replacement:

- Use Copernicus-only for all 69 rows.
- Use source `COPERNICUS_30` / GLO-30 DGED.
- Use GLO-90 fallback only where 30 m public tiles are unavailable.
- Use nearest DEM cell sample, not bilinear interpolation, for the first
  replacement.
- Record `elevationSampleLat` and `elevationSampleLon` as the sampled DEM cell
  center, not necessarily the original station coordinate.
- Record `elevationCellId` with deterministic row/column information.
- Record `elevationM` as an integer rounded from source meters.
- Stop if tile, cell, datum, version, or provenance cannot be recorded.

## Operator Procedure

1. Complete
   `deliverable/ground-station-elevation/th3/copernicus-dem-access-license-acceptance-template.md`
   with real access and license facts.
2. Keep raw DEM tiles, API responses, scratch notebooks, generated temporary
   files, and intermediate manifests outside the repo.
3. For each station, identify the required GLO-30 tile. Use GLO-90 only when a
   public 30 m tile is unavailable, and record the fallback reason in the row
   provenance.
4. Sample the nearest DEM cell. Do not use bilinear interpolation for the first
   replacement.
5. Record a deterministic `elevationCellId` that includes row and column.
6. Record the sampled cell center coordinates in `elevationSampleLat` and
   `elevationSampleLon`.
7. Round source meters to an integer `elevationM`.
8. Generate one 69-row input artifact under:
   `deliverable/ground-station-elevation/th3/station-elevations-dem-derived-input-YYYY-MM-DD.json`
9. Review every row for source, sample, license, citation, and non-claim
   completeness before running validation.

## Required Row Semantics

- `elevationSourceKind`: `dem-derived`
- `elevationSamplingMethod`: `dem-cell-sample`
- `elevationProvenanceStatus`: `dem-provenance-complete`
- `elevationDatasetId`: Copernicus dataset id actually used.
- `elevationDatasetVersion`: release/version actually used.
- `elevationDatasetResolutionM`: 30 for GLO-30 or 90 for GLO-90 fallback.
- `elevationVerticalDatum`: source vertical datum.
- `elevationTileId`: source tile id.
- `elevationCellId`: deterministic tile row/column cell id.
- `elevationLicenseUrl`: accepted license URL.
- `elevationCitation`: reviewed citation text.
- `elevationNonClaim`: reviewed non-claim text.

## Future Validation Commands

Run these commands before any replacement cache is reviewed:

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

## Stop Conditions

Stop immediately if any condition is true:

- Access/license evidence is absent, incomplete, or not reviewed.
- The API or tool path only returns point elevation without tile/cell
  traceability.
- Raw DEM artifacts appear in git status.
- Any row lacks provenance, citation, or non-claim text.
- Any row lacks source, sample, license, datum, tile, or cell traceability.
- W2 is no longer a zero-window case without approval.
- D6 deltas are unreviewed.
- Any R6 file is modified.

## Files That Must Not Change In This Slice

This runbook does not authorize code, fixture, cache, registry, test, or raw
data changes. Future operators must keep generated raw DEM artifacts outside
the repo and should inspect git status before and after sampling.
