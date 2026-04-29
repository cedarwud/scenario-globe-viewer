# M8A-V4.8 Handover Demonstration UI Information Architecture Plan

Source note: this is a doc-only SDD delta for redesigning the customer-facing
handover demonstration UI information architecture after the accepted
`M8A-V4.7.1` product usability correction. It does not authorize runtime
implementation by itself.

Related final V4.7.1 handoff:
[./m8a-v4.7.1-handover-product-ux-final-handoff.md](./m8a-v4.7.1-handover-product-ux-final-handoff.md).
Related V4.7.1 correction SDD:
[./m8a-v4.7.1-handover-product-ux-correction-plan.md](./m8a-v4.7.1-handover-product-ux-correction-plan.md).
Related V4.6D model contract:
[./m8a-v4.6d-simulation-handover-model-contract.md](./m8a-v4.6d-simulation-handover-model-contract.md).
Related V4.8 Phase 1 final handoff:
[./m8a-v4.8-handover-demonstration-ui-ia-phase1-final-handoff.md](./m8a-v4.8-handover-demonstration-ui-ia-phase1-final-handoff.md).
Related VNext roadmap:
[./m8a-vnext-multi-orbit-simulation-roadmap.md](./m8a-vnext-multi-orbit-simulation-roadmap.md).
Related planning-control handoff:
[./m8a-vnext-planning-control-handoff.md](./m8a-vnext-planning-control-handoff.md).

## Status

- planning/control SDD delta
- doc-only
- current as of 2026-04-29
- intended phase: `M8A-V4.8` handover demonstration UI IA redesign
- Phase 1 runtime implementation completed at commit
  `8c846a4 Implement M8A V4.8 Phase 1 UI IA runtime seam`
- remaining runtime phases: not open
- latest accepted runtime baseline: `M8A-V4.7.1` closed at head
  `a48b0a6 Clean V4.7.1 accepted runtime status`
- latest doc closeout commit before this plan:
  `ba35008 Record M8A V4.7.1 final handoff`
- initial V4.8 planning commit:
  `0cf2b86 Add M8A V4.8 handover demonstration UI IA plan`

## Current Understanding

`M8A-V4.7.1` is accepted for the correction scope it opened: stable controls,
readable typography, compact strip, secondary sheet, scene-near annotation, and
stronger smoke coverage. That does not mean the handover demonstration UI is
ready for customer acceptance.

User review after `V4.7.1` identified a larger product-comprehension failure:

- satellite motion appears as left/right oscillation rather than credible orbit
  passage
- the scene-near annotation can look like it points to a satellite even when
  its visual relationship is not convincing
- the details sheet is mostly static disclosure, not dynamic handover review
  content
- the existing Cesium timeline already provides a temporal surface, so the
  product UI should not add a redundant timeline/progress row without a clear
  reason
- secondary metadata chips and repeated badges do not explain the current
  handover state
- the frontend does not clearly separate fixed scenario facts from dynamic
  handover-state facts

This is not a data/source/model expansion request. It is a demonstration UI
information architecture problem on top of the accepted single scenario.

## Product UX Problem Statement

The accepted scene must communicate the deterministic `V4.6D` handover state
as a reviewable demonstration. A reviewer should be able to answer, without
guessing:

- what state is currently being shown
- which scene cue supports that state
- which actor is the display representative
- which actors are candidate or fallback context
- what changed from the previous state
- what to watch next
- which information is fixed scenario truth versus dynamic simulation output
- which claims are intentionally not being made

The current UI does not meet that bar because much of the visible information
is static or redundant, while the dynamic handover explanation is too weak.

## Accepted Baseline

`V4.8` must preserve:

- route: `/?scenePreset=regional&m8aV4GroundStationScene=1`
- endpoint pair:
  `taiwan-cht-speedcast-singapore-operator-family-2026-04-26`
- precision: `operator-family-only`
- actor set: `6` LEO, `5` MEO, `2` GEO display-context actors
- model id: `m8a-v4.6d-simulation-handover-model.v1`
- model truth: deterministic display-context state machine, not an operator log
- runtime source boundary: repo-owned projection/module only
- R2 status: read-only evidence/catalog support, not runtime selector

## Non-Goals

`V4.8` is not:

- `V5`
- endpoint expansion
- endpoint selector work
- route expansion
- precision expansion
- actor-set expansion
- source-data expansion
- R2 runtime promotion
- live source read work
- measured metric work
- active satellite, active gateway, active path, or native RF handover work
- a real operator handover event log
- a claim that the viewer has pair-specific teleport path truth

## Information Architecture Decision

`V4.8` must redesign the frontend information model before runtime changes are
opened.

The UI must separate information into three classes:

1. Fixed scenario facts
2. Dynamic handover-state facts
3. Disclosure / non-claim facts

Each visible text element must belong to one class. A text element that does
not help review the current state, control the replay, or preserve the truth
boundary should be removed or demoted.

## Fixed Information Contract

Fixed information may be visible persistently only when it helps orientation.
Otherwise it belongs in a secondary disclosure surface.

Fixed facts:

- scenario: Taiwan/CHT + Speedcast Singapore
- precision: operator-family only
- model: simulation output, not operator log
- actor truth: display-context actors only
- endpoint truth: no exact site or same-site proof
- route/source truth: repo-owned projection/module
- non-claims: no active satellite, gateway, path, measured metric, or native RF
  handover claim

Fixed information should not consume the primary demonstration band if it does
not change during replay. Repeated static badges should be consolidated into a
small persistent truth affordance plus inspectable disclosure.

## Dynamic Handover Information Contract

Dynamic information must update with every `V4.6D` window.

Every state must expose:

- current product label
- current `V4.6D` window id
- display representative actor id and label
- candidate context actor ids and labels
- fallback context actor ids and labels
- state purpose, written as display-context explanation
- what changed from the previous state
- what to watch in the scene now
- next-state hint
- relation cue role currently emphasized

Dynamic copy must be state-specific. A details sheet that shows the same body
copy throughout the replay is not accepted for `V4.8`.

## State Review Content Model

The runtime should expose or derive a review view-model for each `V4.6D` window.
The view-model must remain display-context language and must not claim active
service truth.

| Window id | Product label | Review purpose | What changed | What to watch |
| --- | --- | --- | --- | --- |
| `leo-acquisition-context` | `LEO acquire` | Establish the initial LEO display context for the accepted endpoint corridor. | Replay begins with LEO representative context emphasized. | Representative LEO display cue and endpoint corridor relationship. |
| `leo-aging-pressure` | `LEO pressure` | Show deterministic pressure on the LEO context, not a measured degradation event. | The state moves from initial acquire context to pressure context. | Candidate context and relation cue emphasis, without measured metric claims. |
| `meo-continuity-hold` | `MEO hold` | Show MEO display context as continuity hold within the simulation model. | The representative context changes from LEO pressure to MEO hold. | MEO representative cue and how candidate/fallback context remains secondary. |
| `leo-reentry-candidate` | `LEO re-entry` | Show LEO returning as a candidate display context after the MEO hold. | LEO context reappears as the review focus. | LEO candidate/representative cue and transition relationship. |
| `geo-continuity-guard` | `GEO guard` | Show GEO as continuity guard context, not active failover proof. | The display context enters the final guard window. | GEO guard cue and final hold semantics. |

Implementation may refine copy, but it must preserve this state-specific
structure and truth boundary.

## V4.8 Review View-Model Acceptance Table

The implementation must expose or derive the following review view-model from
the existing `V4.6D` model. These ids are accepted display-context ids only;
they are not active satellite, gateway, or path truth.

| Window id | Representative actor | Candidate context actors | Fallback actors | Default scene anchor | Primary relation cue |
| --- | --- | --- | --- | --- | --- |
| `leo-acquisition-context` | `oneweb-0386-leo-display-context` | `oneweb-0537-leo-display-context`, `oneweb-0701-leo-display-context`, `o3b-mpower-f6-meo-display-context` | `st-2-geo-continuity-anchor`, `ses-9-geo-display-context` | representative actor if visible; otherwise display relation cue | `displayRepresentative`; `candidateContext` secondary |
| `leo-aging-pressure` | `oneweb-0537-leo-display-context` | `oneweb-0012-leo-display-context`, `oneweb-0249-leo-display-context`, `o3b-mpower-f1-meo-display-context`, `o3b-mpower-f2-meo-display-context` | `st-2-geo-continuity-anchor`, `ses-9-geo-display-context` | representative actor if visible; otherwise display relation cue | `displayRepresentative`; `candidateContext` secondary |
| `meo-continuity-hold` | `o3b-mpower-f6-meo-display-context` | `o3b-mpower-f1-meo-display-context`, `o3b-mpower-f2-meo-display-context`, `o3b-mpower-f4-meo-display-context`, `o3b-mpower-f3-meo-display-context`, `oneweb-0702-leo-display-context` | `st-2-geo-continuity-anchor`, `ses-9-geo-display-context` | representative MEO actor if visible; otherwise display relation cue | `displayRepresentative`; `candidateContext` secondary |
| `leo-reentry-candidate` | `oneweb-0702-leo-display-context` | `oneweb-0012-leo-display-context`, `oneweb-0249-leo-display-context`, `oneweb-0386-leo-display-context`, `o3b-mpower-f4-meo-display-context` | `st-2-geo-continuity-anchor`, `ses-9-geo-display-context` | representative LEO actor if visible; otherwise display relation cue | `displayRepresentative`; `candidateContext` secondary |
| `geo-continuity-guard` | `st-2-geo-continuity-anchor` | `ses-9-geo-display-context`, `o3b-mpower-f3-meo-display-context`, `oneweb-0701-leo-display-context` | `st-2-geo-continuity-anchor`, `ses-9-geo-display-context` | GEO guard cue or representative GEO anchor | `displayRepresentative`; GEO guard cue secondary |

Acceptance requirements:

- inspector fields must match the accepted ids above for each state
- scene-anchor metadata must record the selected anchor type and selected actor
  or relation cue id
- fallback state labels must record that no scene anchor is claimed
- tests must fail if the UI shows a representative/candidate/fallback id that
  differs from the current `V4.6D` window

## Timeline And Time Display Policy

The UI must avoid duplicate timeline semantics.

Accepted policy:

- the Cesium bottom timeline remains the primary temporal scrubber when it is
  visible
- the product UI must not add a second progress/timeline row that duplicates
  the bottom timeline
- product controls may show play/pause, speed, restart, and state count
  affordances
- replay UTC or simulated review time belongs in the details inspector unless
  the bottom timeline is hidden or unavailable
- narrow viewport may use a compact time fallback only if the bottom timeline
  is not usable, and the fallback must be labeled as a fallback
- if a product time readout remains visible, it must explain a distinct
  product purpose, such as `State 3 of 5`, not just duplicate progress

Allowed visible product temporal elements:

- `Play` / `Pause`
- `Restart`
- speed selector for accepted product speeds
- current state label
- `State N of 5`
- inspector-only replay UTC or simulated review time
- narrow fallback time only when the bottom Cesium timeline is not usable

Denied visible primary product temporal elements while the Cesium timeline is
visible:

- a second progress bar, range slider, scrubber, or timeline row
- a visible `role="progressbar"` product surface
- a product row whose main purpose is elapsed/total replay progress
- duplicate percent-complete or progress-ratio text

Hidden or test-only progress seams are allowed only if they are not visible
product UI, not keyboard focus targets, and not presented as a second timeline.

`V4.8` acceptance must fail if the top UI and bottom timeline both present the
same progress semantics as primary surfaces.

## Details / Inspector Policy

The details surface must become a dynamic handover review inspector, not a
mostly static disclosure sheet.

The inspector must show:

- current state label and window id
- state-specific review purpose
- display representative actor
- candidate context actors
- fallback context actors
- what changed from previous state
- what to watch next
- scene cue mapping
- truth boundary summary

The disclosure copy remains required, but it must be secondary. It should not
replace dynamic handover explanation.

## Scene Evidence Mapping Policy

Every scene-near label or callout must map to a concrete visual cue.

Accepted anchor targets:

- display representative actor entity, if visibly projected and not occluded
- display relation cue, if the relation cue is the primary state evidence
- endpoint corridor-adjacent anchor, if the state is about the corridor rather
  than one actor
- GEO guard cue, during the guard state

Rejected behavior:

- a floating annotation that appears to identify a satellite but is not
  geometrically tied to that satellite or cue
- an annotation whose connector line does not point toward the recorded anchor
- an annotation that claims or implies active serving satellite identity
- an annotation that stays visually near the wrong actor after the state changes

If no reliable scene anchor is available at a viewport, the UI must fall back
to a clearly non-scene state label in the control/inspector surface. It must
not pretend to be anchored to a satellite.

Connector geometry acceptance:

- if a callout claims a scene anchor, its connector endpoint must land within
  `24px` of the projected actor/cue/corridor anchor on desktop
- narrow viewport may use `32px` because touch-safe spacing can force larger
  offsets
- the connector must point toward the recorded anchor; tests must fail if the
  connector points away from the anchor quadrant
- the callout must not intersect the selected cue protection rectangle:
  `96x72px` around actor/cue anchors on desktop and `112x88px` on narrow
- the inspector or sheet must not intersect the selected cue protection
  rectangle when open

Fallback rule:

- if the selected anchor is offscreen, behind the globe, hidden by another
  accepted UI surface, or outside the connector threshold, the UI must set an
  explicit fallback/test seam such as `data-scene-anchor-state="fallback"`
- fallback labels must not render connector lines
- fallback labels must not use copy that implies the label is attached to a
  satellite or active path

## Orbit Motion Policy

The demonstration must not make display-context satellites look like they are
oscillating left and right across a short segment unless that motion is
explicitly explained and accepted as a display abstraction. For customer
handover review, the default accepted direction is credible orbit passage.

Preferred implementation directions:

1. Use source-propagated TLE positions for visual actor motion when the camera
   and label strategy can keep the accepted endpoint corridor reviewable. This
   means using TLE lineage already embedded in the repo-owned projection/module;
   it must not introduce live source reads or runtime reads of raw `itri`
   packages.
2. If viewer-owned display tracks are still required for readability, replace
   ping-pong interpolation with a monotonic display pass or wrapped path that
   looks like orbit passage, and label it as display-context projection.
3. Keep GEO near-fixed or slow guard behavior if it remains clearly labeled as
   display context and does not imply active service.

Rejected for `V4.8`:

- cosine/ease start-stop-start motion as the primary visible satellite motion
- repeated left/right shuttle motion over the same segment during the product
  replay
- motion that visually contradicts the handover story
- hiding the motion problem behind static text or disclosure

Any motion correction must preserve the accepted `V4.6D` state selection
semantics. The model may still use normalized replay ratio for state windows.

Motion sampling acceptance:

- sample each non-GEO representative actor at least `8` times across its
  active window
- accepted product motion must not traverse a short segment and then reverse
  over the same segment within that same window
- tests must fail on an A-B-A pattern where a later sample returns within
  `20%` of the starting projected segment after moving at least `40%` across
  that segment
- if a wrapped display path is used, tests must identify the wrap seam and
  prove the actor advances through the seam instead of reversing direction
- if source-propagated motion is used, tests must record that positions came
  from the repo-owned projection/module lineage, not from a live source read
- GEO guard motion may remain near-fixed, but tests must treat it separately
  from LEO/MEO passage validation

## Layout Strategy

Desktop:

- primary scene remains dominant
- control strip is reduced to actions and current state, not timeline metadata
- dynamic inspector may open as a side or sheet surface only if it does not
  cover the selected scene cue
- fixed truth information is consolidated and inspectable
- each state must be understandable with inspector closed at a high level and
  with inspector open in detail

Narrow viewport:

- no right rail primary surface
- no duplicate timeline if the bottom timeline remains usable
- compact state/control strip contains only current state and essential actions
- dynamic inspector opens on demand
- scene-near annotation is used only if it can anchor honestly and legibly

## Visual Validation Criteria

Required viewport matrix:

- `1440x900`
- `1280x720`
- `390x844`

Required visual checks:

- one screenshot or visual probe per `V4.6D` state per desktop matrix, with
  narrow coverage for at least initial, middle, and final states
- narrow viewport must also have lightweight all-five-state DOM/geometry probes
  even if not every narrow state produces a saved screenshot
- no duplicate primary timeline/progress semantics
- dynamic inspector content changes across all five windows
- scene-near annotation either anchors to the correct cue or is absent with a
  clear non-scene fallback
- annotation connector geometry points toward the recorded anchor
- selected actor/cue remains visible and is not covered by inspector surfaces
- fixed truth information remains visible or inspectable
- no static metadata row is accepted as the main handover explanation
- satellite motion samples do not show accepted product motion as a short
  left/right shuttle

## Smoke Validation Criteria

Required smoke additions:

- per-state dynamic content assertions for all five `V4.6D` windows
- fixed-versus-dynamic DOM classification checks
- visible text classification seam: every accepted visible product text node
  must expose `data-m8a-v48-info-class="fixed"`, `"dynamic"`,
  `"disclosure"`, or `"control"`, or an equivalent test seam with the same
  categories
- assertion that details/inspector body text changes when the handover state
  changes
- assertion that each state maps to a specific display representative,
  candidate context, fallback context, and scene cue
- duplicate timeline scan: fail if product UI exposes a second primary
  progress/timeline while Cesium timeline is visible
- duplicate timeline allow/deny scan based on the policy above
- scene-anchor geometry check against Cesium canvas coordinates for the chosen
  actor or relation cue
- connector endpoint threshold check at desktop and narrow viewport sizes
- selected cue protection-rectangle obstruction check while the inspector is
  closed and while it is open
- fallback check proving non-anchored labels do not claim a scene anchor
- motion sampling check proving accepted product motion is not ping-pong
  display shuttle behavior
- existing pointer-click, DOM stability, font-size, hit-target,
  source-boundary, forbidden-claim, and route/actor/model checks remain
  mandatory

## Implementation Phase Breakdown

This SDD is doc-only. If runtime implementation is opened later, use these
phases:

1. UI information inventory
   - classify every current visible text element as fixed, dynamic, control, or
     disclosure
   - remove or demote duplicate timeline/progress and low-value static metadata
   - define the runtime view-model shape for dynamic handover review content
2. Dynamic handover inspector
   - replace static details content with state-specific review sections
   - show representative, candidate, fallback, what changed, what to watch, and
     next-state hint
   - keep disclosure secondary and inspectable
3. Scene evidence mapping correction
   - choose the accepted anchor target per state
   - make annotation/callout geometry honestly map to the cue
   - fall back to non-scene state labels when anchoring is unreliable
4. Orbit motion correction
   - remove the visual ping-pong track behavior
   - choose source-propagated motion or monotonic display pass
   - preserve `V4.6D` state timing and truth boundary
5. Layout and viewport pass
   - reduce top UI to meaningful controls/state only
   - preserve scene visibility and inspector non-obstruction
   - handle narrow viewport without reintroducing a tiny HUD or right rail
6. Acceptance validation
   - add per-state dynamic-content, anchor, duplicate-timeline, and motion
     checks
   - regenerate visual evidence
   - rerun V4.7.1 regression tests and V4.6D/V4.6E/V4.6A/V4.6B smoke as
     needed

## Blockers / Not Allowed

Blocked unless a future accepted SDD explicitly changes scope:

- endpoint selector
- endpoint expansion
- new endpoint pair
- new data source
- live external source read
- actor-set expansion
- precision expansion beyond operator-family-only
- model truth expansion beyond deterministic display-context state machine
- active satellite/gateway/path/native RF handover claims
- measured latency/jitter/throughput/continuity claims
- R2 runtime promotion
- V5 scenario-selection work
- frontend copy that implies real operator logs or measured handover events

## Runtime Opening State

Phase 1 runtime implementation is closed at commit
`8c846a4 Implement M8A V4.8 Phase 1 UI IA runtime seam`.

Remaining `V4.8` runtime implementation is not open from this document alone.

Remaining runtime phases may be opened only after:

- this SDD is explicitly accepted
- the user explicitly opens the next `V4.8` runtime phase
- the implementation prompt limits scope to demonstration UI IA, dynamic
  inspector content, scene evidence mapping, orbit motion display correction,
  layout simplification, and validation upgrades
- route, endpoint pair, precision, actor set, source boundary, and `V4.6D`
  model truth remain unchanged

No further execution prompt is included here because this document remains the
planning surface, not authorization for remaining runtime phases.
