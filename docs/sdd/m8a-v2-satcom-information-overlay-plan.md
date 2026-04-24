# M8A-V2 Satcom Information Overlay Plan

Source note: this file defines the satcom information redesign for `M8A-V2`.
It exists so the demo can show compact, useful, visual satcom context without
central blocking panels or vague prose-heavy explanation.

Parent SDD: see
[./m8a-v2-cross-orbit-handover-umbrella-plan.md](./m8a-v2-cross-orbit-handover-umbrella-plan.md).
Related input plans: see
[./m8a-v2-handover-state-model-plan.md](./m8a-v2-handover-state-model-plan.md),
[./m8a-v2-orbit-animation-and-visual-language-plan.md](./m8a-v2-orbit-animation-and-visual-language-plan.md), and
[./m8a-v2-cinematic-camera-and-viewing-plan.md](./m8a-v2-cinematic-camera-and-viewing-plan.md).

## Status

- planning-only child SDD
- overlay-information authority only
- reuses accepted first-case/M8A truths

## Purpose

This file answers two questions:

1. What satcom information is important and true enough to show?
2. How should it be shown without central blocking panels?

## Important Facts Allowed On First Overlay

The first `M8A-V2` overlay may expose only concise, viewer-useful facts:

- `OneWeb LEO + Intelsat GEO aviation`
- `service-layer switching`
- `not native RF handover`
- `bounded replay`, not measurement truth
- fixed nearby endpoint label and precision
- orbit-class labels:
  `LEO context`, `GEO context`
- current demo stage from the bounded handover-state model
- bounded-proxy metric classes for latency, jitter, speed, and continuity
- source/evidence class for endpoint and orbit-context actors
- inactive/evidence-gated `MEO` status only if the UI needs full
  `LEO/MEO/GEO` requirement traceability

Those bounded metric classes must come only from the repo-owned `M8A-V2`
metric-class seam defined by the satellite-evidence/data-contract plan. Overlay
code must not invent them locally.

The overlay may also expose inspectable secondary detail for:

- endpoint A role
- YKA fixed endpoint role
- provider-managed GEO anchor role as service-side context, not a precise third
  ground endpoint
- nearby second-endpoint role
- eligible gateway pool semantics

## Required Non-Claims

The overlay must keep these non-claims visible or one click away:

- no active gateway assignment
- no pair-specific GEO teleport
- no RF beam truth
- no native RF handover truth
- no measurement-truth performance
- no claim that contextual orbit actors are the active serving satellites
- no active MEO participation in this branch

## Layout Rule

The first `M8A-V2` overlay must not use:

- center-screen blocking panel
- large floating prose card
- full-width briefing strip over the scene

Preferred first surfaces:

- compact top-corner badges
- slim side rail or corner stack
- small timeline stage chips
- hover/click detail anchored to scene elements
- scene-anchored endpoint labels with precision badges
- orbit-class chips near actor labels or the stage strip
- mini metric glyphs or bars for latency, jitter, speed, and continuity classes

## Time-Link Rule

Any overlay element that changes with replay progress must derive from the same
shared replay clock used by Cesium and the handover-stage model.

## Style Rule

The overlay should help the user watch the scene, not replace the scene with
text.

That means:

- short labels
- orbit-class badges
- state chip or stage strip
- minimal inspectable detail
- numeric values only when the value is source-backed or explicitly a bounded
  proxy; otherwise use class labels such as `lower`, `higher`, `stable`,
  `degraded`, or `context`

It should avoid:

- long narrative paragraphs
- duplicate explanation across multiple panels
- generic satcom control-center layout
- small-font dumps of source notes, non-claims, or raw JSON

## Information Design Recommendation

The first overlay should make important information visual before textual:

- endpoint identity and precision:
  anchored marker labels with compact precision badges
- orbit class:
  `LEO`, `GEO`, and optional inactive `MEO` chips with distinct shapes
- handover stage:
  a short stage strip synchronized to replay time
- switch basis:
  four small metric indicators for bounded latency, jitter, speed, and
  continuity classes
- evidence boundary:
  a compact source/truth badge with an inspectable details drawer
- non-claims:
  available in the detail drawer and represented by concise limit chips, not a
  center-screen disclaimer

The UI should not ask the viewer to read a paragraph to understand the
handover. The first glance should answer:

- what the two endpoints are
- which orbit class is currently emphasized
- why the switch stage is happening
- which facts are real runtime truth, display-context, or still evidence-gated

The two endpoints should read as the aircraft/mobile endpoint and the YKA fixed
endpoint. GEO anchor context can be present, but it should not read as a third
precise endpoint.

## Acceptance Criteria

This child plan is satisfied only when:

1. important facts are concise and truthful enough to show
2. non-claims remain visible or inspectable
3. no central blocking panel appears by default
4. overlay placement avoids the main scene, the Cesium timeline, and the main
   demo affordances
5. overlay state stays synchronized to the shared replay clock
6. bounded metric cues and endpoint/source precision are visible without a
   prose-heavy side panel
7. inactive `MEO`, if shown, is clearly evidence-gated and non-participating
8. runtime/controller/render overlay code does not side-read raw package files,
   including raw nearby-endpoint, corridor, or satellite-source artifacts
