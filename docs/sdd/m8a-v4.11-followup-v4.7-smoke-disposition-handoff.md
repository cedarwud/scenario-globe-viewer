# M8A-V4.11 Follow-up V4.7 Smoke Disposition Handoff

Date: 2026-05-05
Status: ready for review; V4.7.1 repaired, successor smoke residuals recorded

## Disposition

Adopted option: A - repair the stale smoke assertion.

The V4.7.1 SDD and final handoff record V4.7.1 as the accepted product
usability correction for V4.7. However, `test:m8a-v4.7.1` still aliases the
upgraded `test:m8a-v4.7` acceptance smoke, and that smoke now validates the
V4.7.1 runtime version and V4.6D invariants. Deprecating the file would remove
the active V4.7.1 acceptance smoke rather than only retiring an obsolete V4.7
check.

## Change

`tests/smoke/verify-m8a-v4.7-handover-product-ux-runtime.mjs` now accepts the
V4.11 Slice 1 micro-cue text for the scene-near annotation:

- `focus · LEO`
- `pressure · LEO`
- `hold · MEO`
- `re-entry · LEO`
- `guard · GEO`

The original product-label mapping remains required in runtime state and DOM
state, with the label baseline aligned to the V4.7.1/V4.8 successor copy
already used by the V4.8 smoke.

The same smoke also narrows the debug-speed visibility assertion after invoking
the debug-only `setDebugPlaybackMultiplier(240)` hook. The default product UI
still forbids visible `240x`, and normal playback controls must still expose
only `30x`, `60x`, and `120x`. After the debug hook is invoked, the smoke now
checks the normal control values rather than failing on status text that reports
the currently active debug multiplier.

For inspector pointer probes, the smoke keeps the real CDP pointer-click path
but scrolls the Boundary tab and close button into view first. This preserves
the tab/close state-transition checks while removing the old fixed-center
assumption from the pre-V4.11 layout.

For the five-window label-mapping loop, the smoke keeps the selected window,
representative actor, anchor kind, and projected-geometry checks, but no longer
applies one hard-coded `330px` scene-annotation distance threshold to every
window. Detailed scene-anchor geometry thresholds remain owned by the V4.8+
geometry smokes.

For the details disclosure check, the smoke keeps the disclosure-line and
truth-badge inventory assertions. It now opens the V4.11 Boundary inspector tab
before checking the disclosure lines, and it no longer requires truth badges to
be rendered inside the details sheet. V4.10+ separates boundary affordance and
details surfaces.

The details disclosure typography probe still requires body text at least
`14px`, but accepts compact V4.11 inspector controls at least `12px`. The
default visible-product typography probe now accepts V4.11 compact scene cues
and controls at least `11px`.

The protected-scene-zone obstruction probe now gates desktop scene-near
annotation only. Persistent V4.11 layout surfaces such as the top strip,
handover rail, and compact control strip are ignored by the V4.7-era obstruction
grid, and narrow-viewport geometry coverage lives in V4.8+ smokes.

## Smoke Softening Disclosure

This softening is limited to:

- the V4.7.1 scene-near annotation visible text after the V4.11 micro-cue
  migration
- the V4.7 product-label baseline, which now tracks the V4.7.1/V4.8 successor
  labels rather than obsolete V4.7-only wording
- the post-debug-hook `240x` check, which now targets normal product controls
  instead of all page text
- the inspector pointer probes, which may scroll the Boundary tab and close
  button into view before dispatching the real pointer click
- the five-window label-mapping loop, which now requires projected finite
  geometry instead of one pre-V4.11 annotation-distance threshold
- the disclosure badge placement check, which now validates the product state
  inventory instead of details-sheet placement
- the disclosure line visibility path, which now uses the V4.11 Boundary tab
  instead of the default Decision tab
- the details control typography floor, which now accepts the compact V4.11
  inspector controls while keeping body text at `14px`
- the default visible-product typography floor, which now accepts compact
  V4.11 scene cues and controls at `11px`
- the V4.7-era protected-zone grid, which now gates desktop scene-near
  annotation obstruction and delegates persistent-surface plus narrow-layout
  coverage to V4.8+

Preserved without softening:

- route `/?scenePreset=regional&m8aV4GroundStationScene=1`
- endpoint pair `taiwan-cht-speedcast-singapore-operator-family-2026-04-26`
- precision `operator-family-only`
- actor counts `6` LEO, `5` MEO, `2` GEO
- V4.6D model id and model truth
- raw customer side-read and runtime source-boundary scans
- forbidden positive claim and measured-unit scans
- truth disclosure lines and truth badge inventory
- details body text at least `14px`
- visible product text at least `11px` for compact scene cues and controls
- desktop scene-near annotation non-obstruction against protected scene zones
- default product UI absence of visible `240x`
- normal playback controls exposing only `30x`, `60x`, and `120x`
- details open and close state transitions through real pointer events
- DOM/window product-label mapping to the accepted V4.6D windows
- scene-near anchor kind and representative actor binding
- initial viewport scene-near distance check in the primary product UX
  inspection path

This does not authorize runtime, CSS, endpoint, source, actor, route, precision,
or model-truth changes.

## Validation Result

Passed:

- `git diff --check`
- `npm run test:m8a-v4.7.1`
- `npm run test:m8a-v4.11:slice1` through `slice6`
- `npm run test:m8a-v4.11:correction-a-phase-b` through `phase-e`
- `node tests/smoke/verify-m8a-v4.11-conv1-visual-tokens-runtime.mjs`
- `node tests/smoke/verify-m8a-v4.11-conv2-hover-inspector-countdown-runtime.mjs`

Failed outside this follow-up's allowed edit scope:

- `npm run test:m8a-v4.8`: V4.8 info-class assertion still rejects V4.11
  handover-rail visible text nodes without `data-m8a-v48-info-class`.
- `npm run test:m8a-v4.9`: V4.9 default-visible metadata assertion still
  rejects current V4.11 top-strip/footer visible text.
- `npm run test:m8a-v4.10:slice1` and `slice2`: both fail the V4.10
  V4.9-baseline visual-difference assertion against current V4.11 micro-cue
  layout. `slice3` through `slice5` were not run after the shared baseline gate
  failed twice.
- `node tests/smoke/verify-m8a-v4.11-conv3-footer-truth-removal-runtime.mjs`:
  bottom-layout threshold reports `bottomBandHeight` `102.40625px` where the
  conv3 smoke requires `<=100px`.
- `node tests/smoke/verify-m8a-v4.11-conv4-sources-demote-smoke-matrix-runtime.mjs`:
  advanced source-provenance opener assertion fails with sources open through
  the inspector evidence state.

Smoke-generated tracked `output/` artifacts were restored after validation so
the working tree only carries the V4.7 smoke and this handoff doc.

## Suggested Commit Message

```text
Repair stale M8A V4.7.1 smoke after V4.11 layout migration

- accept V4.11 micro-cue labels in the V4.7.1 scene-near smoke
- align V4.7 expected product labels with the accepted V4.7.1/V4.8 successor copy
- keep 240x debug-speed exclusion scoped to normal product controls
- scroll inspector tab/close targets into view before real pointer-click probes
- keep V4.7 label mapping on window/actor/projected geometry, not stale distance
- keep truth badges as state inventory without stale details-sheet placement
- check truth disclosure lines in the V4.11 Boundary tab
- accept compact V4.11 details controls while keeping body text at 14px
- accept compact V4.11 visible scene cues and controls at 11px
- keep V4.7 obstruction check scoped to desktop scene-near annotation
- preserve V4.6D route, pair, precision, actor, model, and forbidden-claim checks
- record V4.7 smoke disposition follow-up handoff
```
