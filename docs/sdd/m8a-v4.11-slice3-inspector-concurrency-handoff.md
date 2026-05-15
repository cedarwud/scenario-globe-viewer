# M8A-V4.11 Slice 3 Inspector Concurrency Handoff

Date: 2026-05-02

## Scope

Slice 3 merges the Details sheet and Truth boundary surface into one inspector with two concurrent roles:

- `State Evidence`
- `Truth Boundary`

Both roles default closed. Details opens `State Evidence`; Truth opens `Truth Boundary`; opening either role preserves the other role if it is already open. Closing the inspector closes both roles. Transition changes do not auto-open either role. Implementation evidence stays collapsed by default and can only be opened from inside the inspector.

Out of scope and still absent: transition toast, scene cue expansion, Sources role, R2 listing, route/endpoint/precision/actor/model changes, and Slice 1 or Slice 2 surface behavior changes.

## Changed Files

- `package.json`
- `src/runtime/m8a-v4-ground-station-handover-scene-controller.ts`
- `src/runtime/m8a-v411-inspector-concurrency.ts`
- `src/styles.css`
- `src/styles/m8a-v411-inspector-concurrency.css`
- `tests/smoke/verify-m8a-v4.11-slice3-inspector-concurrency-runtime.mjs`
- `tests/smoke/verify-m8a-v4.11-slice1-glance-rank-surface-runtime.mjs`
- `tests/smoke/verify-m8a-v4.11-slice2-hover-popover-runtime.mjs`
- `tests/smoke/verify-m8a-v4.10-slice3-boundary-affordance-separation-runtime.mjs`
- `tests/smoke/verify-m8a-v4.10-slice4-inspector-evidence-redesign-runtime.mjs`
- `tests/smoke/verify-m8a-v4.10-slice5-validation-matrix-runtime.mjs`
- `tests/smoke/verify-m8a-v4.9-product-comprehension-runtime.mjs`
- `tests/smoke/verify-m8a-v4.8-handover-demonstration-ui-ia-runtime.mjs`
- `docs/sdd/m8a-v4.11-slice3-inspector-concurrency-handoff.md`

Generated validation output:

- `output/m8a-v4.11-slice3/capture-manifest.json`
- `output/m8a-v4.11-slice3/v4.11-w1-pinned-1440x900.png`
- `output/m8a-v4.11-slice3/v4.11-w1-pinned-1440x900.metadata.json`

## Implemented Behavior

- Installed runtime contract `m8a-v4.11-inspector-concurrency-slice3-runtime.v1`.
- The inspector exposes `data-m8a-v411-inspector-role="state-evidence"` and `data-m8a-v411-inspector-role="truth-boundary"` inside one sheet.
- The old standalone boundary surface remains mounted only for legacy selectors and is hidden/not the active Truth surface.
- State Evidence copy is resolved from the Slice 0 storyboard W1-W5 text.
- Truth Boundary copy uses the Slice 0 truth lines, with the W5 failover-proof non-claim appended for GEO guard.
- Inspector budget is capped at `320px`, `28vw`, and `calc(100vh - 9.5rem)`.
- The placement helper now rejects viewport-escaping inspector candidates and uses conservative content height when choosing a safe location.

## Screenshots

- `output/m8a-v4.11-slice3/v4.11-w1-pinned-1440x900.png`

The required capture is the W1 pinned concurrency state at 1440x900 with both roles visible. Captured inspector rect: `left=1097`, `top=23`, `width=320`, `height=748`.

## Smoke Results

Passed:

- `npm run test:m8a-v4.11:slice3`
- `npm run test:m8a-v4.11:slice1`
- `npm run test:m8a-v4.11:slice2`
- `npm run test:m8a-v4.10:slice1`
- `npm run test:m8a-v4.10:slice2`
- `npm run test:m8a-v4.10:slice3`
- `npm run test:m8a-v4.10:slice4`
- `npm run test:m8a-v4.10:slice5`
- `npm run test:m8a-v4.9`
- `npm run test:m8a-v4.8`

Each package smoke includes the production build plus the V4.3 raw customer side-read scan and V4.6B runtime source-boundary scan.

Slice 3 negative smoke passed:

- both roles default closed
- Details opens only `State Evidence`
- Truth opens `Truth Boundary` while preserving an already-open `State Evidence`
- one inspector close closes both roles
- transition movement does not auto-open the inspector
- implementation evidence defaults collapsed
- W1 State Evidence copy matches Slice 0 storyboard text
- Truth Boundary forbidden positive claims remain absent
- inspector stays within `<=320px`, `<=28vw`, and `<=calc(100vh - 9.5rem)`
- no transition toast, scene cue, Sources role, or R2 listing appears

Note: `npm run test:m8a-v4.11:slice2` had one transient 200ms hover visibility timing miss, then passed on rerun with no Slice 2 code or smoke change.

## Smoke Softening Disclosure

Lock-in J disclosure for cross-version smoke edits:

- V4.11 Slice 1 smoke: removed `inspectorConcurrency` from the future-scope forbidden list because Slice 3 is now approved. The smoke still forbids transition toast, scene cue expansion, Sources role, R2 listing, and positive operational claims.
- V4.11 Slice 2 smoke: same future-scope update as Slice 1. Hover target coverage, 150ms delay, size budget, keyboard behavior, and click-to-pin assertions remain unchanged.
- V4.10 Slice 3 smoke: Truth-open assertions now accept the shared inspector `Truth Boundary` role instead of requiring the old standalone boundary surface. Details remains closed when only Truth is opened, the old boundary surface must not be visible, default closed checks remain, and forbidden-claim checks remain. The compact copy compatibility accepts the Slice 0 "not an operator handover log" wording without allowing operator-log truth.
- V4.10 Slice 4 smoke: Details-open assertions now accept the `State Evidence` role and Truth-open assertions now accept the shared `Truth Boundary` role. Implementation evidence must remain collapsed by default, and route/source/forbidden-claim/default-closed assertions remain.
- V4.10 Slice 5 smoke: validation-matrix inspector assertions received the same shared-inspector compatibility as Slice 4. Five-state order, default closed states, forbidden claims, and overlay-risk checks remain.
- V4.9 smoke: inspector and Truth affordance checks now accept the shared inspector role model and close the shared sheet when cleaning up. The smoke still checks viewport containment, hidden legacy boundary surface, implementation evidence collapsed by default, transition-event non-blocking controls, source boundary, and forbidden claims.
- V4.8 smoke: the inspector body state-specific assertion now accepts either the original V4.8 review-purpose text or the Slice 0 `State Evidence` copy for the active window. It still requires the correct active window, product label, actor ids, anchor metadata, and five unique state bodies.

No smoke softening removes route, endpoint pair, precision, actor set, V4.6D model, R2 non-selector, five-state order, default-closed, implementation-evidence-collapsed, or forbidden-claim coverage.

## Reviewer Status

`reviewer-pending`

Per Lock-in I, interim reviewer status remains pending for the Slice 2 through Slice 5 batch.

## No Scope Leak Confirmation

Confirmed absent:

- transition toast
- new scene cue
- Sources role
- R2 runtime listing/selector
- active serving satellite, active gateway/path, measured metric, native RF, operator-log truth, or failover-proof claims

## Unchanged Contract Confirmation

Confirmed unchanged:

- route remains `/?scenePreset=regional&m8aV4GroundStationScene=1`
- endpoint pair remains `taiwan-cht-speedcast-singapore-operator-family-2026-04-26`
- precision remains `operator-family-only` / `operator-family precision`
- actor set remains 13 actors with `LEO=6`, `MEO=5`, `GEO=2`
- V4.6D model id remains `m8a-v4.6d-simulation-handover-model.v1`
- R2 remains read-only / non-selector evidence
- Slice 1 micro-cue, orbit-class chips, precision chips, triplets, and provenance badge keep their approved text, dimensions, and positions
- Slice 2 hover popover target classes, delay, size budget, copy, keyboard behavior, dismiss behavior, and click-to-pin path remain unchanged
