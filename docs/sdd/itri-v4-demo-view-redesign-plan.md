# ITRI V4 Demo View Redesign Plan

Date: 2026-05-12

Canonical route:

`/?scenePreset=regional&m8aV4GroundStationScene=1`

## Status

- Planning-control SDD for the post-closure ITRI V4 demo view redesign.
- Docs-only. This file does not authorize runtime implementation by itself.
- Written after the route-local requirement closure work proved the route can
  be demonstrated and regression-tested, but the actual demo view still fails
  as a first-read product surface.
- Scope controller: preserve the existing V4 truth boundary. This plan changes
  information architecture and visual hierarchy; it does not add measured
  external truth.

## Authority Read

Primary requirement and route authorities:

- `/home/u24/papers/AGENTS.md`
- `/home/u24/papers/itri/README.md`
- `/home/u24/papers/itri/itri-acceptance-report-2026-04-20/01-itri-requirement-inventory-and-status.md`
- `scenario-globe-viewer/docs/sdd/itri-demo-route-requirement-closure-sdd.md`
- `scenario-globe-viewer/docs/sdd/m8a-v4.10-product-experience-redesign-plan.md`
- `scenario-globe-viewer/docs/sdd/m8a-v4.11-real-product-experience-redesign-plan.md`
- `scenario-globe-viewer/docs/sdd/m8a-v4.11-content-and-visual-followup-spec.md`
- `scenario-globe-viewer/docs/sdd/m8a-v4.12-itri-must-have-candidate-audit.md`
- `scenario-globe-viewer/docs/sdd/m8a-v4.12-f09-impl-phase1-visualization-spec.md`
- `scenario-globe-viewer/docs/sdd/m8a-v4.12-f16-statistics-report-export-plan.md`

Retained local evidence, not tracked authority:

- `scenario-globe-viewer/output/validation/itri-demo-route-final-closure-2026-05-12.md`
- `scenario-globe-viewer/output/itri-demo-route-requirement-gap-surface/desktop-1440x900.png`

Authority availability note:

- Root `AGENTS.md` still points to `itri/v4-quickstart.md`, `itri/v4.md`,
  and `itri/v3.md`, but those files are absent in this checkout. This plan
  therefore uses `itri/README.md`, the acceptance-report inventory, and the
  route-specific SDDs above.

## Problem Statement

The V4 demo route now has route-local closure evidence, but the default view is
not demo-ready. The current screen asks a first-time reviewer to parse too much
at once:

- the globe and handover path;
- the left scenario panel;
- the top strip;
- the bottom state rail;
- the footer truth chips;
- the open right inspector;
- the requirement matrix;
- F-09 rate disposition;
- F-10/F-11 preset controls;
- F-16 export state;
- route claims, nonclaims, IDs, and validation status.

The result is a data-complete debug surface, not an ITRI demonstration surface.
The current route can be explained by an engineer who already knows the truth
boundary. It does not yet guide a cold reviewer toward the one thing they should
care about at the current moment.

## Current UI Audit Findings

### High: Readable Scale Failure

The current stylesheet uses very small text on primary demo surfaces:

- scene annotations and labels around `0.7rem` to `0.96rem`;
- rail and control labels around `0.56rem` to `0.78rem`;
- narrow/mobile labels around `11px` to `12px`;
- inspector secondary labels around `0.72rem` to `0.875rem`.

This violates the readable-scale rule for a review/demo view. Body-level demo
copy should generally sit at `0.95rem` to `1.125rem`, with primary state text
larger. Sub-12px labels are acceptable only for nonessential telemetry that is
not part of the first-read task.

### High: No Focal Priority

The retained `1440x900` screenshot shows the right inspector open by default
with ITRI status, F-16 export, F-10/F-11 controls, and F-09 rate sections all
expanded inside the same sheet. The main globe and handover sequence become
secondary even though they are the reason the route exists.

The product failure is not lack of information. It is lack of hierarchy.

### High: Persistent Overload

Almost every surface is either always visible or hidden in the same inspector.
This creates a two-rank UI:

```text
always visible = scene, labels, strips, rail, chips, sheets when opened
hidden         = anything buried inside the inspector
```

The route needs at least four ranks:

```text
L0 first-read stage
L1 focus inspector
L2 acceptance evidence
L3 engineering archive
```

### High: Long-Content Safety Risk

Requirement IDs, endpoint IDs, policy labels, nonclaim text, source lineage, and
validation summaries are placed inside compact cards and sections. These are
necessary for traceability, but they are not first-read material. When displayed
together, they turn the demo into a scrolling document embedded beside a globe.

### Medium: Truth Copy Is Correct But Poorly Placed

The truth boundary wording is necessary and mostly accurate. Its current
placement gives legal/debug copy equal visual weight to the active handover
story. Truth must remain accessible, but first-read truth should be short:

```text
Modeled route review, not measured network traffic.
```

Full nonclaims belong in L2 or L3.

## Design Goal

The new view should feel like an industrial mission-review console for a
satellite handover briefing. It should not feel like a compliance spreadsheet
mounted beside Cesium.

With the inspector closed, a reviewer should answer these questions in 10 to 15
seconds:

1. What scenario am I watching?
2. What is happening now?
3. Which orbit/service path is primary now?
4. Why is the next handover candidate relevant?
5. What is modeled versus measured?
6. Which ITRI requirements are covered here, and which remain external?

The sixth question does not need the full matrix in the default viewport. It
does need a clear path to the acceptance evidence.

## Information Layers

### L0 - First-Read Demo Stage

Always visible on load. No scrolling. No default-open inspector.

Contents:

- full-bleed globe and current handover path;
- one primary handover briefing card;
- current window label and time-to-next transition;
- active orbit/service path;
- next candidate summary;
- modeled rate class, not measured throughput;
- one-line truth boundary;
- replay speed / pause control;
- compact sequence rail with current and next states.

Display rule:

- one primary message at a time;
- body text no smaller than `14px`;
- primary state text at least `18px`;
- no full requirement matrix;
- no raw IDs unless they are short human-facing labels.

### L1 - Focus Inspector

Opened by an explicit Details action. The inspector is not open by default.

Contents:

- current state explanation;
- current actor and orbit-class evidence;
- route-local modeled timing;
- F-07/F-08 style route-local timing status when available;
- F-09 class/proxy details;
- F-10/F-11 selected preset summary;
- F-12 modeled decision-class breakdown;
- short truth boundary for the selected state.

Display rule:

- tabbed or segmented, not one long vertical dump;
- defaults to the active window;
- route truth and state evidence can be visible together;
- archive/debug sections remain collapsed.

### L2 - Acceptance Evidence

Opened by an explicit Evidence or Acceptance action.

Contents:

- full ITRI requirement matrix;
- requirement status labels from the closure SDD;
- F-13 Phase 7.1 evidence pointer and freshness status;
- V-02 to V-06 external validation package status;
- F-16 bounded export action and schema/provenance;
- F-10/F-11 preset limitations;
- F-09 measured-throughput nonclaim;
- P-01/P-02/P-03 physical-layer seams and status.

Display rule:

- optimized for audit, not first-read drama;
- every ITRI ID must appear exactly once in the coverage matrix;
- failed external requirements are explicit fail/gap, not "pending";
- separate route-owned closure from external validation evidence.

### L3 - Engineering Archive

Deep disclosure for engineers and regression work.

Contents:

- raw endpoint IDs;
- actor IDs;
- source paths and fetched-at timestamps;
- route claim/nonclaim lists;
- JSON export payload;
- test artifact paths;
- debug telemetry and `data-*` evidence.

Display rule:

- never default-open;
- hidden behind an Archive disclosure inside Evidence;
- allowed to be dense because it is not the demo surface.

## ITRI Requirement Placement

| ID | Current route reality | Proposed layer | Display rule |
| --- | --- | --- | --- |
| F-01 | No live ITRI orbit-model integration. | L2 | Show as external/integration gap. Do not imply route closure. |
| F-02 | LEO/MEO/GEO actor representation exists. | L0, L1, L2 | L0 shows active orbit/service path; L1/L2 show counts and status. |
| F-03 | Source-lineaged display actors exist; not a general TLE input workflow. | L1, L2, L3 | L1 shows source-lineage summary; L3 holds raw TLE/source details. |
| F-04 | Interactive 3D route exists. | L0 | Globe remains the visual center. |
| F-05 | UI exists but needs redesign. | L0, L1, L2 | UI quality becomes an explicit acceptance concern. |
| F-06 | Bounded replay/review controls exist. | L0, L1 | L0 only replay speed/pause; L1 contains secondary controls. |
| F-07 | Modeled windows/countdown, not measured communication time. | L0, L1, L2 | L0 time-to-next only; L2 states route boundary. |
| F-08 | Communication-time statistics not fully route-owned. | L1, L2 | L1 may summarize available modeled timing; L2 keeps seam/gap. |
| F-09 | Bounded modeled network-speed class/proxy. | L0, L1, L2 | L0 shows class; L1 shows table; L2 repeats nonclaim. |
| F-10 | Route-local modeled policy preset selector. | L0, L1, L2 | L0 selected preset only; controls in L1; limitations in L2. |
| F-11 | Route-local bounded rule/parameter preset surface. | L1, L2 | L1 exposes presets; L2 states not arbitrary rule editor. |
| F-12 | Modeled latency/jitter/network-speed classes. | L0, L1, L2 | L0 shows reason phrase; L1 shows class breakdown. |
| F-13 | Separate Phase 7.1 evidence supports `540 LEO / 549 total`; route remains 13 actors. | L2 | Show evidence pointer and freshness. Do not call native route scale. |
| F-14 | Replay speed controls exist. | L0 | Keep visible and easy to operate. |
| F-15 | Bounded replay/demo mode, not full source switching. | L0, L2 | L0 shows replay mode; L2 shows limitation. |
| F-16 | Bounded route JSON export exists. | L2, L3 | Export belongs in Evidence; payload/provenance in Archive. |
| F-17 | Rain attenuation seam mostly elsewhere. | L2 | Show seam/gap only unless wired later. |
| F-18 | Stability evidence is retained elsewhere, not route-native 24h proof. | L2 | Show evidence boundary and rerun rule. |
| V-01 | Linux/dev baseline. | L2 | Acceptance evidence only. |
| V-02 | Windows/WSL external validation currently fails without retained pass. | L2 | Explicit fail/gap. |
| V-03 | Tunnel/bridge external validation currently fails. | L2 | Explicit fail/gap. |
| V-04 | NAT/ESTNeT/INET external validation currently fails. | L2 | Explicit fail/gap. |
| V-05 | Virtual DUT external validation currently fails. | L2 | Explicit fail/gap. |
| V-06 | Physical DUT/NE-ONE external validation currently fails. | L2 | Explicit fail/gap. |
| P-01 | Antenna parameters are a bounded seam. | L2 | Evidence/gap, not first-read. |
| P-02 | Rain attenuation is a bounded seam. | L2 | Evidence/gap, not first-read. |
| P-03 | ITU factors are a bounded seam. | L2 | Evidence/gap, not first-read. |
| D-01 | Visual/demo value is route-owned but currently too cluttered. | L0 | L0 is the primary acceptance surface. |
| D-02 | Bounded prerecorded/replay demo exists. | L0, L2 | L0 shows mode; L2 states boundary. |
| D-03 | Communication/switch/satellite/link state expression exists but is crowded. | L0, L1 | L0 stages the current state; L1 provides detail. |

## Proposed Desktop Layout

Default `1440x900` composition:

```text
+------------------------------------------------------------------+
| compact context bar: scenario / precision / truth boundary       |
+--------------------+---------------------------------------------+
|                    |                                             |
|  handover briefing |                                             |
|  current state     |               globe / active path           |
|  active orbit      |                                             |
|  next candidate    |                                             |
|  rate class        |                                             |
|                    |                                             |
+--------------------+---------------------------------------------+
| replay controls       sequence rail: current / next / later      |
+------------------------------------------------------------------+
```

Default behavior:

- inspector closed;
- Evidence closed;
- no full requirement matrix on first load;
- route truth visible as one line, not a full disclaimer block;
- current state card is the only primary text surface;
- bottom rail is compact but readable;
- details and evidence actions are secondary controls.

Inspector behavior:

- Details opens L1;
- Evidence opens L2;
- Archive disclosure inside Evidence opens L3;
- closing the inspector returns to the same L0 view without shifting the globe.

## Proposed Narrow Layout

Default mobile/narrow composition:

- context bar collapses to scenario and truth badge;
- handover briefing becomes a bottom sheet with a fixed collapsed height;
- sequence rail becomes horizontal scroll or stepper;
- Details/Evidence are icon buttons with accessible labels;
- inspector opens as a modal sheet, not as a cramped side panel;
- no text below `12px`, and first-read text stays at least `14px`.

## Data Completeness Rule

The redesign must not hide ITRI truth. It must place it.

Each ITRI datum must be one of:

- visible in L0 by default;
- one interaction away in L1;
- one interaction away in L2;
- retained in L3 archive/export;
- explicitly unavailable or external in L2.

No requirement may disappear because it is uncomfortable for the demo. Failed
or external requirements must remain visible in Acceptance evidence.

## Non-Goals

This redesign is not:

- a new measured-throughput implementation;
- live `ping` or `iperf`;
- NAT, ESTNeT, INET, tunnel, bridge, DUT, or NE-ONE validation;
- ITRI orbit-model live integration;
- expansion of the 13-actor route into the Phase 7.1 `>=500 LEO` scale case;
- a full F-11 arbitrary rule editor;
- an external reporting system;
- a change to endpoint pair, actor counts, route identity, or route truth
  boundary.

## Acceptance Criteria

Default viewport:

- At `1440x900`, the right inspector is closed on route load.
- At `1440x900`, no full ITRI matrix is visible on route load.
- At `1440x900`, there is exactly one primary handover briefing surface.
- Body copy in first-read surfaces is at least `14px`.
- Primary state text is at least `18px`.
- No required demo action depends on text smaller than `12px`.
- The globe and active path remain visually dominant.

Comprehension:

- With the inspector closed, a reviewer can answer the six design-goal
  questions in 10 to 15 seconds.
- The route says "modeled" before any rate, decision, or link-flow claim can be
  mistaken for measured truth.
- The current state, next state, active orbit/service path, and modeled rate
  class are visible without opening Details.

Requirement traceability:

- Every ITRI ID from the closure SDD maps to exactly one primary layer.
- V-02 through V-06 remain explicit fail/gap until retained pass evidence
  exists.
- F-13 is shown as separate Phase 7.1 evidence with freshness status, not as
  native 13-actor route closure.
- F-09/F-10/F-11/F-16 remain bounded route representations.
- L2 Evidence can export or cite the bounded F-16 package without implying
  external report-system truth.

Validation:

- Add a default-focus runtime smoke for L0.
- Add a coverage-layer runtime smoke that checks every ITRI ID has a layer and
  status.
- Keep existing truth-boundary, F-09, F-10/F-11, F-16, and requirement-gap
  smokes passing.
- Capture desktop `1440x900`, laptop `1280x720`, and mobile `390x844`
  screenshots after implementation.

## Phase Plan

### Phase 0 - Spec Lock

This document.

Deliverables:

- current UI failure statement;
- ITRI requirement layer mapping;
- first implementable slice;
- acceptance criteria that can fail when the product still fails.

### Phase 1 - Default Focus View

Goal:

- Make the default route view readable and focused before touching evidence
  depth.

Implementation scope:

- close the right inspector by default;
- introduce a single L0 handover briefing card;
- move full requirement, export, policy, and rate details out of the default
  viewport;
- reduce or merge competing top/footer chips;
- raise first-read typography;
- preserve current telemetry and truth-boundary data attributes.

Likely files:

- `src/runtime/m8a-v4-ground-station-handover-scene-controller.ts`
- `src/styles.css`
- `src/styles/m8a-v411-narrow.css`
- `tests/smoke/verify-itri-demo-view-default-focus-runtime.mjs`

### Phase 2 - Evidence And Coverage Layer

Goal:

- Move requirement closure material into a deliberate L2 Acceptance surface.

Implementation scope:

- create an Evidence/Acceptance mode or tab;
- move ITRI matrix, F-16 export, F-09 detail, and F-10/F-11 limitations into
  L2;
- add layer/status metadata for every ITRI ID;
- make V-02 through V-06 explicit fail/gap;
- show F-13 Phase 7.1 artifact freshness.

Likely tests:

- coverage-layer smoke;
- F-13 freshness-status smoke;
- V-02 to V-06 fail-status smoke.

Implementation note:

- Implemented as `itri-demo-view-acceptance-layer-runtime.v1`.
- `Details` opens L1 decision context; `Evidence` opens L2 acceptance evidence.
- L2 carries every ITRI ID with primary layer/status metadata.
- F-13 is represented as separate Phase 7.1 evidence with freshness boundary,
  not native route scale closure.
- V-02 through V-06 are explicit external fail/gap until retained pass evidence
  exists.
- F-09/F-10/F-11/F-16 remain bounded route representations.
- Runtime smoke:
  `tests/smoke/verify-itri-demo-view-acceptance-layer-runtime.mjs`.

### Phase 3 - Per-Window Focus Choreography

Goal:

- Ensure each handover window has one clear visual and narrative focus.

Implementation scope:

- synchronize the briefing card, sequence rail, globe emphasis, and transition
  cue;
- dim secondary actors when a focus actor/path is active;
- keep next candidate visible without competing with current state;
- make modeled decision reasons short and state-specific.

Implementation note:

- Implemented as `itri-demo-view-focus-choreography-runtime.v1`.
- The active replay window now resolves one shared focus contract:
  primary label, briefing line, decision now/why/watch, next focus hint, visual
  cue, secondary-actor policy, and truth boundary.
- L0 briefing, L1 decision modules, sequence rail telemetry, active rail mark,
  and document telemetry derive from that shared contract.
- Orbit-class chips now demote candidate/fallback/context actors to the
  retained 30% secondary opacity while keeping the next sequence mark visible.
- Runtime smoke:
  `tests/smoke/verify-itri-demo-view-focus-choreography-runtime.mjs`.

### Phase 4 - Narrow View Redesign

Goal:

- Make the same IA usable on mobile/narrow screenshots without shrinking text
  into unreadable labels.

Implementation scope:

- bottom-sheet briefing;
- modal inspector;
- rail stepper or horizontal rail;
- readable button targets and wrapping behavior.

Implementation note:

- Implemented as `itri-demo-view-narrow-runtime.v1`.
- Narrow/mobile route load keeps Phase 1 L0 default focus with a collapsed
  bottom-sheet briefing rather than a side rail.
- The Details/Evidence inspector presents as a modal sheet on narrow viewports
  while preserving the Phase 2 Acceptance layer and Phase 3 focus choreography
  contract.
- The sequence rail becomes a horizontal rail with readable labels and 44px
  control targets; scene-near annotation and footer truth chips are suppressed
  on narrow viewports to avoid tiny persistent text.
- Runtime smoke:
  `tests/smoke/verify-itri-demo-view-narrow-runtime.mjs`.

### Phase 5 - Reviewer Evidence Package

Goal:

- Produce evidence that measures demo comprehension, not only DOM state.

Implementation scope:

- screenshot matrix;
- first-read checklist;
- smoke artifacts for layer/status coverage;
- concise handoff note that states which ITRI requirements remain external.

## First Implementation Slice

Recommended next branch/slice name:

`itri-demo-view-redesign-phase1-default-focus`

Definition of done:

- route loads with inspector closed;
- L0 handover briefing card is the dominant text surface;
- current state, next state, active orbit/service path, modeled rate class, and
  one-line truth boundary are visible without opening Details;
- full ITRI matrix and F-16 export are absent from the default viewport but
  still reachable;
- no first-read text below `14px`;
- existing route truth smokes still pass;
- new default-focus smoke passes.

Risk:

- The existing controller centralizes many UI surfaces in one template and one
  render pass. Phase 1 should avoid broad data refactors. It should rearrange
  visibility, default state, and copy hierarchy first, then leave deeper
  component extraction for later if needed.
