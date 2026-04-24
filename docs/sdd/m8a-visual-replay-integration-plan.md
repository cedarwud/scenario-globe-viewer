# M8A Visual Replay Integration Plan

Source note: this file is the `R1V` umbrella/index SDD for post-`M8A`
viewer legibility. It does not replace the completed `M8A.1`-`M8A.4`
authority line. It coordinates the child SDDs that will make the accepted
nearby-second-endpoint scene understandable as a bounded animated replay.

Related north star: see
[../../../itri/multi-orbit/north-star.md](../../../itri/multi-orbit/north-star.md).
Related `M8` authority: see
[../../../itri/multi-orbit/m8-expansion-authority.md](../../../itri/multi-orbit/m8-expansion-authority.md).
Related `M8A` spine: see
[./m8a-nearby-second-endpoint-expansion-plan.md](./m8a-nearby-second-endpoint-expansion-plan.md).
Related `M8A.3` expression plan: see
[./m8a-nearby-two-endpoint-expression-plan.md](./m8a-nearby-two-endpoint-expression-plan.md).
Related `M8A.4` info plan: see
[./m8a-satcom-info-expansion-plan.md](./m8a-satcom-info-expansion-plan.md).
Related follow-on roadmap: see
[./multi-orbit-follow-on-roadmap.md](./multi-orbit-follow-on-roadmap.md).

## Status

- umbrella/index SDD
- planning-only until an implementation gate explicitly opens a slice
- post-`M8A` viewer-legibility follow-on
- first-case-plus-nearby-second-endpoint only
- not `M8B`, not `M8C`, and not the `R2` read-only catalog

## Purpose

This file answers one control question:

How should the completed `M8A` seams be turned into a legible animated viewer
experience without opening arbitrary endpoint selection, second operator-pair
work, `MEO`, or unapproved satellite truth?

## Completion Context

`M8A` is complete:

- `M8A.1` accepted the YKA nearby second-endpoint package
- `M8A.2` added repo-owned runtime ownership for that endpoint
- `M8A.3` added the minimal two-endpoint expression seam
- `M8A.4` added the bounded nearby second-endpoint info seam

The remaining issue is presentation quality, not authority data:

- the current mobile cue must visibly move through the accepted corridor replay
- the relation cue must update with the moving cue
- Cesium's animation widget, Cesium's timeline, and the repo replay clock must
  share one time source
- the viewer needs one deliberate close/cinematic camera preset before broader
  camera work is considered
- satcom information must be concise, non-blocking, and truth-bounded
- satellite and infrastructure realism must be handled through evidence gates,
  not random or synthetic display claims

## Child SDDs

The `R1V` line is split into these child SDDs:

- [m8a-visual-replay-time-and-camera-plan.md](./m8a-visual-replay-time-and-camera-plan.md)
  controls replay time ownership, Cesium widget/timeline alignment, playback
  defaults, reset behavior, and the first `endpoint-relation-cinematic`
  viewing preset.
- [m8a-visual-replay-animation-plan.md](./m8a-visual-replay-animation-plan.md)
  controls moving cue interpolation, relation cue updates, animation proof, and
  animation truth boundaries.
- [m8a-satcom-context-overlay-plan.md](./m8a-satcom-context-overlay-plan.md)
  controls non-blocking satcom information surfaces such as badges, legends,
  corner detail, timeline annotations, and hover/click detail.
- [m8a-satellite-evidence-promotion-plan.md](./m8a-satellite-evidence-promotion-plan.md)
  controls the evidence review required before any satellite, constellation,
  gateway, or teleport data can be promoted beyond display-context or
  explanatory use.

This file remains the index and gatekeeper. Child SDDs must not create a
parallel scope outside `R1V`.

## Core Decision

The follow-on is:

- `R1V / M8A Visual Replay Integration`

Its first objective is to make the accepted two-endpoint scene understandable
as a bounded, replay-driven presentation of service-layer switching context.

It must not become:

- arbitrary endpoint selection
- a second operator-pair case
- `MEO` exploratory rendering
- active gateway assignment
- pair-specific GEO teleport claims
- native RF handover truth
- RF beam truth
- measurement-truth performance semantics

## Runtime And Data Inputs

Implementation slices may consume only repo-owned runtime seams:

- `firstIntakeNearbySecondEndpoint`
- `firstIntakeNearbySecondEndpointExpression`
- `firstIntakeNearbySecondEndpointInfo`
- `firstIntakeMobileEndpointTrajectory`
- `firstIntakeOverlayExpression`
- the repo-owned replay clock

They must not side-read:

- raw nearby second-endpoint package files
- raw accepted corridor package files
- raw `itri/multi-orbit/download/...` package files from runtime, controller,
  or render code
- external research JSON at runtime

## Gate Order

### R1V.0 - SDD Split And Plan Approval

Status:

- current docs-only gate

Required outcome:

- this umbrella SDD exists
- all four child SDDs exist under `docs/sdd/`
- roadmap points to the split
- no runtime code changes are made

### R1V.1 - Presentation Suppression

Goal:

- remove current visual clutter before time, animation, or camera work

Allowed work:

- hide or collapse intrusive floating panels by default on the addressed
  first-intake route
- keep all existing `M8A` capture and document telemetry seams alive
- keep `M8A.4` info ownership available for later overlay decisions
- update tests so hidden presentation is not treated as missing runtime data

Runtime proof:

- `panelVisible=false` is expected for the suppressed first-intake floating
  panels on the addressed route
- `M8A.3` and `M8A.4` capture and telemetry seams must still resolve while
  those panels are hidden
- the default route must not publish `M8A` or `R1V` presentation state

Stop boundary:

- no replay clock integration
- no animation interpolation
- no camera button
- no new satcom information wording
- no satellite evidence implementation

### R1V.2 - Time Authority Integration

Controlled by:

- [m8a-visual-replay-time-and-camera-plan.md](./m8a-visual-replay-time-and-camera-plan.md)

Goal:

- make Cesium's animation widget, Cesium's bottom timeline, and the repo replay
  clock share one addressed-route replay authority

Stop boundary:

- no cue interpolation beyond what is needed to prove time state
- no camera preset yet unless explicitly included in the gate
- no independent JavaScript animation timer

Nearest-sample cue repositioning during scrub is acceptable in this phase only
to prove shared time state. Smooth interpolation belongs to `R1V.3`.

### R1V.3 - Animated Cue And Relation

Controlled by:

- [m8a-visual-replay-animation-plan.md](./m8a-visual-replay-animation-plan.md)

Goal:

- make the existing current mobile cue and relation cue visibly move under the
  shared replay clock

Stop boundary:

- no fake satellite path
- no active gateway cue
- no pair-specific GEO teleport cue
- no measurement-truth performance display

### R1V.4 - First Cinematic Camera Preset

Controlled by:

- [m8a-visual-replay-time-and-camera-plan.md](./m8a-visual-replay-time-and-camera-plan.md)

Goal:

- expose one top-right affordance for `endpoint-relation-cinematic`

Stop boundary:

- no arbitrary endpoint navigation model
- no catalog browsing
- no global selector
- no requirement that all manual zoom levels become polished views

### R1V.5 - Minimal Satcom Context Overlay

Controlled by:

- [m8a-satcom-context-overlay-plan.md](./m8a-satcom-context-overlay-plan.md)

Goal:

- reintroduce only the information needed while watching the animated replay

Stop boundary:

- no central explanatory modal
- no broad satcom control center
- no operator-pair expansion
- no `MEO`

### R1V.6 - Satellite Evidence Promotion Gate (Docs-Only)

Controlled by:

- [m8a-satellite-evidence-promotion-plan.md](./m8a-satellite-evidence-promotion-plan.md)

Goal:

- decide whether any satellite, constellation, gateway, or teleport evidence
  can be promoted into a future repo-owned projection contract

Stop boundary:

- no real satellite rendering implementation
- no random satellite generation
- no walker fixture as OneWeb truth
- no active gateway, pair-specific teleport, RF beam, or measurement claim

## Acceptance Criteria

The full `R1V` line is acceptable only when:

1. the addressed first-intake route has a single replay time authority
2. Cesium's animation widget, Cesium's timeline, and app replay state agree
3. playback defaults are explicit and validated by the time/camera SDD
4. the current mobile cue visibly changes position as replay time advances
5. the relation cue updates from the moving current mobile cue
6. the fixed YKA nearby second endpoint remains fixed
7. the first close/cinematic view is one deliberate preset bounded to the
   accepted scene and available through one top-right affordance
8. central floating panels do not block the animation by default
9. `M8A.3` and `M8A.4` capture and telemetry seams still resolve on the
   addressed route after presentation suppression
10. satcom information is concise, non-blocking, and tied to true first-case
   context
11. any time-linked overlay uses the same replay clock as Cesium
12. satellite, constellation, gateway, and teleport references remain
    display-context or future evidence scope unless a repo-owned projection
    contract promotes them
13. all animation remains presentation-only and bounded-proxy
14. no runtime, controller, or render surface side-reads raw package files

## Global Forbidden Scope

This file and its child SDDs do not authorize:

- `R2` read-only confirmed-points catalog implementation
- third-endpoint runtime work
- arbitrary endpoint selector UI
- new endpoint package acceptance
- second operator-pair narrative
- `MEO` exploratory narrative
- endpoint A or endpoint B rewrite
- handover-decision changes
- physical-input truth changes
- active gateway assignment
- pair-specific GEO teleport truth
- RF beam truth
- native RF handover truth
- measurement-truth performance display
- random satellite generation
- real OneWeb constellation rendering without a later repo-owned projection
  contract
- treating the existing walker fixture or `>= 500 LEO` validation path as
  OneWeb constellation truth

## Plan Stop

Current completed gate:

- `R1V.6 Satellite Evidence Promotion Gate`

`R1V.6` is a docs-only inventory and classification stop. It does not open a
rendering implementation path.

There is no automatic next gate from this file. Any future real satellite,
constellation, gateway, or teleport rendering must first open a new approved
projection-contract gate and must not continue to `R2`, `M8B`, `M8C`, `MEO`, or
other non-`R1V` planning by implication.
