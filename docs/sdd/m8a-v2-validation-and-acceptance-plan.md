# M8A-V2 Validation And Acceptance Plan

Source note: this file defines the cleanup gate, validation ordering, and final
acceptance bar for the gated `M8A-V2` branch.

Parent SDD: see
[./m8a-v2-cross-orbit-handover-umbrella-plan.md](./m8a-v2-cross-orbit-handover-umbrella-plan.md).
Related child plans: see
[./m8a-v2-satellite-evidence-and-data-contract-plan.md](./m8a-v2-satellite-evidence-and-data-contract-plan.md),
[./m8a-v2-handover-state-model-plan.md](./m8a-v2-handover-state-model-plan.md),
[./m8a-v2-orbit-animation-and-visual-language-plan.md](./m8a-v2-orbit-animation-and-visual-language-plan.md),
[./m8a-v2-cinematic-camera-and-viewing-plan.md](./m8a-v2-cinematic-camera-and-viewing-plan.md), and
[./m8a-v2-satcom-information-overlay-plan.md](./m8a-v2-satcom-information-overlay-plan.md).

## Status

- planning-only child SDD
- validation and gating authority only

## Purpose

This file answers two questions:

1. What must be cleaned up before `M8A-V2` planning acceptance?
2. What is the final acceptance bar for saying the demo actually shows
   cross-orbit satellite handover?

## Mandatory Cleanup Gate

Before `M8A-V2` implementation starts, the repo must isolate or revert the
unapproved hotfix attempt currently present in the dirty worktree on `main`.

Implementation files currently affected include:

- `package.json`
- `src/runtime/bootstrap/composition.ts`
- `src/runtime/first-intake-active-case-narrative-controller.ts`
- `src/runtime/first-intake-nearby-second-endpoint-expression-controller.ts`
- `src/runtime/first-intake-nearby-second-endpoint-info-controller.ts`
- `src/runtime/first-intake-overlay-expression-controller.ts`
- `src/styles.css`
- untracked runtime files:
  - `src/runtime/first-intake-cinematic-camera-preset-controller.ts`
  - `src/runtime/first-intake-presentation-suppression.ts`
  - `src/runtime/first-intake-replay-time-authority-controller.ts`
  - `src/runtime/first-intake-satcom-context-overlay-controller.ts`
- smoke/test surfaces:
  - modified `tests/smoke/verify-m4...`
  - modified `tests/smoke/verify-m5...`
  - modified `tests/smoke/verify-m6...`
  - modified `tests/smoke/verify-m7...`
  - modified `tests/smoke/verify-m8a4...`
  - untracked `tests/smoke/verify-r1v*.mjs`

Documentation files tied to that same unapproved attempt should also be
isolated from the new gated branch if they are not intentionally adopted:

- modified `docs/data-contracts/document-telemetry.md`
- modified `docs/data-contracts/nearby-second-endpoint-info.md`
- modified `docs/data-contracts/replay-clock.md`
- modified `docs/sdd/m8a-satcom-info-expansion-plan.md`
- modified `docs/sdd/multi-orbit-follow-on-roadmap.md`
- untracked `docs/sdd/m8a-visual-replay-*.md`
- untracked `docs/sdd/m8a-satcom-context-overlay-plan.md`
- untracked `docs/sdd/m8a-satellite-evidence-promotion-plan.md`

Recommendation:

- cut `M8A-V2` from clean `HEAD`
- move the hotfix attempt into a separate scratch branch or worktree
- carry only the approved `M8A-V2` planning docs into the new gated branch

## Phase Validation Order

### M8A-V2.0

Validate:

- all seven `M8A-V2` plan files exist
- no runtime code is changed as part of the SDD split

### M8A-V2.1

Validate:

- explicit demo entry exists in the approved design
- existing default route remains outside `M8A-V2` demo state unless the
  explicit entry is used
- cleanup/isolation decision is recorded before runtime implementation starts

### M8A-V2.2

Validate:

- accepted runtime truth is listed explicitly
- display-context is separated explicitly
- forbidden claims remain machine-readable
- visible satellite actors are source-lineaged and not synthetic demo actors
- `MEO` is absent or clearly inactive/evidence-gated
- bounded metric cues are sourced only from the repo-owned metric-class seam
- orbit-context actors declare source epoch, projection epoch, and freshness
  class

### M8A-V2.3

Validate:

- bounded handover-state model exists
- stages derive from the shared replay clock
- stage model does not mutate existing `handover-decision` truth
- bounded latency, jitter, speed, and continuity classes can drive visual cues
  without becoming measurement truth

### M8A-V2.4

Validate:

- `LEO` and `GEO` are visually distinct
- at least one visible moving `LEO` context actor exists
- one visible `GEO` context anchor exists
- motion and stage emphasis derive from replay time
- orbit-class visuals encode endpoint precision, source confidence, and bounded
  switch basis without RF beam theater

### M8A-V2.5

Validate:

- explicit entry reaches a legible close-view demo
- Cesium animation widget, timeline, and demo replay authority stay aligned
- the close view borrows only same-page focus/camera grammar from
  `scenario-globe-handover-demo`, not synthetic proxy-satellite truth

### M8A-V2.6

Validate:

- overlay is compact and non-blocking
- visible facts remain truthful
- non-claims remain available
- endpoint identity, endpoint precision, orbit class, stage, bounded metrics,
  and evidence boundary are visible without a prose-heavy panel

### M8A-V2.7

Validate:

- regression suite covers entry, orbit-class difference, replay sync, handover
  stage progression, close-view legibility, and non-claims

## Final Acceptance Bar

The branch may claim that it now shows cross-orbit satellite handover only when
all of the following are true:

1. the demo is reachable from the homepage or another explicit visible entry
2. the user does not need hidden query knowledge
3. the scene shows two geographically separated communication endpoints:
   the aircraft/mobile endpoint and the fixed YKA nearby endpoint
4. the scene shows visible satellite presence
5. `LEO` and `GEO` are distinguishable at a glance
6. replay time visibly drives orbit/context movement and stage progression
7. the close/cinematic view makes the handover story legible near the
   endpoints
8. Cesium animation widget and timeline remain synchronized with the app replay
   clock
9. satcom information is compact, useful, and non-blocking
10. visible or inspectable non-claims remain intact
11. no runtime/controller/render path side-reads raw `itri` packages
12. no active gateway, pair-specific GEO teleport, RF beam, native RF
    handover, measurement truth, second operator pair, active `MEO` handover
    participation, or arbitrary endpoint scope is introduced
13. any visible satellite actor has a repo-owned source-lineage/evidence class
    and is not a random or demo-synthetic constellation actor
14. bounded latency, jitter, speed, and continuity cues are visually legible as
    proxy classes, not measurement truth
15. if `MEO` appears for customer-side requirement traceability, it is explicitly
    inactive/evidence-gated and never part of the active handover scene

## Regression Expectations

The final regression suite should prove at least:

- default route stays outside `M8A-V2` demo state unless explicitly entered
- explicit demo entry succeeds
- replay start/stop and stage timing are deterministic
- `LEO` and `GEO` visual semantics are both present
- close-view framing remains legible
- overlay does not block the main scene
- all required non-claims remain present
- source-lineage/evidence-class telemetry exists for orbit-context actors
- bounded metric cues and stage chips update from the shared replay authority
- no demo-local synthetic handover loop, beam loop, or proxy recasting appears
  in the delivery branch
- provider-managed GEO anchor context does not become a precise third endpoint
