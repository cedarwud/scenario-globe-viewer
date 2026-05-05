# M8A-V4.11 Slice 0 Baseline Reannotation

Measurement method: reused the six read-only V4.10 Slice 5 PNGs plus their
saved metadata under `output/m8a-v4.10-slice5/`. DOM rectangles below come
from the saved metadata generated with those PNGs. Cesium label and transition
event boxes are approximate PNG pixel measurements from the 1440×900 images.
The Details/Truth mutual-exclusion row also reads the controller source
without changing it.

## Reannotation Table

| V4.10 artifact | Cited PNG | Actual observed dimension / position | V4.11 budget | SDD reviewer-reaction prediction |
| --- | --- | --- | --- | --- |
| `m8a-v47-product-ux__scene-annotation` (scene narrative) | `v4.10-slice5-default-1440x900.png` | DOM metadata: left 118.09, top 485.80, width 360, height 165.23. Narrow PNG metadata: width 328, height 177.94. | glance ≤24px tall scene-anchored cue | match: permanent large scene narrative is visible in the canvas. |
| `m8a-v47-product-ux__strip` (top-left state strip) | `v4.10-slice5-default-1440x900.png` | DOM metadata: left 23.03, top 74.23, width 584, height 85.16; visible buttons occupy the same strip. | secondary ≤584×64 with state title only; controls grouped right | match: the strip is larger than the height budget and contains controls. |
| Cesium label "Taiwan / CHT operator-family anchor / operator-family precision" | `v4.10-slice5-default-1440x900.png` | PNG pixel measurement: approx left 660, top 447, width 225, height 50. Source confirms a two-line Cesium label with 12px font, background padding 8×5, pixel offset -32. | single-line precision chip ≤180×24 + separate orbit-evidence triplet ≤180×24 | match: two-line label is visible and not split into chip/triplet surfaces. |
| Cesium label "Singapore / Speedcast operator-family anchor / operator-family precision" | `v4.10-slice5-default-1440x900.png` | PNG pixel measurement: approx left 486, top 556, width 270, height 40. Source confirms a two-line Cesium label with the same style as Taiwan. | single-line precision chip ≤180×24 + separate orbit-evidence triplet ≤180×24 | match: two-line label is visible and not split into chip/triplet surfaces. |
| `[data-m8a-v49-inspector-current]` body (inside Details) | `v4.10-slice5-details-open-1440x900.png` | DOM metadata: Details sheet left 985, top 320.19, width 432, height 480; inspector body left 999.11, top 527.59, width 388.78, height 632.73. Sections visible: Current state, Why, Changed, Watch, Next. | inspector "State Evidence" role single combined section ≤200 words | match: the evidence body remains a multi-section Details surface. |
| `m8a-v410-product-ux__boundary-surface` content | `v4.10-slice5-boundary-open-1440x900.png` | DOM metadata: left 23.03, top 142.23, width 408, height 368. Visible text is the truth boundary and full truth disclosure; Details sheet rect is 0x0. | inspector "Truth Boundary" role co-resident with State Evidence; no longer a standalone surface | match: the boundary is a standalone surface and Details is closed. |
| `detailsSheetState` perpendicular `boundarySurfaceState` mutual exclusion | `v4.10-slice5-details-open-1440x900.png`; `v4.10-slice5-boundary-open-1440x900.png` | Metadata: Details-open has sheet 432x480 and boundary 0x0; boundary-open has boundary 408x368 and sheet 0x0. Source read: `toggleDetailsDisclosure` closes boundary state, and `toggleBoundaryDisclosure` closes details state. | concurrency required: opening one role does not close the other | match: the saved evidence and source both show mutual exclusion. |
| Window transition (e.g., `leo-aging-pressure → meo-continuity-hold`) | `v4.10-slice5-transition-leo-aging-pressure-1440x900.png` | DOM metadata: sequence rail left 304, top 718.92, width 832, height 90.84, active W2/next W3. PNG pixel measurement: transition event approx left 1084, top 167, width 339, height 59. No scene cue chip near the W2 focus actor is visible. | 2.5s toast + ≤180×24 scene cue chip near new focus actor | partial: a top-right transition event is visible, but the V4.11 near-focus scene cue is absent. |
| Source TLE provenance (CelesTrak NORAD GP, 13 actors, fetched 2026-04-26) | `v4.10-slice5-default-1440x900.png`; `v4.10-slice5-details-open-1440x900.png` | Default PNG/metadata: no visible TLE provenance badge, no measured provenance rect. Details-open metadata: hidden debug evidence is closed; visible debug text is only `Implementation evidence` within the 432x480 Details sheet. | corner provenance badge always visible | match: no default visible provenance badge appears in the cited PNG. |
| 5 R2 blocked candidate endpoints | all six V4.10 Slice 5 PNGs | Metadata visible text/resource scan: no R2 candidate endpoint list or Sources role is exposed; visible runtime rect is 0x0 across default, Details, Truth, and transition captures. | corner provenance badge or inspector "Sources" role can list them as read-only catalog | match: no runtime surface exposes the R2 candidate list. |

## Mismatch Rows

None.

## Partial Rows

- Window transition: the PNG contains a top-right transition event, while the
  V4.11 budget requires a 2.5s toast plus a ≤180×24 scene cue chip near the
  new focus actor.
