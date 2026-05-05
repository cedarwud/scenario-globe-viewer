# M8A-V4.10 Product Experience Redesign Plan

Source note: this is a doc-only SDD for a product-visible redesign of the
accepted `M8A-V4` ground-station multi-orbit handover route. It starts after
the engineering-closed `M8A-V4.9` product comprehension phase, and exists
because the current `V4.9` result is not visually or experientially different
enough from the earlier engineering demo. This SDD does not authorize runtime
implementation by itself.

Related VNext roadmap:
[./m8a-vnext-multi-orbit-simulation-roadmap.md](./m8a-vnext-multi-orbit-simulation-roadmap.md).
Related planning-control handoff:
[./m8a-vnext-planning-control-handoff.md](./m8a-vnext-planning-control-handoff.md).
Related V4.9 SDD:
[./m8a-v4.9-product-comprehension-progressive-disclosure-plan.md](./m8a-v4.9-product-comprehension-progressive-disclosure-plan.md).
Related V4.9 Slice 5 final handoff:
[./m8a-v4.9-product-comprehension-slice5-final-handoff.md](./m8a-v4.9-product-comprehension-slice5-final-handoff.md).
Related V4.8 Phase 3 final handoff:
[./m8a-v4.8-handover-demonstration-ui-ia-phase3-final-handoff.md](./m8a-v4.8-handover-demonstration-ui-ia-phase3-final-handoff.md).
Related V4.6D model contract:
[./m8a-v4.6d-simulation-handover-model-contract.md](./m8a-v4.6d-simulation-handover-model-contract.md).

## Status

- planning-control SDD
- doc-only
- current as of 2026-05-01
- intended phase: `M8A-V4.10` product experience redesign
- no runtime implementation authority by itself
- starts from the accepted `M8A-V4.9` engineering-closed runtime baseline
- exists to correct product-visible experience, not source/model truth

## Product Diagnosis

`M8A-V4.9` is engineering-complete but product-insufficient.

Accepted facts:

- V4.9 closed product copy/view-model inventory, persistent layer correction,
  scene-near meaning, transition events, inspector hierarchy, and visual
  validation seams.
- V4.9 preserved route, endpoint pair, precision, actor set, source boundary,
  `R2` read-only status, and `V4.6D` model truth.
- V4.9 smoke coverage is broad and valuable for regression protection.

Observed product failure:

- the default route still looks too close to the earlier engineering demo
- the first viewport is still read as controls plus labels, not as a deliberate
  handover review product
- product meaning is present, but not visually staged as the main experience
- external reference ideas were translated into data seams and conservative
  overlays instead of visible product behavior
- `Details` and `Truth` use the same inspector entry path; even if technically
  bounded, the distinction is not product-obvious
- tests prove DOM structure and absence of forbidden claims, but do not prove
  that a reviewer can immediately see a product-level redesign

`V4.10` must treat this as a product-visible redesign failure, not a missing
metadata problem.

## Accepted Baseline

`V4.10` must preserve:

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
- `R2` status: read-only evidence/catalog support, not runtime selector
- V4.8 Phase 1 UI IA runtime seam
- V4.8 Phase 2 scene evidence mapping behavior
- V4.8 Phase 3 orbit motion display correction behavior
- V4.9 regression protections for metadata demotion, forbidden claims,
  transition non-blocking behavior, and viewport sanity

## Non-Goals

`V4.10` is not:

- `V5`
- endpoint expansion
- endpoint selector work
- route expansion
- precision expansion
- actor-set expansion
- source-data expansion
- live external source read work
- `R2` runtime promotion
- measured metric work
- active satellite, active gateway, active path, or native RF handover work
- a real operator handover event log
- a claim that the viewer has pair-specific teleport path truth
- a Cesium control redesign unless required to avoid product overlap
- another same-sheet / data-seam-only refactor

## Visual Thesis

The route should feel like a restrained mission-review product: the globe is
the workspace, the active orbit handover state is the visual story, and
inspection is secondary. A reviewer should understand the current handover
moment before touching `Details`.

## External Reference Translation Contract

External references are design inputs only. They do not override the local SDD,
ITRI truth boundaries, or accepted source evidence. `V4.10` must translate each
reference pattern into an observable UI requirement.

| Reference pattern | V4.10 hard requirement | Invalid implementation |
| --- | --- | --- |
| NASA Eyes / Eyes on the Earth scene-first exploration | The scene must be the dominant state carrier; the first viewport must show the handover moment inside the globe/space composition, not primarily inside a floating control strip. | adding more text to the existing top strip |
| NASA DSN Now / relay status summary | The current communication/handover state must have a short operational summary visible before details. | hiding state meaning behind `Details` |
| Flightradar / MarineTraffic object-near scanning | The active object/cue must carry a compact label near the relevant scene position when geometry is reliable. | showing raw ids or long explanation near the object |
| Kepler.gl / Grafana temporal event annotation | State changes must read as events in a visible handover sequence, separate from evidence/debug content. | a transient toast that is easy to miss and has no persistent sequence context |
| Space-operations decision products | The UI must answer what to watch, why the state matters, and what happens next. | only listing model state names or actor ids |

## Product-Visible Delta Requirement

`V4.10` may not close unless default screenshots show a clear difference from
the current `V4.9` route.

Mandatory before/after evidence:

- capture current `V4.9` default at `1440x900`, `1280x720`, and `390x844`
- capture `V4.10` default at the same viewports
- capture one active middle-state transition moment
- capture inspector closed and inspector open states
- compare screenshots in the final handoff with written observations

The difference must be visible without reading test logs or DOM data attributes.

At least four of the following must be true in the default `1440x900` view:

- the active handover state is visually staged in the scene, not just in the top
  strip
- the five-state handover sequence is visible as a product narrative, not only
  as `State N of 5`
- the active orbit class has a clear role treatment that is visible near the
  relevant cue
- the next transition is visible without opening details
- the truth boundary is visible as a compact boundary treatment, not a second
  duplicate details button
- the control strip is visually secondary to the scene narrative
- the inspector is clearly optional and not required for first understanding

## First-Viewport Contract

On route load, without user interaction, a reviewer must be able to answer:

1. What handover review state is active?
2. Which orbit class is the current focus?
3. Which scene cue should I look at?
4. What transition happens next?
5. What is the source/truth boundary?

This answer must come from the visible composition:

- primary scene narrative
- object/cue-near label
- handover sequence rail
- compact boundary affordance
- secondary controls

It must not require:

- opening `Details`
- clicking `Truth`
- reading raw actor ids
- reading a full disclosure paragraph
- inspecting DOM data attributes
- reading Cesium native timeline time stamps

## Layout Target

Desktop target:

```text
+--------------------------------------------------------------------------+
| Secondary controls / compact boundary                                    |
|                                                                          |
|                 SPACE / GLOBE AS PRIMARY WORKSPACE                       |
|                                                                          |
|        active cue label + state meaning near reliable scene cue          |
|                                                                          |
|   handover sequence rail: LEO acquire -> LEO pressure -> MEO hold -> ... |
|                                                                          |
|                                            optional inspector, closed     |
+--------------------------------------------------------------------------+
```

Narrow target:

```text
+--------------------------------------+
| compact state + controls             |
| scene-first globe area                |
| active cue label if reliable          |
| compact handover sequence / next      |
| details as on-demand sheet only       |
+--------------------------------------+
```

Denied layout outcome:

- a right-side sheet or top strip is the most visually dominant element in the
  default state
- the scene label is a small annotation with no narrative hierarchy
- `Details` is required to understand the state
- `Truth` and `Details` are indistinguishable actions
- the product still reads as a test harness with labels

## Interaction Thesis

`V4.10` should use three restrained interaction patterns:

- active-state emphasis: scene cue and sequence rail update together when the
  deterministic window changes
- event continuity: transition movement is visible both as a short event and as
  a persistent sequence position
- inspection on demand: details reveal evidence and boundary, but do not carry
  the first-read story

Motion must be subtle and purposeful. It may use opacity, line weight, connector
emphasis, and short label transitions. It must not use decorative background
effects, animated clutter, or unbounded attention-grabbing motion.

## Product Copy Contract

V4.9 copy remains too engineering-facing. `V4.10` must replace first-read copy
with product utility language.

| Window id | Product title | First-read line | Next line |
| --- | --- | --- | --- |
| `leo-acquisition-context` | `LEO review focus` | `LEO is the simulated review focus for this corridor.` | `Next: watch for pressure before the MEO hold.` |
| `leo-aging-pressure` | `LEO pressure` | `The LEO review context is under simulated pressure.` | `Next: continuity shifts to MEO context.` |
| `meo-continuity-hold` | `MEO continuity hold` | `MEO context is holding continuity in this simulation.` | `Next: LEO returns as a candidate focus.` |
| `leo-reentry-candidate` | `LEO re-entry` | `LEO returns as a candidate review focus.` | `Next: GEO closes the sequence as guard context.` |
| `geo-continuity-guard` | `GEO guard context` | `GEO is shown only as guard context, not active failover proof.` | `Restart to review the sequence again.` |

Copy rules:

- do not use `display context establishes`
- do not use `active serving`, `active gateway`, `active path`, or `real
  handover`
- use `simulated`, `review focus`, `context`, and `guard` deliberately
- keep first-read lines under `80` characters where practical
- avoid showing source caveats as the primary state message

## Information Architecture

`V4.10` must separate four roles clearly.

### Primary Scene Narrative

Purpose:

- make the current state visible in the scene

Required:

- active state title
- orbit class token
- one short first-read line
- watch cue label
- connector only when geometry is reliable

Denied:

- actor ids
- cue ids
- full truth disclosure
- long candidate/fallback lists
- active service or path claims

### Handover Sequence Rail

Purpose:

- make the five-state sequence and next transition visible without details

Required:

- five state marks or segments
- active state mark
- next transition mark
- orbit class color or role treatment
- no duplicate simulated UTC / Cesium timeline semantics

Denied:

- raw model window ids as primary labels
- percentage-only progress
- a rail that is hidden on desktop default
- a rail that consumes narrow viewport height needed for the globe

### Boundary Affordance

Purpose:

- state what is not being claimed without competing with the main narrative

Required:

- one compact visible boundary line or button
- clear distinction from `Details`
- if clicked, opens a focused boundary popover or section, not the generic
  inspector by default

Acceptable compact copy:

- `Simulation review - not an operator handover log`
- `No active satellite, gateway, path, or measured metric claim`

Denied:

- using `Truth` as a duplicate `Details` button
- hiding the boundary entirely inside details
- making the boundary text dominate the main state message

### Inspector / Details

Purpose:

- support deliberate review and evidence inspection

Required:

- state summary
- why
- what changed
- what to watch
- next
- boundary summary
- implementation evidence collapsed by default

Denied:

- first-read narrative depends on the inspector
- raw ids appear in the primary inspector body
- inspector opens by default on desktop or narrow
- `Details` and boundary affordance perform indistinguishable actions

## State Storyboard Requirements

Each state needs a storyboard before runtime implementation.

For each of the five windows, the implementation plan must record:

- active state title
- primary orbit class
- selected visual cue
- scene label copy
- sequence rail active/next marks
- boundary copy
- inspector summary
- unreliable-anchor fallback behavior
- desktop screenshot target
- narrow screenshot target

Runtime implementation may not start until this storyboard exists in the
execution prompt or an accepted SDD delta.

## Required Runtime Slices

This SDD is doc-only. If runtime implementation is opened later, use these
slices in order.

### Slice 0 - Baseline And Target Lock

No product runtime change.

Tasks:

- capture current `V4.9` screenshots at `1440x900`, `1280x720`, and `390x844`
- capture current `Details` and boundary behavior
- produce a text or image wireframe for the `V4.10` target
- write the five-state storyboard
- get planning/control acceptance before runtime code starts

Acceptance:

- baseline evidence exists
- target evidence exists
- the target visibly differs from current V4.9
- all five states have storyboard records

### Slice 1 - First-Viewport Composition

Goal:

- make the default view read as a handover review product

Scope:

- reduce persistent controls to secondary visual priority
- introduce or restructure the primary scene narrative area
- make the active state and watch cue readable without the inspector
- preserve existing replay controls and route

Acceptance:

- default desktop screenshot visibly differs from V4.9
- default narrow screenshot remains usable
- no details/inspector open state is needed for first understanding

### Slice 2 - Handover Sequence Rail

Goal:

- make the five-state sequence and next transition visible

Scope:

- add a compact sequence rail or equivalent state path
- mark active and next states
- keep Cesium timeline usable
- avoid duplicate simulated UTC/progress semantics

Acceptance:

- active state and next state are visible in default view
- transition event updates the rail or equivalent sequence indicator
- rail does not dominate narrow viewport

### Slice 3 - Boundary Affordance Separation

Goal:

- make boundary/truth behavior distinct from `Details`

Scope:

- replace duplicate `Truth`/`Details` behavior
- make boundary affordance focused and compact
- preserve full disclosure in a secondary surface

Acceptance:

- clicking boundary affordance does not perform the same action as `Details`
- default view communicates the truth boundary in one compact line or affordance
- full truth disclosure remains inspectable

### Slice 4 - Inspector As Evidence, Not Narrative

Goal:

- keep inspector useful without making it the product center

Scope:

- preserve V4.9 evidence demotion
- tune inspector copy to support the new scene narrative and sequence rail
- keep implementation evidence collapsed

Acceptance:

- inspector open state does not obscure the primary scene narrative more than
  necessary
- inspector is visibly secondary
- primary body remains free of raw ids and long arrays

### Slice 5 - Product-Visible Validation

Goal:

- prove product-visible improvement, not only DOM correctness

Scope:

- add screenshot capture and comparison artifacts
- add smoke assertions for layout roles and behavior
- add a manual review checklist
- preserve V4.8 and V4.9 regression tests

Acceptance:

- `V4.10` final handoff includes before/after screenshots
- final handoff explains visible differences in plain language
- reviewer checklist passes for desktop and narrow viewports
- no forbidden claims are introduced

## Visual Acceptance Matrix

Required screenshots:

- current V4.9 default `1440x900`
- V4.10 default `1440x900`
- V4.10 default `1280x720`
- V4.10 default `390x844`
- V4.10 transition moment `1440x900`
- V4.10 inspector-open `1440x900`
- V4.10 boundary affordance-open `1440x900`
- V4.10 narrow inspector-open `390x844`

Required written checks:

- what is visibly different from V4.9
- what the active state means
- where the user should look
- what happens next
- what truth boundary is visible
- whether details are optional

The phase cannot close if the final answer is only "tests pass."

## Smoke Acceptance Criteria

Future runtime implementation must add or update smoke tests to prove:

- route, endpoint pair, precision, actor counts, source boundary, `R2`
  read-only status, and `V4.6D` model truth remain unchanged
- default view exposes primary scene narrative, sequence rail, compact boundary
  affordance, secondary controls, and details trigger
- boundary affordance behavior is distinct from details behavior
- `Details` does not open by default and is not required for first-read state
  understanding
- scene narrative visible text contains no raw actor ids, cue ids, selected
  anchor ids, or long candidate/fallback arrays
- sequence rail maps to the five accepted `V4.6D` windows in order
- transition events update the visible sequence state and remain non-blocking
- narrow viewport keeps the globe, state, next transition, and controls usable
- visible forbidden-claim scan remains clean
- screenshot artifacts are produced or referenced by final handoff

## Manual Review Checklist

Before closeout, a reviewer must answer yes to all of these from screenshots:

- Can I tell this is a cross-orbit handover review product?
- Can I identify the active state without opening details?
- Can I identify the orbit class focus without reading raw ids?
- Can I tell what to watch in the scene?
- Can I tell what happens next?
- Can I see the truth boundary without details?
- Are `Details` and boundary/truth interactions visibly different?
- Does the scene remain the dominant workspace?
- Does narrow viewport still feel usable?

If any answer is no, `V4.10` is not complete.

## Denied Completion Patterns

Do not close `V4.10` if:

- the implementation mostly adds data attributes or test seams
- default screenshots look substantially the same as `V4.9`
- `Details` remains the primary explanation surface
- `Truth` or boundary affordance opens the same generic inspector as `Details`
  with no distinct behavior
- the sequence is only represented by `State N of 5`
- the active state copy remains engineering-facing
- visual acceptance is replaced by DOM-only smoke tests
- the final handoff lacks before/after screenshot comparison

## Runtime Opening Conditions

Runtime implementation may open only after:

- this SDD is explicitly accepted
- [m8a-v4.9-product-comprehension-slice5-final-handoff.md](./m8a-v4.9-product-comprehension-slice5-final-handoff.md)
  is read as the latest `V4.9` closeout state
- planning/control explicitly opens `V4.10` Slice 0 first
- Slice 0 target/storyboard is accepted before product runtime code starts
- implementation scope remains product-visible experience redesign for the
  accepted single scenario
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
- `R2` runtime promotion
- `V5` scenario-selection work
- copy that implies real operator logs or measured handover events
