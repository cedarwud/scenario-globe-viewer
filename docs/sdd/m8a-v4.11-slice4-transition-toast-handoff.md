# M8A-V4.11 Slice 4 Transition Toast Handoff

Date: 2026-05-03
Status: implementation-accepted, reviewer-pending

## Scope

Slice 4 adds only the transient transition surface authorized by the V4.11 redesign plan:

- V4.6D window-transition toast, 2.5s duration, upper-left canvas placement, max stack 2.
- Scene cue chip near the new focus actor, max 180x24, 200ms fade-in, 2s persistence before it returns to the existing glance-rank chip context.
- ARIA `role="status"` mirror for transition copy.
- Reduced-motion behavior with static in/out and no slide transform.
- Sequence rail active/next sync remains the existing behavior.

The toast copy is copied from the Slice 0 W1-W5 storyboard. No measured-metric text, raw window id, Sources role, or R2 listing is added to the visible toast or scene cue.

## Changed Files

- `src/runtime/m8a-v411-transition-toast.ts`
- `src/styles/m8a-v411-transition-toast.css`
- `src/runtime/m8a-v4-ground-station-handover-scene-controller.ts`
- `src/styles.css`
- `tests/smoke/verify-m8a-v4.11-slice4-transition-toast-runtime.mjs`
- `tests/smoke/verify-m8a-v4.11-slice1-glance-rank-surface-runtime.mjs`
- `tests/smoke/verify-m8a-v4.11-slice2-hover-popover-runtime.mjs`
- `tests/smoke/verify-m8a-v4.11-slice3-inspector-concurrency-runtime.mjs`
- `package.json`
- `docs/sdd/m8a-v4.11-slice4-transition-toast-handoff.md`

## Captures

- `output/m8a-v4.11-slice4/v4.11-w2-toast-1440x900.png`
- `output/m8a-v4.11-slice4/v4.11-w3-toast-1440x900.png`
- `output/m8a-v4.11-slice4/v4.11-w4-toast-1440x900.png`
- `output/m8a-v4.11-slice4/v4.11-w5-toast-1440x900.png`
- Optional concurrency backfill: `output/m8a-v4.11-slice4/v4.11-w3-hold-concurrency-1440x900.png`

## Slice 4 Negative Smoke

Command:

```bash
npm run test:m8a-v4.11:slice4
```

Result: passed.

Covered checks:

- One transition creates exactly one visible toast and one scene cue.
- W2-W5 toast/cue runtime visibility elapsed within 250ms. Final capture run observed W2 11ms, W3 8ms, W4 8ms, W5 9ms.
- Toast title and supporting line match Slice 0 product copy.
- Raw window ids are not visible in toast copy.
- Measured-metric text is not visible in toast or cue.
- Toast geometry stays within 320x72 and within 22% canvas width.
- Toast does not overlap control surfaces, glyph chips, or sequence rail.
- Scene cue stays within 180x24.
- Reduced-motion mode reports `animationName: none` and `transform: none`.
- ARIA live status mirror is triggered.
- Stack cap remains 2 visible toasts.

## Invariant Smoke Results

All commands passed on the final Slice 4 working tree state:

```bash
npm run test:m8a-v4.11:slice1
npm run test:m8a-v4.11:slice2
npm run test:m8a-v4.11:slice3
npm run test:m8a-v4.11:slice4
npm run test:m8a-v4.10:slice1
npm run test:m8a-v4.10:slice2
npm run test:m8a-v4.10:slice3
npm run test:m8a-v4.10:slice4
npm run test:m8a-v4.10:slice5
npm run test:m8a-v4.9
npm run test:m8a-v4.8
```

Build emitted the existing large-chunk warning and the existing protobuf direct-eval warning only.

## Smoke Softening Disclosure

- V4.11 Slice 1, Slice 2, and Slice 3 smoke future-scope checks were narrowed so the newly approved Slice 4 transient toast/scene-cue surface is not treated as a future-scope leak. The checks still forbid Slice 5 Sources role and R2 listing exposure.
- V4.11 Slice 2 direct seek helper now pauses the controller after seeking so hover target maps are synced before assertions. This stabilizes the existing hover coverage and does not change hover acceptance criteria.
- V4.11 Slice 4 negative smoke measures the 250ms appearance requirement from runtime-reported toast elapsed metadata, avoiding CDP polling overhead while preserving the product timing assertion.
- No V4.8, V4.9, or V4.10 smoke files were softened. V4.9 exposed a runtime issue during validation; the runtime was fixed by suppressing first-render mount transition toasts and by adding existing `dynamic` info-class metadata to the ARIA status and scene cue nodes.

## No Scope Leak Confirmation

- No Sources role added.
- No R2 listing or R2 selector added.
- No corner provenance badge content changed by Slice 4.
- No measured-metric text enters toast or cue.
- Toast visible copy is product copy only, copied from Slice 0 W1-W5.
- Toast and cue are transient only; they expire and do not persist as banners.

## Unchanged Contract Confirmation

- Route remains unchanged: `?scenePreset=regional&m8aV4GroundStationScene=1`.
- Endpoint pair remains unchanged.
- Precision remains operator-family only, with the existing `operator-family precision` badge.
- Actor set remains unchanged: 13 display-context actors, LEO 6 / MEO 5 / GEO 2.
- V4.6D handover model remains unchanged.
- R2 remains read-only and non-selector.
- Slice 1 glance-rank surface behavior and dimensions remain unchanged.
- Slice 2 hover popover behavior and dimensions remain unchanged.
- Slice 3 inspector concurrency behavior and dimensions remain unchanged.
