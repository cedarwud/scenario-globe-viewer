# M8A-V4.11 Slice 1 Glance-Rank Surface Handoff

Date: 2026-05-02

## Scope

Slice 1 continued the V4.10 product-fix line by replacing the large scene-near narrative with a first-glance real-data chip layer. It did not reopen route selection, endpoint pair, required precision, actor set, V4.6D model identity, R2 read-only status, or source-boundary rules.

## Changed Files

- `package.json`
- `src/runtime/m8a-v4-ground-station-handover-scene-controller.ts`
- `src/styles.css`
- `tests/smoke/verify-m8a-v4.11-slice1-glance-rank-surface-runtime.mjs`
- `docs/sdd/m8a-v4.11-slice1-glance-rank-surface-handoff.md`

Generated validation output:

- `output/m8a-v4.11-slice1/capture-manifest.json`
- `output/m8a-v4.11-slice1/v4.11-slice1-default-1440x900.metadata.json`
- `output/m8a-v4.11-slice1/v4.11-slice1-default-1280x720.metadata.json`
- `output/m8a-v4.11-slice1/v4.11-slice1-default-390x844.metadata.json`

## Implemented Surface

- Scene annotation is now a scene-anchored micro-cue with the Slice 0 storyboard copy:
  - W1: `focus · LEO`
  - W2: `pressure · LEO`
  - W3: `hold · MEO`
  - W4: `re-entry · LEO`
  - W5: `guard · GEO`
- Default W1 scene-annotation measured `96 x 24` at 1440x900, `96 x 24` at 1280x720, and `92.046875 x 24` at 390x844.
- All 13 satellite actors expose an orbit-class chip (`LEO`, `MEO`, or `GEO`).
- Both ground stations expose:
  - `operator-family precision`
  - `LEO ✓ · MEO ✓ · GEO ✓` with all three tokens marked `strong`
- Corner provenance badge is present:
  - `TLE: CelesTrak NORAD GP · fetched 2026-04-26 · 13 actors`
- Existing sequence rail, control strip, simulated timeline, Details button, and Truth button remain present. Details and Truth default-closed behavior is unchanged.

## Screenshots

- `output/m8a-v4.11-slice1/v4.11-slice1-default-1440x900.png`
- `output/m8a-v4.11-slice1/v4.11-slice1-default-1280x720.png`
- `output/m8a-v4.11-slice1/v4.11-slice1-default-390x844.png`

The 1440x900 default load shows more than four distinct real-data chips without hover or click: provenance, satellite orbit chips, ground precision chips, and ground orbit-evidence triplets.

## Smoke Results

Passed:

- `npx tsc --noEmit`
- `node --check tests/smoke/verify-m8a-v4.11-slice1-glance-rank-surface-runtime.mjs`
- `npm run test:m8a-v4.11:slice1`

`npm run test:m8a-v4.11:slice1` includes:

- production build
- V4.3 raw ITRI side-read scan
- V4.6B runtime source-boundary scan
- V4.11 Slice 1 runtime smoke with 1440x900, 1280x720, and 390x844 captures

V4.8 / V4.9 / V4.10 invariant coverage is green through the Slice 1 runtime smoke and preserved scans:

- route remains `/?scenePreset=regional&m8aV4GroundStationScene=1`
- endpoint pair remains `tw-cht-to-sg-speedcast-accepted`
- required precision remains `operator-family precision`
- actor count remains 13 with counts `LEO=6`, `MEO=5`, `GEO=2`
- V4.6D model id/truth remains unchanged
- R2 remains read-only / non-selector evidence
- source boundary remains repo-owned projection only, with no raw ITRI side-read and no live external source-read
- Details and Truth default-closed behavior remains unchanged
- sequence rail and control strip remain visible

Existing V4.8/V4.9/V4.10 full product smoke assertions were not rewritten for Slice 1. Slice 1 closes only the invariant subset plus the new negative smoke because the old full-product scene-narrative assertions intentionally describe the pre-Slice-1 large annotation.

## Slice 1 Negative Smoke

Passed in `tests/smoke/verify-m8a-v4.11-slice1-glance-rank-surface-runtime.mjs`:

- scene-annotation height <= 24px and width <= 180px in default views
- scene-annotation text is the Slice 0 storyboard micro-cue, not the old narrative block
- orbit-class chip exists for all 13 actors
- both ground stations have precision chip plus strong `LEO/MEO/GEO` triplet
- corner provenance badge exists in default view
- at least four distinct real-data chip types are visible in default 1440x900
- no Slice 2+ scope leak selectors/text are present for hover popover, inspector concurrency, transition toast, scene cue, Sources role, or R2 listing
- forbidden measured latency / jitter / throughput / continuity claims are absent
- raw ITRI package and live external source resources are absent

## Reviewer Status

`reviewer-pending`

No external reviewer was available during this implementation turn. Per Slice 1 closeout rule, this handoff can be returned to total control to decide whether to seal the implementation portion before reviewer recruitment finishes.

## No Scope Leak Confirmation

Confirmed absent:

- hover popover
- inspector concurrency
- transition toast
- scene cue expansion beyond the micro-cue
- Sources role
- R2 listing
- measured latency / jitter / throughput / continuity wording
- raw ITRI side-read

## Unchanged Contract Confirmation

Confirmed unchanged:

- route
- endpoint pair
- precision string
- 13-actor set
- V4.6D model id and truth boundary
- R2 read-only / non-selector status
- repo-owned projection source boundary
