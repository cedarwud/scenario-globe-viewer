# M8A-V4.9 Product Comprehension And Progressive Disclosure Plan

Source note: this is a doc-only SDD delta for improving the customer-facing
comprehension of the accepted `M8A-V4` ground-station multi-orbit handover
scene after the closed `M8A-V4.8` Phase 1-3 runtime slices. It does not
authorize runtime implementation by itself.

Related VNext roadmap:
[./m8a-vnext-multi-orbit-simulation-roadmap.md](./m8a-vnext-multi-orbit-simulation-roadmap.md).
Related planning-control handoff:
[./m8a-vnext-planning-control-handoff.md](./m8a-vnext-planning-control-handoff.md).
Related V4.8 SDD:
[./m8a-v4.8-handover-demonstration-ui-ia-plan.md](./m8a-v4.8-handover-demonstration-ui-ia-plan.md).
Related V4.8 Phase 3 final handoff:
[./m8a-v4.8-handover-demonstration-ui-ia-phase3-final-handoff.md](./m8a-v4.8-handover-demonstration-ui-ia-phase3-final-handoff.md).
Related V4.9 Slice 1 final handoff:
[./m8a-v4.9-product-comprehension-slice1-final-handoff.md](./m8a-v4.9-product-comprehension-slice1-final-handoff.md).
Related V4.9 Slice 2 final handoff:
[./m8a-v4.9-product-comprehension-slice2-final-handoff.md](./m8a-v4.9-product-comprehension-slice2-final-handoff.md).
Related V4.9 Slice 3 final handoff:
[./m8a-v4.9-product-comprehension-slice3-final-handoff.md](./m8a-v4.9-product-comprehension-slice3-final-handoff.md).
Related V4.6D model contract:
[./m8a-v4.6d-simulation-handover-model-contract.md](./m8a-v4.6d-simulation-handover-model-contract.md).

## Status

- planning-control SDD delta
- doc-only
- current as of 2026-04-30
- intended phase: `M8A-V4.9` product comprehension and progressive disclosure
- no runtime implementation authority by itself
- starts from the accepted `M8A-V4.8` Phase 3 runtime baseline
- accepted by planning/control for runtime Slice 1 on 2026-04-29
- Runtime Slice 1 is closed for product copy/view-model inventory and
  persistent layer correction
- accepted by planning/control for runtime Slice 2 on 2026-04-30
- Runtime Slice 2 is closed for scene-near meaning layer correction
- accepted by planning/control for runtime Slice 3 on 2026-04-30
- Runtime Slice 3 is closed for transition event layer
- no remaining `V4.9` runtime slice is open from this SDD by itself

## Current Understanding

`M8A-V4.8` fixed important structural problems:

- the details sheet is now state-specific instead of fully static
- scene-near annotation geometry records whether a scene anchor is reliable
- non-GEO display-context actor motion no longer reads as short ping-pong
  shuttle motion
- route, endpoint pair, precision, actor set, source boundary, `R2` read-only
  boundary, and `V4.6D` model truth remain preserved

Those fixes still do not make the experience product-complete.

Recent user review and viewport inspection show a comprehension gap:

- the scene has enough data, but the first read does not explain what the user
  should conclude from the handover state
- `Details` still contains too much engineering-facing data such as actor ids,
  cue ids, and long context lists
- truth badges consume persistent space even when they do not explain the
  current state
- narrow viewport badges and controls can wrap into hard-to-read fragments
- opening details can dominate or obscure the scene instead of supporting it
- current validation proves seams, state mapping, and geometry thresholds, but
  does not prove that a product reviewer can understand the handover story

This is not a source, endpoint, actor, or model expansion. It is a product
comprehension and information-disclosure problem on top of the accepted single
scenario.

## External Reference Patterns

These references are design inputs, not authority surfaces. They do not
override repo-local SDDs, ADRs, or ITRI truth boundaries.

- NASA Eyes / Eyes on the Earth
  - scene-first interactive 3D exploration
  - satellite and data context stays visually grounded in the globe
  - deeper data appears after the user chooses what to inspect
- NASA DSN Now / Mars Relay Network
  - communication state is summarized before technical detail
  - clicking a ground/space asset reveals the live-link or relay details
  - data freshness and non-ideal data caveats remain explicit
- LeoLabs / Slingshot space-operations positioning
  - operational products move from sensing to fused understanding to decision
  - the user needs decision context, not only object visibility
- ArcGIS Dashboards, MarineTraffic, and Flightradar-style live maps
  - maps remain the primary workspace
  - colors, icons, and short labels communicate category/status at first glance
  - object details open only after selection or explicit inspection
- Kepler.gl and Grafana
  - temporal playback and event annotations are separate from details
  - annotations mark moments or state changes without replacing the main view
  - tooltip/detail surfaces are scoped and contextual

Adopted principle:

> The viewer should first communicate the current handover meaning in the
> scene, then progressively reveal supporting evidence and limitations. It
> should not require a user to read engineering metadata before understanding
> what is happening.

## Accepted Baseline

`V4.9` must preserve:

- route: `/?scenePreset=regional&m8aV4GroundStationScene=1`
- endpoint pair:
  `taiwan-cht-speedcast-singapore-operator-family-2026-04-26`
- endpoint A: Taiwan / Chunghwa Telecom multi-orbit ground infrastructure
- endpoint B: Singapore / Speedcast Singapore Teleport
- precision: `operator-family-only`
- actor set: `6` OneWeb `LEO`, `5` O3b mPOWER `MEO`, and `2` `GEO`
  display-context actors
- model id: `m8a-v4.6d-simulation-handover-model.v1`
- model truth: deterministic display-context state machine, not an operator log
- runtime source boundary: repo-owned projection/module only
- R2 status: read-only evidence/catalog support, not runtime selector
- V4.8 Phase 1 UI IA runtime seam
- V4.8 Phase 2 scene evidence mapping behavior
- V4.8 Phase 3 monotonic / wrapped display motion behavior

## Non-Goals

`V4.9` is not:

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
- a redesign of Cesium's native timeline, toolbar, credits, or globe controls

## Product UX Problem Statement

A reviewer opening the accepted route should be able to answer in five seconds,
without opening details:

- what state is currently being shown
- whether the state is `LEO`, `MEO`, or `GEO` focused
- what the state means in plain display-context language
- which scene cue to watch now
- what changes next
- whether the scene is simulation output or measured/operator truth

The current UI can answer these questions only after the user reads multiple
labels, badges, and the details sheet. That fails the product goal.

## Visual Thesis

The product surface should feel like a restrained mission-review viewer:
the globe and orbit actors are the primary workspace, one concise handover
state is the active narrative, and supporting evidence appears only when it
helps the user inspect the current decision.

## Progressive Disclosure Model

`V4.9` must organize all handover information into four visible or inspectable
layers.

### Layer 1 - Persistent Review Layer

Purpose:

- keep the user oriented and in control without blocking the scene

Allowed default content:

- current product state label
- `State N of 5`
- play/pause
- restart
- accepted speed choices: `30x`, `60x`, `120x`
- one compact truth-boundary affordance
- details/inspect trigger

Denied default content:

- full actor id lists
- full candidate/fallback lists
- cue ids
- selected anchor metadata
- repeated long truth badges that do not explain the current state
- duplicate progress/timeline semantics while Cesium timeline is visible

### Layer 2 - Scene-Near Meaning Layer

Purpose:

- make the current state meaningful in relation to the visual cue

Allowed content:

- one short state explanation near the reliable scene cue
- one scene cue label such as `MEO continuity context`
- a compact `LEO`, `MEO`, or `GEO` orbit-class token
- connector only when geometry is reliable

Denied content:

- actor ids
- long proof text
- active-serving language
- scene-near labels when the anchor is unreliable

If the anchor is unreliable, the UI must fall back to the persistent layer and
must not pretend the label is attached to a satellite or path.

### Layer 3 - Transition Event Layer

Purpose:

- explain state changes without forcing the user to open details

Accepted behavior:

- when the active `V4.6D` window changes, show a short transition annotation
  or toast for about `2-3s`
- copy should be concise, for example:
  `LEO pressure -> MEO hold`
  `Continuity context shifts to MEO display actor`
- transition events must not pause replay, block controls, or cover the
  selected scene cue
- transition events must not be the only way to learn the current state

Denied behavior:

- toast as a persistent status panel
- toast carrying full truth-boundary disclosure
- toast carrying actor ids or raw metadata
- snackbar/toast patterns that require user action for routine state changes

### Layer 4 - Inspector / Details Layer

Purpose:

- support deliberate review after the user chooses to inspect

Default inspector content should be:

1. Current state
2. Why this state exists
3. What changed from previous state
4. What to watch now
5. What happens next
6. Evidence boundary / non-claims

Actor/cue metadata policy:

- human-readable actor names may be shown only when they support the current
  explanation
- raw actor ids, cue ids, selected anchor ids, and long candidate/fallback
  arrays must move into a collapsed debug/evidence section
- the collapsed debug/evidence section must be closed by default and clearly
  labeled as implementation evidence, not primary product explanation

Truth-boundary policy:

- truth boundary remains visible or one click away
- disclosure copy must be shorter in the first inspector view
- the full non-claim list may live in a secondary disclosure section
- disclosure must never replace the dynamic handover explanation

## Per-State Product Copy Contract

The exact runtime wording may be refined, but every state needs a short
first-read message and a longer inspector explanation.

| Window id | Product label | First-read message | Watch cue | Transition role |
| --- | --- | --- | --- | --- |
| `leo-acquisition-context` | `LEO acquire` | `LEO display context establishes the first review focus.` | representative LEO cue and endpoint corridor | start of review |
| `leo-aging-pressure` | `LEO pressure` | `LEO context is under simulated pressure, not measured degradation.` | candidate context cue near LEO representative | pressure before continuity shift |
| `meo-continuity-hold` | `MEO hold` | `MEO display context holds continuity in the simulation.` | MEO representative cue | continuity hold |
| `leo-reentry-candidate` | `LEO re-entry` | `LEO returns as a candidate display context.` | LEO candidate/representative cue | re-entry candidate |
| `geo-continuity-guard` | `GEO guard` | `GEO guard context closes the review, not active failover proof.` | GEO guard cue | final guard |

Copy constraints:

- keep first-read messages under `90` characters where practical
- use display-context language
- do not use active serving, active gateway, teleport path, measured metric, or
  native RF handover phrasing
- avoid repeating `display-context` so often that it becomes noise; keep the
  truth affordance nearby for the boundary

## Information Placement Table

| Information | Default location | Secondary location | Never default |
| --- | --- | --- | --- |
| current state label | persistent layer and scene-near layer | inspector header | hidden-only |
| `State N of 5` | persistent layer | inspector header | toast-only |
| state meaning | scene-near layer | inspector purpose | raw metadata section |
| state transition | transition event layer | inspector notes | persistent badge row |
| play/restart/speed | persistent layer | none | details-only |
| endpoint pair | compact persistent or scene label | inspector scenario facts | full disclosure paragraph |
| truth boundary | compact affordance | inspector disclosure | hidden-only |
| representative actor name | scene-near if useful | inspector | persistent badge row |
| candidate/fallback actors | not default | inspector summary | long always-visible list |
| actor ids and cue ids | never default | collapsed debug/evidence | primary inspector body |
| non-claim list | compact summary | expandable disclosure | scene-near callout |

## Layout Requirements

Desktop:

- scene remains dominant
- persistent layer should occupy one predictable region, preferably top-right or
  another reserved area that does not cover the endpoint corridor, selected
  cue, Cesium timeline, or credits
- scene-near label may appear only when connector geometry is reliable
- inspector may open as a right sheet or side surface only if it does not hide
  the selected scene cue or endpoint corridor

Narrow viewport:

- persistent layer must not consume the upper half of the screen
- controls and truth affordance must not wrap into unreadable fragments
- `simulation output`, `operator-family precision`, and
  `display-context actors` should collapse into a compact truth button or
  abbreviated chips rather than three full-width persistent badges
- inspector should behave like an on-demand sheet with a stable close target
- scene-near label should be omitted when it would collide with controls,
  endpoint labels, or Cesium timeline/credits

## Validation Philosophy

Existing V4.8 tests are necessary but insufficient. They prove that runtime
state and geometry contracts exist. `V4.9` must also prove product
comprehension.

Required new validation categories:

1. First-read comprehension checks
2. Progressive-disclosure placement checks
3. Narrow viewport text-fit checks
4. Transition event checks
5. Inspector content demotion checks
6. Visual evidence screenshots

## Smoke Acceptance Criteria

Future runtime implementation must add or update smoke tests to prove:

- persistent layer contains current state, state ordinal, controls, compact
  truth affordance, and details trigger
- persistent layer does not expose actor ids, cue ids, or long candidate/fallback
  arrays
- scene-near label text is under the accepted first-read length and maps to the
  active `V4.6D` window
- transition event appears when the handover window changes and disappears
  within the accepted duration
- transition event does not block play/pause, restart, speed, or details
  controls
- details inspector first view contains `Current state`, `Why`, `Changed`,
  `Watch`, `Next`, and `Boundary` or equivalent labels
- raw actor ids, cue ids, anchor metadata, and full candidate/fallback arrays
  are absent from the primary inspector body
- debug/evidence metadata is available only in a collapsed section if retained
- truth-boundary disclosure remains visible or inspectable
- all visible product text has valid info classification
- visible forbidden-claim scan remains clean
- route, endpoint pair, precision, actor set, source boundary, and `V4.6D`
  model truth remain unchanged

## Visual Acceptance Criteria

Required viewport matrix:

- `1440x900`
- `1280x720`
- `390x844`

Required visual evidence:

- default view with inspector closed for all five states at desktop size
- narrow default screenshots for initial, middle, and final states
- inspector-open screenshot at desktop and narrow size
- transition-event screenshot or frame probe for at least two state changes

Visual checks must fail if:

- persistent controls or badges obscure the endpoint corridor or selected cue
- narrow truth badges wrap into unreadable fragments
- details sheet covers most of the narrow viewport before the user can still
  identify the current state
- scene-near callout claims an anchor while visually detached from the cue
- the primary inspector body is dominated by ids and metadata
- Cesium timeline, animation controls, credits, or native toolbar become
  unusable

## Implementation Phase Breakdown

This SDD is the product-comprehension planning authority. Runtime
implementation remains phase-gated. Slice 1, Slice 2, and Slice 3 have been
opened and closed; the remaining phases require a new explicit
planning/control decision.

1. Product copy and view-model inventory - closed by Runtime Slice 1
   - define first-read and inspector copy per state
   - classify every current visible text element as persistent, scene-near,
     transition, inspector, disclosure, or debug/evidence
   - decide which current fields are demoted from primary inspector view
2. Persistent layer correction - closed by Runtime Slice 1
   - reduce the control strip to state, controls, compact truth affordance, and
     details trigger
   - collapse narrow truth badges into an inspectable affordance
   - preserve stable control rendering and clickability
3. Scene-near meaning layer correction - closed by Runtime Slice 2
   - shorten state annotation copy
   - show orbit-class/state meaning only when anchor geometry is reliable
   - preserve fallback behavior for unreliable anchors
4. Transition event layer - closed by Runtime Slice 3
   - add window-change event annotations/toasts
   - keep them short-lived, non-blocking, and source-aligned
5. Inspector redesign
   - move primary inspector body to Why / Changed / Watch / Next / Boundary
   - demote ids and raw cue metadata into a collapsed debug/evidence section
   - keep truth-boundary disclosure concise by default
6. Product comprehension validation
   - add smoke checks for first-read content and metadata demotion
   - add visual evidence across the viewport/state matrix
   - retain V4.8 anchor/motion/source-boundary regression coverage

## Runtime Opening Conditions

Runtime implementation may open only after:

- this SDD is explicitly accepted
- [m8a-v4.8-handover-demonstration-ui-ia-phase3-final-handoff.md](./m8a-v4.8-handover-demonstration-ui-ia-phase3-final-handoff.md)
  is read as the latest runtime closeout state
- the user explicitly opens a `V4.9` runtime implementation phase
- implementation scope is limited to product comprehension, progressive
  disclosure, copy, layout, and validation for the accepted single scenario
- route, endpoint pair, precision, actor set, source boundary, `R2` read-only
  boundary, and `V4.6D` model truth remain unchanged

These conditions were met for Runtime Slice 1, Runtime Slice 2, and Runtime
Slice 3. They must be re-applied for any future `V4.9` runtime slice.

## Current Runtime Closeout

Runtime Slice 1 is closed by
[m8a-v4.9-product-comprehension-slice1-final-handoff.md](./m8a-v4.9-product-comprehension-slice1-final-handoff.md).

Runtime Slice 2 is closed by
[m8a-v4.9-product-comprehension-slice2-final-handoff.md](./m8a-v4.9-product-comprehension-slice2-final-handoff.md).

Runtime Slice 3 is closed by
[m8a-v4.9-product-comprehension-slice3-final-handoff.md](./m8a-v4.9-product-comprehension-slice3-final-handoff.md).

Accepted result:

- product copy/view-model inventory exists for the five accepted `V4.6D`
  windows
- persistent layer default content is limited to current state, state ordinal,
  playback controls, accepted speed choices, compact truth affordance, and
  details trigger
- long truth badges, actor ids, cue ids, selected anchor ids, and long
  candidate/fallback arrays are not default-visible in the persistent layer
- scene-near meaning maps to the active `V4.6D` window when existing V4.8
  anchor geometry is reliable
- unreliable anchors fall back to persistent wording with explicit no-scene
  attachment and no connector
- transition event appears only after active `V4.6D` window changes, remains
  short-lived, and does not block persistent controls
- `npm run test:m8a-v4.8` and `npm run test:m8a-v4.9` were reported passing
- route, endpoint pair, precision, actor set, source boundary, `R2` read-only
  boundary, and `V4.6D` model truth remain unchanged

## Blocked Unless A Future SDD Changes Scope

- endpoint selector
- endpoint expansion
- new endpoint pair
- new source data
- live external source read
- actor-set expansion
- precision expansion beyond operator-family-only
- active satellite/gateway/path/native RF handover claims
- measured latency/jitter/throughput/continuity claims
- R2 runtime promotion
- V5 scenario-selection work
- copy that implies real operator logs or measured handover events
