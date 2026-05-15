# M8A-V4.11 Slice 2 Hover Popover Handoff

Date: 2026-05-02

## Scope

Slice 2 adds hover/focus popovers to the three approved target classes only:

- satellite glyph / orbit-class chip targets
- ground-station marker / precision evidence targets
- sequence-rail mark targets

The implementation does not reopen route selection, endpoint pair, required precision, actor set, V4.6D model identity, R2 read-only status, Details/Truth mutual exclusion, or the approved Slice 1 glance-rank surface geometry/text.

## Changed Files

- `package.json`
- `src/runtime/m8a-v4-ground-station-handover-scene-controller.ts`
- `src/runtime/m8a-v411-hover-popover.ts`
- `src/styles.css`
- `src/styles/m8a-v411-hover-popover.css`
- `tests/smoke/verify-m8a-v4.11-slice1-glance-rank-surface-runtime.mjs`
- `tests/smoke/verify-m8a-v4.11-slice2-hover-popover-runtime.mjs`
- `tests/smoke/verify-m8a-v4.8-handover-demonstration-ui-ia-runtime.mjs`
- `tests/smoke/verify-m8a-v4.9-product-comprehension-runtime.mjs`
- `tests/smoke/verify-m8a-v4.10-slice1-first-viewport-composition-runtime.mjs`
- `tests/smoke/verify-m8a-v4.10-slice2-handover-sequence-rail-runtime.mjs`
- `tests/smoke/verify-m8a-v4.10-slice3-boundary-affordance-separation-runtime.mjs`
- `tests/smoke/verify-m8a-v4.10-slice4-inspector-evidence-redesign-runtime.mjs`
- `tests/smoke/verify-m8a-v4.10-slice5-validation-matrix-runtime.mjs`
- `docs/sdd/m8a-v4.11-slice2-hover-popover-handoff.md`

Generated validation output:

- `output/m8a-v4.11-slice2/capture-manifest.json`
- `output/m8a-v4.11-slice2/v4.11-w1-hover-leo-1440x900.metadata.json`
- `output/m8a-v4.11-slice2/v4.11-w3-hover-meo-1440x900.metadata.json`
- `output/m8a-v4.11-slice2/v4.11-w4-hover-leo-1440x900.metadata.json`
- `output/m8a-v4.11-slice2/v4.11-w5-hover-geo-1440x900.metadata.json`

## Implemented Behavior

- Hover/focus popovers are installed through `m8a-v4.11-hover-popover-slice2-runtime.v1`.
- Hover delay is fixed at 150 ms. The smoke verifies the popover is not visible at 120 ms and is visible within the 200 ms negative budget.
- Popover budget is fixed at max `240 x 140`; captured examples measured `240 x 93.40625`, `240 x 78.46875`, and `240 x 63.53125`.
- Satellite popovers use the Slice 0 storyboard 5-line form: operator family, orbit/role, TLE source, context class, and non-claim line.
- Ground-station popovers use the Slice 0 storyboard 4-line form: operator, precision, LEO/MEO/GEO evidence triplet, and source count.
- Sequence-rail popovers use the Slice 0 storyboard 3-line form: window label, simulated trigger, and bounded context line.
- `Tab` focus and `:focus-visible` schedule the same popover path as pointer hover.
- `Escape` dismisses the popover.
- Cursor leave enters the fade path and then removes the popover from the visible state.
- Click, Enter, and Space pin the target into the existing Details inspector as `State Evidence`. The Truth boundary is closed when Details opens, preserving mutual exclusion.
- `prefers-reduced-motion: reduce` is respected by disabling the fade transition.

## Screenshots

- `output/m8a-v4.11-slice2/v4.11-w1-hover-leo-1440x900.png`
- `output/m8a-v4.11-slice2/v4.11-w3-hover-meo-1440x900.png`
- `output/m8a-v4.11-slice2/v4.11-w4-hover-leo-1440x900.png`
- `output/m8a-v4.11-slice2/v4.11-w5-hover-geo-1440x900.png`

## Smoke Results

Passed:

- `npm run test:m8a-v4.11:slice2`
- `npm run test:m8a-v4.11:slice1`
- `npm run test:m8a-v4.10:slice1`
- `npm run test:m8a-v4.10:slice2`
- `npm run test:m8a-v4.10:slice3`
- `npm run test:m8a-v4.10:slice4`
- `npm run test:m8a-v4.10:slice5`
- `npm run test:m8a-v4.9`
- `npm run test:m8a-v4.8`

`npm run test:m8a-v4.11:slice2` covers:

- production build
- V4.3 raw customer side-read scan
- V4.6B runtime source-boundary scan
- Slice 2 hover timing, size, target coverage, keyboard focus, fade/dismiss, click-to-pin, and screenshot capture

Slice 2 negative smoke passed:

- hover visible within 200 ms and not visible before the 150 ms schedule
- popover never exceeds `240 x 140`
- satellite, ground-station, and sequence-rail targets all expose popovers
- keyboard focus triggers a popover and `Escape` dismisses it
- cursor leave fades and clears the popover
- click-to-pin opens Details/State Evidence without concurrent Truth Boundary visibility
- no inspector concurrency, transition toast, scene cue, Sources role, or R2 listing appears

V4.8/V4.9/V4.10 invariant tests were updated only to accept the approved Slice 1 micro-cue and fixed glance-rank surface as the current first-viewport contract. They still enforce route, endpoint pair, precision, actor counts, source boundary, and V4.10 Details/Truth behavior.

## Reviewer Status

`reviewer-pending`

Per Lock-in I, interim reviewer can batch Slice 2 through Slice 5. No reviewer result is required for this slice closeout beyond marking the interim state pending.

## No Scope Leak Confirmation

Confirmed absent:

- inspector concurrency
- new transition toast
- new scene cue
- Sources role
- R2 runtime listing/selector
- active serving satellite, active gateway/path, measured metric, native RF, or operator-log truth claims

## Unchanged Contract Confirmation

Confirmed unchanged:

- route remains `/?scenePreset=regional&m8aV4GroundStationScene=1`
- endpoint pair remains `taiwan-cht-speedcast-singapore-operator-family-2026-04-26`
- precision remains `operator-family-only` / `operator-family precision`
- actor set remains 13 actors with `LEO=6`, `MEO=5`, `GEO=2`
- V4.6D model id remains `m8a-v4.6d-simulation-handover-model.v1`
- V4.6D truth boundary remains simulation output, not operator log
- R2 remains read-only / non-selector evidence
- Slice 1 micro-cue, orbit-class chips, precision chips, triplets, and corner provenance badge keep their approved text, dimensions, and positions
