# M8A-V4.10 Slice 2 Handover Sequence Rail Handoff

Date: 2026-05-01

Route:

- `/?scenePreset=regional&m8aV4GroundStationScene=1`

Related SDD:

- [m8a-v4.10-product-experience-redesign-plan.md](./m8a-v4.10-product-experience-redesign-plan.md)

Related prior artifacts:

- [m8a-v4.10-slice0-baseline-target-lock.md](./m8a-v4.10-slice0-baseline-target-lock.md)
- [m8a-v4.10-slice1-first-viewport-composition-handoff.md](./m8a-v4.10-slice1-first-viewport-composition-handoff.md)

## Scope Completed

Slice 2 added the default-viewport handover sequence rail. The rail is derived
from the accepted `V4.6D` deterministic window order and does not change route,
endpoint, precision, actor, source, `R2`, or model-truth contracts.

The default view now exposes:

- active state summary
- next state summary
- five ordered `V4.6D` state marks
- active mark
- next mark
- transition from/to pulse when the existing transition event fires

Slice 1 scene narrative and secondary replay controls remain in place. Details
still stays closed by default and is not required for first-read understanding.

## Correction - Narrow Rail Native UI Overlap

Planning/control did not accept the first Slice 2 closeout because the
`390x844` screenshot showed the sequence rail visually colliding with Cesium's
default-token notice, attribution, and bottom timeline surfaces.

This correction keeps the five-state sequence rail, active mark, next mark, and
transition update behavior. It changes only the narrow-viewport rail placement
and compactness so the rail sits between the Slice 1 scene narrative and Cesium
native bottom surfaces.

The Slice 2 smoke now samples Cesium native surface rects for:

- default-token notice
- attribution link
- credit container
- bottom native surface
- timeline container

On narrow viewport it asserts that the sequence rail does not overlap those
native surfaces and keeps at least an `8px` visual clearance when their
horizontal spans intersect.

Correction evidence from the regenerated `390x844` metadata:

- scene narrative bottom: `580.4375`
- sequence rail rect: top `598.71875`, bottom `680`
- Cesium bottom native surface top: `696`
- Cesium default-token notice top: `708`
- Cesium timeline top: `817`

## Original Slice 2 Changed Files

- `src/runtime/m8a-v4-ground-station-handover-scene-controller.ts`
- `src/styles.css`
- `package.json`
- `tests/smoke/verify-m8a-v4.10-slice1-first-viewport-composition-runtime.mjs`
- `tests/smoke/verify-m8a-v4.10-slice2-handover-sequence-rail-runtime.mjs`
- `docs/sdd/m8a-v4.10-slice2-handover-sequence-rail-handoff.md`

## Correction Changed Files

- `src/styles.css`
- `tests/smoke/verify-m8a-v4.10-slice2-handover-sequence-rail-runtime.mjs`
- `docs/sdd/m8a-v4.10-slice2-handover-sequence-rail-handoff.md`
- `output/m8a-v4.10-slice2/*`

The runtime controller did not require a correction change.

## Screenshot Evidence

Evidence root:

- `output/m8a-v4.10-slice2/capture-manifest.json`

Screenshots:

- `output/m8a-v4.10-slice2/v4.10-slice2-default-1440x900.png`
- `output/m8a-v4.10-slice2/v4.10-slice2-default-1280x720.png`
- `output/m8a-v4.10-slice2/v4.10-slice2-default-390x844.png`
- `output/m8a-v4.10-slice2/v4.10-slice2-transition-leo-aging-pressure-1440x900.png`

Metadata:

- `output/m8a-v4.10-slice2/v4.10-slice2-default-1440x900.metadata.json`
- `output/m8a-v4.10-slice2/v4.10-slice2-default-1280x720.metadata.json`
- `output/m8a-v4.10-slice2/v4.10-slice2-default-390x844.metadata.json`
- `output/m8a-v4.10-slice2/v4.10-slice2-transition-leo-aging-pressure-1440x900.metadata.json`

The regenerated `390x844` screenshot keeps the active summary, next summary,
and five compact marks readable while leaving the Cesium default-token notice,
attribution, and timeline visually separate below the rail.

## Sequence Coverage

The Slice 2 smoke verified this accepted `V4.6D` order:

1. `leo-acquisition-context` -> next `leo-aging-pressure`
2. `leo-aging-pressure` -> next `meo-continuity-hold`
3. `meo-continuity-hold` -> next `leo-reentry-candidate`
4. `leo-reentry-candidate` -> next `geo-continuity-guard`
5. `geo-continuity-guard` -> restart/next `leo-acquisition-context`

The transition capture verifies:

- active window: `leo-aging-pressure`
- next window: `meo-continuity-hold`
- transition from: `leo-acquisition-context`
- transition to: `leo-aging-pressure`

## Tests Run

- `node --check tests/smoke/verify-m8a-v4.10-slice1-first-viewport-composition-runtime.mjs` - passed.
- `node --check tests/smoke/verify-m8a-v4.10-slice2-handover-sequence-rail-runtime.mjs` - passed.
- `npm run test:m8a-v4.10:slice2` - passed.
- `npm run test:m8a-v4.10:slice1` - passed.

Build warnings observed during Vite builds are the existing large-chunk and
`protobufjs` direct `eval` warnings.

## Forbidden Scope Confirmation

Not implemented in Slice 2:

- Slice 3 boundary/Truth separation
- Slice 4 inspector redesign
- Slice 5 validation matrix
- endpoint expansion or selector work
- route expansion
- precision expansion
- actor-set expansion
- source-data expansion
- `R2` runtime promotion
- `V4.6D` model-truth changes
- active satellite, active gateway, active path, measured metric, native RF, or
  operator-log claims

## Runtime Cleanup

The correction Slice 2 smoke manifest records:

- static server PID `95326` started and stop requested
- headless Chrome PID `95331` started and stop requested
- manifest status: `cleanup-complete`

The Slice 1 regression smoke manifest records:

- static server PID `96521` started and stop requested
- headless Chrome PID `96526` started and stop requested
- manifest status: `cleanup-complete`

A pre-fix run of the updated Slice 2 smoke failed on the new native-surface
assertion and was followed by process inspection; no task-owned static server
or headless Chrome remained. No Vite dev server was intentionally started for
this correction.
