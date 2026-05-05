# M8A-V4.10 Slice 0 Baseline And Target Lock

Source note: this is the execution artifact for `M8A-V4.10` Slice 0:
Baseline And Target Lock. It records evidence and target direction only. It
does not authorize or include product runtime implementation.

Related SDD:
[m8a-v4.10-product-experience-redesign-plan.md](./m8a-v4.10-product-experience-redesign-plan.md).
Related latest runtime closeout:
[m8a-v4.9-product-comprehension-slice5-final-handoff.md](./m8a-v4.9-product-comprehension-slice5-final-handoff.md).

## Status

- slice: `M8A-V4.10 Slice 0`
- scope: baseline screenshots, current behavior findings, target wireframe,
  five-state storyboard
- date: 2026-05-01
- route captured: `/?scenePreset=regional&m8aV4GroundStationScene=1`
- source used for capture: existing `dist/`; no rebuild was run for Slice 0
- runtime implementation: not started
- product runtime files changed: none

## Evidence Directory

All Slice 0 evidence is under:

`/home/u24/papers/scenario-globe-viewer/output/m8a-v4.10-slice0/`

Manifest:

- `capture-manifest.json`

## Current V4.9 Screenshot Inventory

Baseline default screenshots:

| Viewport | Screenshot | Metadata | Captured active state |
| --- | --- | --- | --- |
| `1440x900` | `v4.9-baseline-default-1440x900.png` | `v4.9-baseline-default-1440x900.metadata.json` | `leo-acquisition-context` |
| `1280x720` | `v4.9-baseline-default-1280x720.png` | `v4.9-baseline-default-1280x720.metadata.json` | `leo-acquisition-context` |
| `390x844` | `v4.9-baseline-default-390x844.png` | `v4.9-baseline-default-390x844.metadata.json` | `leo-acquisition-context` |

Current behavior screenshots:

| Behavior | Screenshot | Metadata |
| --- | --- | --- |
| `Details` open at `1440x900` | `v4.9-behavior-details-open-1440x900.png` | `v4.9-details-truth-behavior.metadata.json` |
| `Truth` open at `1440x900` | `v4.9-behavior-truth-open-1440x900.png` | `v4.9-details-truth-behavior.metadata.json` |

Target wireframe captures:

| Target | Capture | Source |
| --- | --- | --- |
| Desktop target `1440x900` | `target-wireframe-desktop-1440x900.png` | `target-wireframe-desktop.svg` |
| Narrow target `390x844` | `target-wireframe-narrow-390x844.png` | `target-wireframe-narrow.svg` |

## Details vs Boundary / Truth Findings

Current V4.9 behavior:

- `Details` exists as a visible control in the persistent strip.
- `Truth` exists as a visible compact truth affordance in the same persistent
  strip.
- Both controls have action `toggle-disclosure`.
- Opening `Details` sets both `Details` and `Truth` to `aria-expanded=true`.
- Opening `Truth` also sets both `Details` and `Truth` to
  `aria-expanded=true`.
- Both actions open the same inspection sheet surface:
  `detailsAndTruthUseSameSheetSurface=true`.
- The opened sheet is the generic `Handover review` inspection sheet with
  `Current state`, `Why`, `Changed`, `Watch`, `Next`, `Boundary`,
  `Implementation evidence`, and `Full truth boundary`.

Finding:

`Truth` is product-visible but not behaviorally distinct from `Details`.
Current boundary behavior therefore fails the V4.10 target that requires a
compact boundary affordance separated from the generic inspector entry path.

## Product-Visible Failures

From the captured V4.9 baseline:

- The upper-right persistent strip is visually dominant and reads as controls
  plus state labels before it reads as a handover review product.
- The state label is present near the scene, but it is a small annotation, not
  the primary product narrative.
- The five-state sequence is not visible as a narrative rail; default view only
  exposes `State 1 of 5`.
- The next transition is not visually staged in the default viewport.
- `Details` and `Truth` are adjacent buttons with the same disclosure behavior,
  so the truth boundary is not product-obvious.
- The first-read copy remains engineering-facing, for example
  `LEO display context establishes the first review focus.`
- On narrow viewport, the control strip consumes substantial vertical space and
  competes with the globe and scene label.
- Cesium native surfaces and default-token notice remain visible in the
  baseline and add review noise near the bottom timeline.

## V4.10 Target Wireframe

The Slice 0 target is static evidence only. It is not runtime code.

Desktop target:

- scene-first workspace dominates the viewport
- compact boundary line appears in the top band and is not a duplicate
  `Details` action
- active state card is placed near the relevant scene cue
- active cue connector is shown only when geometry is reliable
- five-state sequence rail is visible and marks both active and next states
- inspector is represented as optional evidence, not the first-read narrative

Narrow target:

- state title and compact boundary stay readable at the top
- scene remains the main body of the viewport
- active cue label stays inside the scene panel
- sequence rail compresses to numbered marks with active and next treatment
- details remain an on-demand sheet/evidence affordance

Visible difference from V4.9:

- V4.9 default is a real Cesium scene with top/right controls and a small
  scene annotation.
- V4.10 target shifts the product reading order to scene cue, active state,
  sequence rail, next transition, and compact boundary.
- The target has enough visible product difference to proceed to
  planning/control review. No Slice 0 blocker is raised on target distinctness.

## Five-State Storyboard

### `leo-acquisition-context`

| Field | Value |
| --- | --- |
| Active state title | `LEO review focus` |
| Primary orbit class | `LEO` |
| Selected visual cue | representative LEO cue connected to the accepted Taiwan/Singapore corridor when geometry is reliable |
| Scene label copy | `LEO review focus` / `LEO is the simulated review focus for this corridor.` / `Watch: representative LEO cue.` |
| Sequence rail active/next marks | active mark `1 LEO review`; next mark `2 LEO pressure` |
| Boundary copy | `Simulation review - not an operator handover log. No active satellite, gateway, path, or measured metric claim.` |
| Inspector summary | Current state explains initial LEO review focus; why states that the model begins with LEO context; changed says replay begins with representative LEO emphasis; watch points to representative LEO cue and endpoint corridor; next points to LEO pressure. |
| Unreliable-anchor fallback behavior | hide connector; keep state card/rail visible; replace cue-near wording with `No reliable scene attachment - use sequence rail and state summary.` |
| Desktop screenshot target | `v4.10-default-leo-acquisition-context-1440x900.png` |
| Narrow screenshot target | `v4.10-default-leo-acquisition-context-390x844.png` |

### `leo-aging-pressure`

| Field | Value |
| --- | --- |
| Active state title | `LEO pressure` |
| Primary orbit class | `LEO` |
| Selected visual cue | LEO candidate/pressure cue with emphasized line weight when geometry is reliable |
| Scene label copy | `LEO pressure` / `The LEO review context is under simulated pressure.` / `Next: continuity shifts to MEO context.` |
| Sequence rail active/next marks | active mark `2 LEO pressure`; next mark `3 MEO hold` |
| Boundary copy | `Simulation review - not an operator handover log. No active satellite, gateway, path, or measured metric claim.` |
| Inspector summary | Current state explains simulated LEO pressure; why records deterministic model pressure; changed says review moved from LEO acquisition into pressure; watch points to LEO candidate context; next points to MEO continuity hold. |
| Unreliable-anchor fallback behavior | hide connector; show pressure state in persistent card and active rail; label fallback as `LEO pressure - no reliable scene attachment.` |
| Desktop screenshot target | `target-wireframe-desktop-1440x900.png` for Slice 0 target lock; later runtime target `v4.10-default-leo-aging-pressure-1440x900.png` |
| Narrow screenshot target | `target-wireframe-narrow-390x844.png` for Slice 0 target lock; later runtime target `v4.10-default-leo-aging-pressure-390x844.png` |

### `meo-continuity-hold`

| Field | Value |
| --- | --- |
| Active state title | `MEO continuity hold` |
| Primary orbit class | `MEO` |
| Selected visual cue | MEO representative cue with MEO role treatment and connector only when geometry is reliable |
| Scene label copy | `MEO continuity hold` / `MEO context is holding continuity in this simulation.` / `Next: LEO returns as a candidate focus.` |
| Sequence rail active/next marks | active mark `3 MEO hold`; next mark `4 LEO re-entry` |
| Boundary copy | `Simulation review - not an operator handover log. MEO is display context, not active gateway or path proof.` |
| Inspector summary | Current state explains MEO hold; why records continuity class as simulation output; changed says focus shifted from LEO pressure to MEO context; watch points to MEO cue and corridor relation; next points to LEO re-entry candidate. |
| Unreliable-anchor fallback behavior | hide connector; keep MEO rail mark active; show `MEO continuity hold - no reliable scene attachment.` |
| Desktop screenshot target | `v4.10-default-meo-continuity-hold-1440x900.png` |
| Narrow screenshot target | `v4.10-default-meo-continuity-hold-390x844.png` |

### `leo-reentry-candidate`

| Field | Value |
| --- | --- |
| Active state title | `LEO re-entry` |
| Primary orbit class | `LEO` |
| Selected visual cue | returning LEO candidate cue with sequence emphasis and reliable connector only when anchored |
| Scene label copy | `LEO re-entry` / `LEO returns as a candidate review focus.` / `Next: GEO closes the sequence as guard context.` |
| Sequence rail active/next marks | active mark `4 LEO re-entry`; next mark `5 GEO guard` |
| Boundary copy | `Simulation review - candidate focus only. No active satellite, gateway, path, or measured metric claim.` |
| Inspector summary | Current state explains LEO candidate return; why records deterministic re-entry context; changed says focus moved from MEO hold to LEO candidate; watch points to returning LEO cue; next points to GEO guard context. |
| Unreliable-anchor fallback behavior | hide connector; keep candidate state in card and rail; show `LEO re-entry - no reliable scene attachment.` |
| Desktop screenshot target | `v4.10-default-leo-reentry-candidate-1440x900.png` |
| Narrow screenshot target | `v4.10-default-leo-reentry-candidate-390x844.png` |

### `geo-continuity-guard`

| Field | Value |
| --- | --- |
| Active state title | `GEO guard context` |
| Primary orbit class | `GEO` |
| Selected visual cue | GEO guard cue shown as continuity guard/fallback context, not failover proof |
| Scene label copy | `GEO guard context` / `GEO is shown only as guard context, not active failover proof.` / `Restart to review the sequence again.` |
| Sequence rail active/next marks | active mark `5 GEO guard`; next mark `Restart` or `1 LEO review` |
| Boundary copy | `GEO guard is simulation context only. No active failover, gateway, path, or measured metric claim.` |
| Inspector summary | Current state explains final guard context; why records guard/fallback display role; changed says review moved from LEO re-entry to GEO guard; watch points to guard cue without service claim; next points to restart. |
| Unreliable-anchor fallback behavior | keep connector hidden by default if geometry is not reliable; show persistent guard card and rail completion; label fallback as `GEO guard context - no scene attachment.` |
| Desktop screenshot target | `v4.10-default-geo-continuity-guard-1440x900.png` |
| Narrow screenshot target | `v4.10-default-geo-continuity-guard-390x844.png` |

## Acceptance Readiness

Slice 0 acceptance criteria status:

| Criterion | Status |
| --- | --- |
| baseline evidence exists in `output/m8a-v4.10-slice0/` | ready |
| target evidence or wireframe capture exists in `output/m8a-v4.10-slice0/` | ready |
| this SDD artifact exists and contains required sections | ready |
| target visibly differs from current V4.9 as a product experience | ready |
| all five states have storyboard records | ready |
| Details and boundary/Truth behavior findings are explicit | ready |
| no forbidden product runtime files are modified | ready |
| no Slice 1 implementation begins | ready |

Slice 0 is acceptance-ready for planning/control review.

## Risks / Blockers

Blockers:

- none for Slice 0 target lock

Risks for later runtime slices:

- The target is static evidence; runtime feasibility and Cesium composition
  still need Slice 1 implementation and visual validation.
- Narrow target needs careful text fitting so boundary and sequence rail copy
  stay inside the viewport.
- The current `Truth` action is coupled to the generic inspector; separating it
  in Slice 3 must preserve access to full truth disclosure without making
  `Truth` another `Details` button.
- Cesium native UI and the default-token notice remain visible in V4.9
  baseline screenshots; later phases need an explicit decision on whether this
  is acceptable product noise or should be handled within existing scope.

## Forbidden Scope Confirmation

This Slice 0 artifact does not change:

- `src/runtime/*`
- `src/styles.css`
- `tests/smoke/*`
- `package.json`
- product runtime behavior
- route, endpoint pair, precision, actor set, source boundary, `R2` runtime
  selector status, or `V4.6D` model truth

Runtime code remains blocked until planning/control accepts this Slice 0
baseline/target lock and explicitly opens the next slice.
