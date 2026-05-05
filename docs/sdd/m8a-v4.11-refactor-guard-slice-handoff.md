# M8A-V4.11 Refactor Guard Slice Handoff

Date: 2026-05-02

## Scope

This slice is a refactor-only follow-up to M8A-V4.11 Slice 1. It extracts clear Slice 1 ownership boundaries without changing product behavior, copy, route, endpoint pair, precision, actor set, V4.6D model identity, R2 read-only status, Details / Truth behavior, or source-boundary rules.

## Refactor Boundaries

Runtime:

- Added `src/runtime/m8a-v411-glance-rank-surface.ts`.
- Moved V4.11 micro-cue copy, orbit-class chip rendering, ground-station precision/triplet chips, and provenance badge DOM synchronization into that module.
- Kept Cesium projection, scene state, route, endpoint, and replay orchestration in `src/runtime/m8a-v4-ground-station-handover-scene-controller.ts`.

Styles:

- Added `src/styles/m8a-v411-glance-rank.css`.
- Moved only V4.11 glance-rank chip/provenance selectors and their mobile overrides.
- Kept all existing sizes, colors, positions, and media behavior unchanged.

Smoke harness:

- Added `tests/smoke/helpers/m8a-v4-browser-capture-harness.mjs`.
- Moved reusable static-server, headless-browser, viewport, screenshot, JSON artifact, and globe-settle helpers out of the Slice 1 smoke.
- Kept Slice 1-specific route readiness, DOM inspection, invariant checks, and negative assertions in `tests/smoke/verify-m8a-v4.11-slice1-glance-rank-surface-runtime.mjs`.

## Line Count Delta

Before this guard slice:

- `src/runtime/m8a-v4-ground-station-handover-scene-controller.ts`: 6091 lines
- `src/styles.css`: 3266 lines
- `tests/smoke/verify-m8a-v4.11-slice1-glance-rank-surface-runtime.mjs`: 731 lines

After this guard slice:

- `src/runtime/m8a-v4-ground-station-handover-scene-controller.ts`: 5883 lines
- `src/runtime/m8a-v411-glance-rank-surface.ts`: 300 lines
- `src/styles.css`: 3121 lines
- `src/styles/m8a-v411-glance-rank.css`: 148 lines
- `tests/smoke/verify-m8a-v4.11-slice1-glance-rank-surface-runtime.mjs`: 644 lines
- `tests/smoke/helpers/m8a-v4-browser-capture-harness.mjs`: 127 lines

## Validation

Passed:

- `npx tsc --noEmit`
- `node --check tests/smoke/helpers/m8a-v4-browser-capture-harness.mjs`
- `node --check tests/smoke/verify-m8a-v4.11-slice1-glance-rank-surface-runtime.mjs`
- `git diff --check` on refactor-touched files
- `npm run test:m8a-v4.11:slice1`

The Slice 1 smoke re-generated:

- `output/m8a-v4.11-slice1/v4.11-slice1-default-1440x900.png`
- `output/m8a-v4.11-slice1/v4.11-slice1-default-1280x720.png`
- `output/m8a-v4.11-slice1/v4.11-slice1-default-390x844.png`

Measured annotation rectangles remained within Slice 1 budget:

- 1440x900: `96 x 24`
- 1280x720: `96 x 24`
- 390x844: `92.046875 x 24`

## No Behavior Change Confirmation

Confirmed unchanged by smoke:

- route: `/?scenePreset=regional&m8aV4GroundStationScene=1`
- endpoint pair
- required precision
- 13 actor set and LEO/MEO/GEO counts
- V4.6D model id and truth boundary
- R2 read-only / non-selector status
- repo-owned projection source boundary
- Details and Truth default-closed behavior
- sequence rail and control strip visibility

Confirmed absent:

- hover popover
- inspector concurrency
- transition toast
- scene-cue expansion beyond the Slice 1 micro-cue
- Sources role
- R2 listing
- measured latency / jitter / throughput / continuity wording
- raw ITRI side-read

## Remaining Refactor Candidates

The main controller is still large after the first extraction. Good next refactor-only candidates are:

- V4.10 sequence rail rendering and runtime metadata
- V4.10 boundary affordance / Truth surface rendering
- shared V4.8/V4.9/V4.10 smoke DOM inspection helpers

Those should remain separate refactor-only slices with the same zero behavior change acceptance criteria.
