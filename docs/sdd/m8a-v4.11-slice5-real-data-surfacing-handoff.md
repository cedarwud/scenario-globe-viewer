# M8A-V4.11 Slice 5 Real-Data Surfacing Handoff

Date: 2026-05-03
Status: implementation-accepted, reviewer-pending

## Scope

Slice 5 adds the final V4.11 inspector role, `Sources`, without changing the
route, endpoint pair, precision, actor set, V4.6D model, or R2 runtime status.

Implemented behavior:

- `Sources` role coexists with `State Evidence` and `Truth Boundary` under the
  Slice 3 concurrency model.
- Corner provenance badge opens `Sources`.
- Ground-station orbit-evidence chips open `Sources` filtered to the clicked
  orbit class.
- `Sources` shows repo-owned source URLs, fetched-at UTC, all 13 per-actor TLE
  record names, and the five R2 candidate endpoints as blocked/read-only.
- R2 remains a read-only catalog listing only. No selector, endpoint pair, actor
  set, or route behavior was added.

## Changed Files

- `package.json`
- `src/runtime/m8a-v4-ground-station-handover-scene-controller.ts`
- `src/runtime/m8a-v411-glance-rank-surface.ts`
- `src/runtime/m8a-v411-hover-popover.ts`
- `src/runtime/m8a-v411-sources-role.ts`
- `src/styles/m8a-v411-glance-rank.css`
- `src/styles/m8a-v411-inspector-concurrency.css`
- `tests/smoke/verify-m8a-v4.11-slice1-glance-rank-surface-runtime.mjs`
- `tests/smoke/verify-m8a-v4.11-slice2-hover-popover-runtime.mjs`
- `tests/smoke/verify-m8a-v4.11-slice3-inspector-concurrency-runtime.mjs`
- `tests/smoke/verify-m8a-v4.11-slice4-transition-toast-runtime.mjs`
- `tests/smoke/verify-m8a-v4.11-slice5-real-data-surfacing-runtime.mjs`
- `tests/smoke/verify-m8a-v4.8-handover-demonstration-ui-ia-runtime.mjs`
- `docs/sdd/m8a-v4.11-slice5-real-data-surfacing-handoff.md`

## Captures

- `output/m8a-v4.11-slice5/v4.11-sources-default-1440x900.png`
- `output/m8a-v4.11-slice5/v4.11-sources-leo-evidence-1440x900.png`
- `output/m8a-v4.11-slice5/v4.11-sources-concurrent-three-roles-1440x900.png`
- Manifest: `output/m8a-v4.11-slice5/capture-manifest.json`

## Slice 5 Negative Smoke

Command:

```bash
npm run test:m8a-v4.11:slice5
```

Result: passed.

Covered checks:

- Sources default closed.
- Corner provenance badge click opens Sources.
- Orbit-evidence chip click opens Sources with the correct LEO filter.
- Sources role can coexist with State Evidence and Truth Boundary.
- R2 candidate listing is read-only and has no button, select, input, or action.
- Source URLs are from repo-owned projection data.
- No raw customer side-read or live external source read.
- All 13 TLE record names appear.
- All five R2 candidate endpoints appear and are marked blocked/read-only.
- Inspector size budget remains within 320px by `calc(100vh - 9.5rem)`.
- Sources copy contains no measured-metric assertions.

## Invariant Smoke Results

All final commands passed:

```bash
npm run test:m8a-v4.11:slice5
npm run test:m8a-v4.11:slice4
npm run test:m8a-v4.11:slice3
npm run test:m8a-v4.11:slice2
npm run test:m8a-v4.11:slice1
npm run test:m8a-v4.10:slice5
npm run test:m8a-v4.10:slice4
npm run test:m8a-v4.10:slice3
npm run test:m8a-v4.10:slice2
npm run test:m8a-v4.10:slice1
npm run test:m8a-v4.9
npm run test:m8a-v4.8
```

Build emitted the existing large-chunk warning and the existing protobuf
direct-eval warning only.

## Smoke Softening Disclosure

- V4.11 Slice 1, Slice 2, and Slice 4 future-scope checks were narrowed so the
  now-approved hidden Sources role and Sources click affordances are not treated
  as leaks. The checks still reject visible R2 listing exposure outside Slice 5.
- V4.11 Slice 3 role expectations were updated to include the new `Sources`
  role while preserving default-closed and same-sheet concurrency assertions.
- V4.8 control classification was softened to exclude
  `data-m8a-v47-action="open-sources"` provenance/source affordances from the
  older "product control" requirement. V4.8 still checks visible text info
  classes, source-boundary scans, route/pair/precision, actor counts, and
  non-claim language.

## Reviewer Interim

Reviewer status: reviewer-pending.

## No Scope Leak Confirmation

- No endpoint selector was added.
- No new endpoint pair was added.
- No new source data was added.
- No live external source read was added.
- No raw customer side-read was added.
- R2 remains read-only and non-promotable to runtime.
- Measured-metric text does not enter the Sources role.

## Unchanged Contract Confirmation

- Route remains unchanged: `?scenePreset=regional&m8aV4GroundStationScene=1`.
- Endpoint pair remains unchanged.
- Precision remains operator-family only.
- Actor set remains unchanged: 13 display-context actors, LEO 6 / MEO 5 / GEO 2.
- V4.6D handover model remains unchanged.
- R2 remains unchanged as read-only catalog evidence.
- Slice 1 surface behavior, dimensions, and visible text remain unchanged.
- Slice 2 surface behavior, dimensions, and visible text remain unchanged.
- Slice 3 surface behavior, dimensions, and visible text remain unchanged.
- Slice 4 surface behavior, dimensions, and visible text remain unchanged.
