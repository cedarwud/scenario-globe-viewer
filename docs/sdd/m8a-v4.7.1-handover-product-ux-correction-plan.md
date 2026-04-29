# M8A-V4.7.1 Handover Product UX Correction Plan

Source note: this is a doc-only SDD delta for correcting the accepted
`M8A-V4.7` handover product UX. It does not authorize runtime implementation
by itself and must not be treated as approval to change route, endpoint pair,
precision, actor set, model truth, or data source.

Related V4.7 product UX SDD:
[./m8a-v4.7-handover-product-ux-plan.md](./m8a-v4.7-handover-product-ux-plan.md).
Related V4.6D model contract:
[V4.6D model contract](./m8a-v4.6d-simulation-handover-model-contract.md).
Related VNext roadmap:
[./m8a-vnext-multi-orbit-simulation-roadmap.md](./m8a-vnext-multi-orbit-simulation-roadmap.md).
Related planning-control handoff:
[./m8a-vnext-planning-control-handoff.md](./m8a-vnext-planning-control-handoff.md).

## Status

- correction SDD delta
- doc-only
- current as of 2026-04-29
- no runtime implementation authority by itself
- intended phase: `M8A-V4.7.1` product usability correction
- baseline runtime commit: `26781b8 Implement M8A V4.7 handover product UX`
- baseline hardening commit: `df829af Harden M8A V4.7 acceptance records`

## Current Failure Assessment

`M8A-V4.7` passed mechanical acceptance. It did not pass product usability
acceptance.

The previous validation proved that playback policy, truth badges, state labels,
basic non-obstruction rectangles, and source-boundary scans existed. That is not
enough for a product-facing handover review surface because it did not prove
that a human can reliably read, operate, and understand the handover state in
the scene.

Current failure conclusions:

- right rail controls are not reliably clickable during replay
- likely cause: `renderProductUx()` rebuilds product UX `innerHTML` on each
  replay tick, which can replace controls between pointer down/up or during
  real user interaction
- typography is too small for review, especially state pills, badges, and
  narrow viewport controls
- touch targets are below product interaction expectations
- information architecture remains panel-first; the handover state is separated
  from the connection path, representative actor, and endpoint corridor
- the accepted screenshots do not prove per-state usability
- smoke coverage lacks real pointer clicks, DOM stability checks, minimum
  font-size checks, minimum hit-target checks, and per-state visual checks

The failure is not a data/model failure. It is a product UX and validation
failure on top of the already accepted deterministic display-context model.

## V4.7.1 Correction Scope

`V4.7.1` corrects the product usability layer while preserving the `V4.6D`
truth boundary.

Accepted correction scope:

- add scene-near current-state annotation tied visually to the current
  connection path, representative actor, or endpoint corridor
- make playback, speed, restart, and detail controls stable and reliably
  clickable during active replay
- raise typography and control sizes to readable product-review thresholds
- replace the panel-first right rail with a compact control strip plus
  secondary details sheet
- keep truth-boundary badges present without making the details surface the
  default focus
- upgrade smoke and visual validation from mechanical existence checks to
  product usability checks

The corrected UX must make the current deterministic handover state legible in
the scene first, then expose controls and details without hiding the evidence.

## Non-Goals

`V4.7.1` is not:

- a route change
- an endpoint-pair change
- a precision change
- an actor-set change
- a model-truth change
- a data-source change
- an endpoint selector
- `R2` runtime promotion
- `V5`
- active satellite, active gateway, active path, or active RF handover work
- measured latency, jitter, throughput, continuity, or handover metric work
- native RF handover claim work

`V4.7.1` must not make the scene more impressive by inventing unsupported
operational truth.

## Scene-Near IA Decision

The primary handover state must move from panel-first IA to scene-near IA.

Accepted IA decision:

1. The current state label is rendered near the scene evidence it explains.
2. The annotation visually relates to the current display representative,
   active relation cue, endpoint corridor, or a stable corridor-adjacent anchor.
3. The annotation uses the accepted V4.6D product labels:
   `LEO acquire`, `LEO pressure`, `MEO hold`, `LEO re-entry`, and `GEO guard`.
4. The annotation preserves the accepted V4.6D window id in DOM/test state.
5. The annotation uses display-context language only.

The scene-near annotation must not claim an active serving satellite, active
gateway, active path, real operator handover event, measured performance, or RF
handover. It explains the deterministic display-context state selected by the
normalized replay ratio.

The details sheet may still show the full state explanation, role legend,
truth-boundary lines, and bounded metric classes. It is secondary inspection,
not the primary state surface.

## Layout Strategy

The default layout must prioritize the scene and use a small, stable control
surface.

Accepted layout strategy:

- remove the desktop right rail as the default primary product surface
- use a compact control strip for playback status, play/pause, restart, speed,
  progress, and a details trigger
- keep the strip outside the endpoint corridor and outside required actor/label
  areas
- use a secondary details sheet for truth-boundary detail, role legend, and
  model explanation
- keep the details sheet closed by default
- when the details sheet is open, preserve explicit close behavior and avoid
  changing replay truth
- keep the scene-near state annotation visible when the details sheet is closed
- on narrow viewports, preserve the same IA: compact strip first, sheet second,
  scene-near state visible unless viewport geometry makes it impossible

The corrected layout is accepted only if screenshots prove that the current
state is understandable without opening the details sheet.

## Readability Acceptance Criteria

Future runtime implementation must meet these minimum readability criteria:

- primary scene-near current-state label is at least `16px` computed font size
  on desktop and narrow viewports
- compact strip action text is at least `14px` computed font size
- details sheet body text is at least `14px` computed font size
- truth badges are at least `12px` computed font size and remain readable in
  screenshots
- no product control text may fall below `12px` computed font size
- state labels must not clip, overlap, or require horizontal scrolling
- the longest accepted state label, `LEO re-entry`, must fit in its control and
  scene-near annotation at `1440x900`, `1280x720`, and `390x844`
- line-height must be sufficient for legibility; compressed pills below normal
  reading size are not accepted as product UI
- screenshots must prove that typography remains readable against the globe,
  sky, endpoint corridor, and sheet backgrounds

These are minimums. If the existing design system already uses larger product
sizes when implementation begins, the implementation should use the larger
local standard.

## Clickability Acceptance Criteria

Controls must be stable DOM targets during active replay.

Future runtime implementation must meet these criteria:

- play/pause, restart, speed, details open, and details close controls remain
  clickable during active replay
- real pointer clicks must change runtime state, not just call controller
  methods directly
- controls must not be destroyed and recreated on every replay tick
- stable controls keep their DOM identity across at least `10` consecutive
  replay ticks unless a viewport/layout mode changes
- updating replay progress or labels must patch text/properties in existing
  nodes or use an equivalent stable rendering strategy
- no accepted control has a bounding box smaller than `44x44px` on narrow
  viewport
- no accepted desktop primary control has a bounding box smaller than `36x36px`
- pointer click tests must use actual element coordinates near the center of
  the target and must fail if another surface receives the click
- details sheet opening and closing must remain reliable while the replay is
  playing
- speed buttons must be operable by real clicks and must never expose `240x` in
  normal product controls

Delegated event handling is allowed only if the clicked element remains stable
enough for real pointer interaction. A test that passes by invoking controller
APIs is not sufficient for clickability acceptance.

## Smoke / Visual Validation Upgrades

`V4.7.1` must add validation that catches product usability regressions.

Required smoke upgrades:

- real pointer-click smoke for play/pause, restart, speed change, details open,
  and details close
- DOM stability smoke that captures representative control elements across
  replay ticks and fails if they are rebuilt every frame
- computed font-size smoke for scene-near annotation, strip controls, truth
  badges, and details sheet body copy
- hit-target smoke for primary controls at desktop and narrow viewports
- per-state model-label smoke proving all five V4.6D states still map to the
  accepted product labels
- per-state scene-near annotation smoke proving each state appears near the
  current scene evidence rather than only inside a panel
- forbidden-claim scan retained from V4.6D/V4.7
- raw `itri` side-read and runtime source-boundary scans retained
- route, endpoint pair, precision, actor count, and model id checks retained

Required visual upgrades:

- desktop screenshots at `1440x900` and `1280x720`
- narrow screenshot at `390x844`
- per-state screenshots or visual probes for all five V4.6D states
- visual proof that the compact strip does not cover the endpoint corridor,
  representative relation cue, required actor labels, or Cesium credits
- visual proof that the scene-near annotation does not obscure the actor or path
  evidence it explains
- visual proof that the details sheet is secondary and closed by default
- visual proof that opening the details sheet does not create forbidden claims
  or hide the primary state annotation in an incoherent way

Passing only the old V4.7 smoke is not sufficient for `V4.7.1` acceptance.

## Implementation Phase Breakdown

This SDD is doc-only. If runtime implementation is opened later, it should be
split into small phases:

1. Stable control rendering
   - stop rebuilding interactive controls on every replay tick
   - preserve DOM identity for controls during normal replay updates
   - add pointer-click and DOM-stability smoke before layout refinements
2. Compact control strip and details sheet
   - replace the default desktop right rail with the compact strip
   - keep details in a secondary sheet, closed by default
   - preserve `60x`, `30x`, `120x`, final hold, pause, restart, and debug-only
     `240x` policy
3. Scene-near current-state annotation
   - anchor the current V4.6D product label near the current connection path,
     representative actor, or endpoint corridor
   - validate all five states with per-state probes/screenshots
   - preserve display-context role language
4. Readability and hit-target pass
   - raise CSS typography and target dimensions to the accepted minimums
   - validate computed sizes at the required viewport matrix
   - fix clipping, overlap, or unreadable labels before acceptance
5. Full V4.7.1 acceptance run
   - run upgraded smoke and visual validation
   - keep V4.6D truth-boundary, source-boundary, and forbidden-claim scans clean
   - record screenshots and validation output under the existing repo
     validation conventions

Each phase must preserve the accepted route, endpoint pair, precision, actor
set, source boundary, and model truth.

## Blockers / Not Allowed

Blocked or not allowed in `V4.7.1`:

- changing route from `/?scenePreset=regional&m8aV4GroundStationScene=1`
- changing endpoint pair from
  `taiwan-cht-speedcast-singapore-operator-family-2026-04-26`
- changing precision from `operator-family-only`
- changing actor set from `6` LEO, `5` MEO, `2` GEO display-context actors
- changing model id from `m8a-v4.6d-simulation-handover-model.v1`
- changing model truth from `simulation-output-not-operator-log`
- side-reading raw `itri` or live external source data at runtime
- adding endpoint selector UI
- promoting `R2` into runtime
- adding `R2` runtime, `V5`, active satellite, active gateway, active path, or
  native RF handover behavior
- adding measured metric labels or fields such as `ms`, `Mbps`, `Gbps`, or
  measured percentages
- treating the old right rail as accepted merely because old mechanical smoke
  passed
- treating controller-method smoke as evidence of real clickability
- accepting tiny typography or touch targets as visual polish issues

Any implementation that needs one of these changes is outside `V4.7.1` and
requires a separate accepted SDD.

## Whether Runtime Implementation Is Ready To Open

Runtime implementation is not opened by this document or by this doc-only task.

After this SDD is accepted, a separate explicit runtime implementation prompt
may open `V4.7.1` only if it is limited to the correction scope above:

- stable clickable controls
- compact strip and secondary details sheet
- scene-near current-state annotation
- readability and hit-target correction
- upgraded smoke and visual validation

There is no data, route, endpoint, actor, model, or truth-boundary blocker for
that correction implementation. The implementation gate remains closed for any
endpoint selector, `R2` runtime, `V5`, active service claim, measured metric
claim, or native RF handover claim.
