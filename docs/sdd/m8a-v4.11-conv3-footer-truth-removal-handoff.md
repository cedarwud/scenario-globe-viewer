# M8A-V4.11 Conv 3 — Footer Chip System + Truth Removal Handoff

Date: 2026-05-04
Status: Conv 3 implementation and validation evidence recorded
Origin: M8A-V4.11 Storyboard Rewrite Proposal, Footer chip system + Addendum
§1.6 / §1.7
Predecessor: `m8a-v4.11-conv2-hover-inspector-countdown-handoff.md`

## Scope

Conv 3 moves the always-on disclosure from a compact `Truth` button into a
footer chip row:

- Footer row now renders the four ambient chips:
  `[模擬展示] [operator-family precision] [TLE: CelesTrak NORAD GP · 2026-04-26] [13 actors]`.
- W5 renders the additional high-salience chip
  `[⚠ 不是實際備援切換證據]` with `#ff6b3d` outline and 14px font.
- The old Truth button DOM is removed. The compatible
  `[data-m8a-v47-action='toggle-boundary']` action now lives on the footer
  chip and opens the existing `boundaryDisclosureOpen` path.
- The corner provenance badge remains mounted only as a <=24x24 placeholder
  for selector compatibility. Its visible source/date/actor content moved to
  footer chips.
- The 1440x900 bottom layout follows Addendum §1.6: sequence rail bottom at
  56px, footer gap 8px, footer row 24px, Details aligned on the same row.

## Relevant Changed Files

```text
src/runtime/m8a-v411-footer-chip-system.ts
src/styles/m8a-v411-footer-chip.css
src/runtime/m8a-v4-ground-station-handover-scene-controller.ts
src/runtime/m8a-v411-glance-rank-surface.ts
src/styles/m8a-v411-glance-rank.css
tests/smoke/verify-m8a-v4.11-conv3-footer-truth-removal-runtime.mjs
tests/smoke/verify-m8a-v4.10-slice5-validation-matrix-runtime.mjs
tests/smoke/verify-m8a-v4.9-product-comprehension-runtime.mjs
docs/sdd/m8a-v4.11-conv3-footer-truth-removal-handoff.md
```

Note: V4.8 / V4.9 smoke files were already modified when this continuation
started. Conv 3 only completed the remaining V4.9 footer selector path needed
for the existing dirty validation matrix to run.

## Screenshots

All Conv 3 evidence screenshots are under `output/m8a-v4.11-conv3/`:

- `v4.11-conv3-w1-default-1440x900.png`
- `v4.11-conv3-w5-warning-1440x900.png`
- `v4.11-conv3-truth-removed-1440x900.png`
- `v4.11-conv3-footer-chip-clicked-1440x900.png`
- `v4.11-conv3-bottom-layout-1440x900.png`

Manifest: `output/m8a-v4.11-conv3/capture-manifest.json`.

## Smoke Results

Passed after the final CSS/runtime changes:

| Check | Result |
| --- | --- |
| `npm run build` | pass |
| `node scripts/verify-m8a-v4.3-raw-itri-side-read.mjs` | pass |
| `node scripts/verify-m8a-v4.6b-runtime-source-boundary.mjs` | pass |
| `node tests/smoke/verify-m8a-v4.11-conv3-footer-truth-removal-runtime.mjs` | pass |
| `node tests/smoke/verify-m8a-v4.8-handover-demonstration-ui-ia-runtime.mjs` | pass |
| `node tests/smoke/verify-m8a-v4.9-product-comprehension-runtime.mjs` | pass |
| `node tests/smoke/verify-m8a-v4.10-slice1-first-viewport-composition-runtime.mjs` | pass |
| `node tests/smoke/verify-m8a-v4.10-slice2-handover-sequence-rail-runtime.mjs` | pass |
| `node tests/smoke/verify-m8a-v4.10-slice3-boundary-affordance-separation-runtime.mjs` | pass |
| `node tests/smoke/verify-m8a-v4.10-slice4-inspector-evidence-redesign-runtime.mjs` | pass |
| `node tests/smoke/verify-m8a-v4.10-slice5-validation-matrix-runtime.mjs` | pass |
| `node tests/smoke/verify-m8a-v4.11-conv1-visual-tokens-runtime.mjs` | pass |
| `node tests/smoke/verify-m8a-v4.11-conv2-hover-inspector-countdown-runtime.mjs` | pass |
| `node tests/smoke/verify-m8a-v4.11-slice1-glance-rank-surface-runtime.mjs` | pass |
| `node tests/smoke/verify-m8a-v4.11-slice4-transition-toast-runtime.mjs` | pass |
| `node tests/smoke/verify-m8a-v4.11-slice5-real-data-surfacing-runtime.mjs` | pass |

Not changed by Conv 3:

- `verify-m8a-v4.11-slice2-hover-popover-runtime.mjs` still carries an old
  Truth-exists assertion. This smoke is outside Conv 3 scope per the explicit
  Slice 2 smoke freeze, so it was inspected but not softened.

## §Smoke Softening Disclosure

1. V4.10 Slice 3/4/5 boundary selector owner changed from the old Truth
   button to the footer chip. The selector remains
   `[data-m8a-v47-action='toggle-boundary']`; the owning element is now the
   footer chip and the state path remains `boundaryDisclosureOpen`.
2. V4.11 Slice 1 corner provenance assertion changed from visible badge text
   to a <=24x24 placeholder plus footer chips for source/date/actor count.
3. V4.11 Slice 5 source-provenance assertion now accepts footer chip TLE
   content while leaving the Sources role itself unchanged.

## Slice 3 Design Evolution Note

Addendum §1.7 supersedes the original Slice 3 concurrent two-role design.
The implementation keeps State Evidence as the single inspector role and
keeps Truth content as a tail section only when the footer boundary chip is
clicked. The reason is disclosure comprehension: ambient footer context is
more legible to a layperson than a separate button named Truth, while the
existing truth-tail DOM preserves the boundary state machine and downstream
selector compatibility.

## Guardrails Confirmed

- No Slice 5 Sources demotion was implemented.
- No reviewer-protocol revision was made.
- No V4.8 smoke edit was made in this continuation.
- No Lock-in L GPU validation claim was made.
- Route, endpoint pair, precision, actor set, V4.6D model, and R2 read-only
  posture remain unchanged.
- Conv 1 visual-token / scene-context / ground-station-chip surfaces were not
  changed.
- Conv 2 hover / single-role inspector / countdown surfaces were not changed.
- The boundary state machine remains: `boundaryDisclosureOpen` still opens
  State Evidence with the Truth tail; only the trigger moved from the Truth
  button to the footer chip.
