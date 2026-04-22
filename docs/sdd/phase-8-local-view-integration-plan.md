# Phase 8 Local-View Integration Plan

Source note: this file is the detailed Phase 8 execution SDD for integrating
same-page local-view capabilities into `scenario-globe-viewer`. It is
downstream of `docs/sdd/phase-6-plus-requirement-centered-plan.md` and must
not be read as a new authority chain.

Related authority:

- `docs/sdd/phase-6-plus-requirement-centered-plan.md`
- `docs/data-contracts/scenario.md`
- `docs/data-contracts/soak-evidence.md`
- `../scenario-globe-handover-demo/docs/local-handover-focus-demo-sdd.md`
- `../scenario-globe-handover-demo/docs/local-focus-visual-refinement-sdd.md`

## Status

- Proposed detailed Phase 8 interpretation as of `2026-04-20`
- Phase `7.0-7.1` closure is now established as of `2026-04-21`
- Phase 6.7 accepted repo reality is treated as the seed bridge for this line
- Refreshed on `2026-04-21` against the latest
  `scenario-globe-handover-demo` authority docs and controller architecture

## Decision Summary

Yes: under the current repo-local authority set, this work belongs in
`scenario-globe-viewer` Phase 8.

No: Phase 8 should not be implemented as a direct port of
`scenario-globe-handover-demo`'s synthetic runtime.

The correct interpretation is:

1. `scenario-globe-handover-demo` remains a downstream presentation probe.
2. `scenario-globe-viewer` remains the delivery-aware host and planning
   authority.
3. Phase 8 productizes selected local-view behavior inside
   `scenario-globe-viewer` by consuming viewer-owned scenario/time/decision/
   validation semantics plus the accepted Phase 6.7 scene-starter bridge.

## Why Phase 8 And Not Phase 7

Phase 7 is still requirement-critical:

- `7.0` owns soak and stability evidence
- `7.1` owns multi-orbit and `>= 500 LEO` closure

The existing Phase 6+ plan explicitly classifies showcase, richer local-sky
storytelling, and handover-demo follow-on work as downstream presentation work.
That places same-page local-view integration in Phase 8, not in the
requirement-critical spine.

Practical implication:

- Phase 8 may now start under the current repo state because Phase `7.0-7.1`
  closure is established
- if a later issue reopens requirement-critical scope, it must be recorded
  explicitly as a deviation instead of being silently absorbed into local-view
  work

## Current Repo Comparison

### `scenario-globe-viewer` already owns

- the active scenario contract and scenario session host
- replay-clock control and operator-grade replay UI
- communication-time, handover-decision, physical-input, and validation-state
  seams
- the site/global/regional presentation frame
- the accepted Phase 6.7 `scene-starter` bridge to imported
  `starter-export` source/truth/presentation semantics
- the long-run soak evidence boundary

### `scenario-globe-handover-demo` already proves

- same-page local focus entry from the globe
- UE-anchor interaction and Home reset
- a local camera move without leaving the Cesium page
- a readable three-proxy local sky band
- a resident serving beam plus a phase-gated pending preview cue while the
  context proxy remains unlinked
- a strong visual grammar for local focus storytelling
- a single-Viewer truth/presentation/shell separation direction inside the
  local-focus controller rather than a second Viewer or separate page

### `scenario-globe-viewer` still lacks

- any local-focus activation seam
- any UE-anchor or site-pick lifecycle
- any local camera choreography
- any single-Viewer local-focus truth/presentation/shell seam
- any runtime-local proxy stage for serving/pending/context presentation under
  the updated resident-serving / preview-pending grammar
- any local-focus explainer projection that fits the existing operator surface
- any reusable active-satellite sample bridge for downstream local ranking

## What Must Be Integrated

Phase 8 should integrate these capabilities from the demo line into the viewer
line:

1. same-page local-focus entry and exit
2. UE anchor selection on the globe
3. local camera glide/fly behavior plus Home reset
4. a readable three-proxy local sky band
5. the updated cue grammar:
   resident serving beam, phase-gated pending preview cue, and unlinked context
6. a single-Viewer truth/presentation/shell split for local-focus rendering
7. local-focus explainer readouts that fit the existing operator HUD instead of
   requiring a separate demo panel
8. optional preset-site entry such as NTPU when it still improves repeatable QA

## What Must Not Be Ported As Authority

Phase 8 must not promote these demo-only surfaces into viewer authority:

1. the demo's synthetic constellation as the viewer's truth source
2. the demo's synthetic HO/BH loop as product logic
3. the demo's static local-density lookup as requirement-bearing truth
4. the demo's hidden/optional panels as the viewer's primary operator surface
5. the demo repo's roadmap language as `scenario-globe-viewer` phase authority
6. any reading of the latest demo split as permission to introduce a second
   Cesium `Viewer` or a separate local-view page in the viewer repo

## Boundary Lock

Phase 8 local view is a downstream presentation consumer.

It consumes:

- current scenario identity and replay mode
- scene-starter imported source/truth/presentation cues when present
- handover-decision outputs and reason signals
- communication-time and validation-state summaries
- active satellite samples from the runtime source bridge

It does not own:

- scenario selection semantics
- replay-clock ownership
- decision-layer truth
- validation-stack implementation
- satellite source ingestion or propagation ownership
- Cesium shell ownership
- a second-Viewer architecture

## Required New Seams

Phase 8 should add four repo-owned seams.

### 1. `local-focus` contract

Purpose:

- define UE-anchor lifecycle
- define local-focus eligibility by scenario
- separate local-focus truth state from presentation state
- keep app-facing state plain-data and serializable

Planned surface:

- `docs/data-contracts/local-focus.md`
- `src/features/local-focus/`

### 2. active-satellite sample bridge

Purpose:

- expose bounded per-tick satellite samples to the local-focus runtime without
  widening `scenario` or `satellite-overlay` public contracts into Cesium-owned
  runtime classes

Why it is needed:

- the demo local-view logic depends on `sampleAtTime(...)`
- the viewer currently has no reusable active-source sample provider on its
  public runtime path

Boundary:

- runtime-local bridge only
- no Cesium runtime handles in the public `local-focus` contract

### 3. local-focus truth bridge

Purpose:

- map imported `scene-starter` fields, handover-decision state, and active
  scenario metadata into one local-focus truth snapshot
- establish the serving / pending / context state that presentation later
  renders without letting shell wording or Cesium mutation become the source of
  truth

Priority order:

1. scoped `scene-starter` truth/presentation feed when active
2. handover-decision and validation/communication summaries
3. active satellite sample bridge for ranking and placement

### 4. local-focus presentation and shell projection seam

Purpose:

- keep the viewer on one Cesium `Viewer` while separating:
  - local-focus truth
  - local-focus presentation derivation
  - local-focus shell/explainer projection
  - Cesium render application
- own stage entities, camera choreography, stage attach/detach, and rendering
  of proxies/beam cues/background cast

Boundary:

- runtime-local only
- does not rewrite the Cesium shell or operator HUD ownership
- does not justify a separate Viewer instance or separate local-view runtime

## High-Level Data Flow

```text
scenarioSession + replayClock + sceneStarter + handoverDecision
  + communicationTime + validationState + activeSatelliteSampleBridge
    -> localFocusTruthBridge
      -> localFocusPresentationBridge
        -> localFocusShellProjection
          -> localFocusController
            -> UE anchor lifecycle
            -> camera choreography
            -> proxy band / beam cues
            -> existing-operator-surface explainer projection
```

## Phase 8 Execution Stages

## Phase 8.1

### Name

Local-focus contract and eligibility model

### Goal

Create the plain-data local-focus boundary before any rendering work lands.

### In Scope

- local-focus capability/eligibility by scenario
- UE-anchor shape and lifecycle
- local-focus truth-vs-presentation separation
- one-Viewer truth / presentation / shell split for local-focus execution
- runtime-local active-satellite sample bridge design
- ownership notes between `scenario`, `scene-starter`, `handover-decision`,
  and `local-focus`

### Out Of Scope

- stage rendering
- beam/link visuals
- camera movement
- arbitrary new demo-only semantics

### Planned Outputs

- `docs/data-contracts/local-focus.md`
- `src/features/local-focus/` plain-data state and view-model boundary
- runtime-local sample-bridge interface and ownership note
- runtime-local projection-seam note for truth -> presentation -> shell flow

### Acceptance Criteria

- app-facing `local-focus` state stays serializable
- viewer-owned truth seams remain upstream of local focus
- no Cesium runtime classes leak into the public contract
- local-focus eligibility is explicit per scenario instead of implied by UI
- the local-focus plan stays on one Viewer and does not assume a separate local
  runtime page

## Phase 8.2

### Name

Scoped starter-export local-view pilot

### Goal

Use the accepted Phase 6.7 `site prerecorded` starter scope as the first
executable local-view seed inside `scenario-globe-viewer`.

### In Scope

- activate local focus only for the scoped starter scenario first
- consume imported `starter-export` source/truth/presentation fields
- prove that the viewer can stage local truth/presentation without promoting
  demo-only synthetic authority
- allow a fixed entry point first if that reduces initial risk

### Out Of Scope

- arbitrary site picking across all scenarios
- generalized multi-source ranking
- Phase 8 visual polish

### Acceptance Criteria

- local focus can consume starter `displaySatIds`, `beamSatIds`,
  `sceneServingSatId`, `publishedServingSatId`, `focusMode`, and
  `narrativePhase`
- local focus remains explicitly downstream of starter semantics
- viewer shell, replay, and scenario ownership stay local
- failure to enter the scoped starter path is diagnosable through repo-owned
  state and smoke output

## Phase 8.3

### Name

Same-page local-focus activation and camera choreography

### Goal

Bring the core interaction grammar into the viewer:

- site pick
- UE anchor
- local camera move
- Home reset

### In Scope

- `LEFT_DOUBLE_CLICK` site selection
- UE-anchor placement and replacement
- Home button reset
- local-focus active/inactive lifecycle
- camera glide/fly choreography
- keep all of the above inside the existing Cesium `Viewer`
- site-preset-first entry, then bounded fallback for non-dataset terrain-only
  local focus when later generalized

### Out Of Scope

- final local proxy semantics
- final HUD wording
- broader stylistic polish

### Acceptance Criteria

- local focus can be entered and exited without page navigation
- global replay and globe context remain alive during local focus
- Home reset fully clears the UE anchor and local stage
- camera movement remains bounded, repeatable, and testable

## Phase 8.4

### Name

Local proxy stage and cue system

### Goal

Land the readable local-view stage itself inside the viewer.

### In Scope

- three primary proxies: serving / pending / context
- elevated local sky band / corridor
- resident serving beam/link/cone
- pending preview-only cue during `prepared` / `switching`
- unlinked context proxy that still stays in the corridor narrative
- HO/BH channel separation
- optional bounded background cast
- presentation-only local-density helper when still useful

### Out Of Scope

- redefining the decision layer
- unbounded background satellite counts
- physically claimed local sky truth

### Acceptance Criteria

- the local stage is readable without depending on HUD visibility
- proxy motion reads as one simultaneous upper-sky cast, not as disconnected
  pop-ins
- the serving path stays resident while the pending cue reads as preparation
  rather than as a second resident service path
- the context proxy stays visible but unlinked unless a later accepted SDD
  explicitly changes that rule
- HO and BH remain visually distinguishable
- any synthetic fallback remains labeled as presentation-only

## Phase 8.5

### Name

Operator/HUD integration and scenario generalization

### Goal

Turn the local-view pilot into a real viewer capability instead of a one-scope
demo path.

### In Scope

- integrate local-focus readouts into the viewer HUD without replacing the
  operator surface
- connect local focus to handover-decision, communication-time, physical-input,
  and validation-state summaries
- generalize from the Phase 8.2 starter scope to Phase 7.1-capable scenario
  sources
- support global/regional/site framing where that remains consistent with the
  active scenario
- keep repeatable QA entry points such as NTPU only if they still reduce test
  friction

### Out Of Scope

- demo-only panel wording copied wholesale
- reopening Phase 7 requirement closure

### Acceptance Criteria

- local-focus HUD content is derived from viewer-owned semantics
- local-focus readouts fit the existing operator surface instead of reviving the
  demo's hidden left/right panel structure as viewer authority
- the feature works beyond the initial starter-only pilot path
- Phase 7.1 scenario/source closure is consumed rather than bypassed
- the viewer still reads as one coherent repo-owned operator surface

## Phase 8.6

### Name

Hardening, parity audit, and close-out evidence

### Goal

Close Phase 8 with explicit evidence instead of screenshot-only optimism.

### In Scope

- smoke coverage for entry, exit, and scoped scenario eligibility
- visual capture for global-to-local transitions
- runtime assertions that local focus does not pause replay or break bootstrap
- performance review against the accepted viewer baseline
- parity audit against the accepted demo semantics
- explicit known-gap recording where the viewer intentionally stops short of the
  demo or truth system

### Out Of Scope

- reopening Phase 7 soak authority
- treating Phase 8 visual captures as substitute requirement evidence

### Acceptance Criteria

- local focus has repeatable smoke and visual coverage
- known gaps versus the demo are documented explicitly
- local focus does not degrade accepted bootstrap, operator, or soak boundaries
- Phase 8 close-out states what is productized, what remains demo-only, and
  what still belongs to later realism work

## Recommended Execution Order

This is the smoothest order:

1. `8.1` first, because the local-focus contract and sample bridge are the
   missing architectural pieces.
2. `8.2` second, because the accepted `6.7` starter scope is the safest way to
   prove viewer-local consumption of truth/presentation semantics.
3. `8.3` third, because interaction lifecycle and camera ownership must settle
   before the richer stage is layered on top.
4. `8.4` fourth, because the proxy band and updated serving/pending/context cue
   grammar depend on the earlier truth bridge plus entry lifecycle.
5. `8.5` fifth, because HUD integration and source generalization should happen
   only after the local stage exists.
6. `8.6` last, because close-out evidence should test the landed shape rather
   than a moving target.

## Validation Plan

Phase 8 should add these repo-owned checks.

1. contract test for `local-focus` plain-data boundary
2. smoke test for scoped starter local-focus activation
3. smoke test for double-click entry and Home reset
4. smoke test confirming global replay continues during local focus
5. visual capture for:
   - idle global view
   - local focus entered from site scenario
   - local focus cleared back to globe
6. bounded performance check ensuring local-focus attach/detach does not regress
   the accepted baseline materially

## Main Risks

1. A later regression or reopened scope dispute could force Phase 8 work to
   pause even though `7.0-7.1` is currently closed.
2. The viewer currently lacks a reusable active-satellite sample bridge.
3. The demo's synthetic vocabulary can easily leak upward unless the truth
   bridge order is enforced.
4. Local-focus stage entities may interact badly with Cesium async loading and
   clock progression if lifecycle cleanup is sloppy.
5. Reintroducing the older "all three proxies stay fully linked" grammar would
   drift away from the latest accepted demo semantics.
6. HUD sprawl can turn a clean operator surface into a mixed demo/operator
   shell if placement is not controlled.
7. A mistaken second-Viewer interpretation would create unnecessary runtime and
   ownership complexity.

## Exit Statement

Phase 8 is complete only when `scenario-globe-viewer` can present a same-page
local view as a downstream consumer of viewer-owned semantics, while
`scenario-globe-handover-demo` remains a separate probe repo rather than the
authority that drives future ordering.
