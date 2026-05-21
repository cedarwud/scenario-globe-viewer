# Copernicus DEM Access And License Acceptance Template

**TEMPLATE - not evidence.**

This file is a blank handoff template for a future operator. It does not record
Copernicus access, does not record license acceptance, and does not authorize
numeric TH3 replacement. Numeric TH3 replacement remains blocked until this
template is filled with real facts, reviewed, and signed off by the controller
and reviewer listed below.

Do not enter passwords, API keys, tokens, session cookies, private keys, or
other secrets in this document.

## Gate Status

- Gate: TH3 69-row DEM sample replacement.
- Current status: blocked.
- Evidence status: template only, not evidence.
- Replacement authorization: none.
- Review required before use: yes.

## Access Record

- Copernicus account or role used:
- Access path used:
- Access path type:
  - CDSE OData
  - CDSE S3
  - Sentinel Hub Process API
  - openEO
  - other:
- Authentication method category, without secrets:
- Account owner or accountable team:
- Operator who performed access:
- Access started at UTC:
- Access completed at UTC:

## License Acceptance Record

- License acceptance happened: no, until filled and reviewed.
- License acceptance date/time UTC:
- Accepting account or role:
- Accepting operator:
- Acceptance workflow or page:
- License URL:
- License version or source document:
- Local copy or retained evidence path outside repo:
- Notes on any access restrictions:

## Official Source Links

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

## Required Notice Capture

Fill these from the accepted license and retained source document. Do not infer
or summarize without reviewer approval.

- Required attribution notice:
- Required adapted-data notice:
- Required liability notice:
- Required non-endorsement notice:
- Any additional redistribution notice:
- Citation text to carry into generated rows:
- Non-claim text to carry into generated rows:

## Dataset And Artifact Record

- Dataset access path actually used:
  - CDSE OData
  - CDSE S3
  - Sentinel Hub Process API
  - openEO
  - other:
- Dataset identifier:
- Dataset version or release:
- Dataset resolution:
- Vertical datum:
- CRS/grid reference:
- Raw DEM storage path outside repo:
- Raw DEM manifest path outside repo:
- Sampling workspace path outside repo:
- Generated 69-row input artifact path:
- Generated artifact checksum:
- Generation command or notebook path:
- Date/time generated UTC:

## Per-Row Traceability Confirmation

Before review, confirm the generated 69-row input artifact has one complete row
per station and each row records:

- station id;
- source access time;
- dataset id, version, resolution, vertical datum, license id, and license URL;
- tile id;
- deterministic row/column cell id;
- sampled DEM cell center latitude/longitude;
- integer elevation in meters rounded from source meters;
- sampling method;
- citation;
- non-claim;
- provenance status.

## Review And Signoff

- Operator name/role:
- Operator completion date/time UTC:
- Controller reviewer:
- Controller review date/time UTC:
- Controller decision:
  - accepted
  - rejected
  - needs changes
- Independent reviewer:
- Independent review date/time UTC:
- Independent reviewer decision:
  - accepted
  - rejected
  - needs changes
- Notes:

## Explicit Non-Claims

- This template is not proof of access.
- This template is not proof of license acceptance.
- This template is not proof of DEM sampling.
- This template does not contain station elevation values.
- This template does not permit committing raw DEM artifacts.
