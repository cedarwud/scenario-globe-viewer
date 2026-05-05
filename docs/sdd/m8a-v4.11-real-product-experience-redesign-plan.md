# M8A-V4.11 Real Product Experience Redesign Plan

Source note: this is a doc-only SDD that opens after `M8A-V4.10` closed as
"acceptance-ready" on 2026-05-01. The phase closed only because validation
tests passed — DOM checks, forbidden-claim scans, and screenshot capture all
passed. A first-time reviewer using the route reported that the result still
does not read as a product. This SDD treats that report as ground truth and
specifies what `V4.10` failed to do, even though it shipped.

This SDD does not authorize runtime implementation by itself. It mandates a
new validation contract that is harder to satisfy than `V4.10`'s DOM contract:
real reviewer comprehension, not data attributes.

Related current SDDs:
[./m8a-v4.10-product-experience-redesign-plan.md](./m8a-v4.10-product-experience-redesign-plan.md),
[./m8a-v4.10-slice5-validation-matrix-final-handoff.md](./m8a-v4.10-slice5-validation-matrix-final-handoff.md),
[./m8a-v4.6d-simulation-handover-model-contract.md](./m8a-v4.6d-simulation-handover-model-contract.md).

## Status

- planning-control SDD
- doc-only
- current as of 2026-05-02
- intended phase: `M8A-V4.11` real product experience redesign
- no runtime implementation authority by itself
- starts from the closed `M8A-V4.10` runtime baseline
- exists because `V4.10` validation passed but the product experience did not

## Why V4.10 Did Not Land As A Product

`V4.10` smoke tests pass. The reviewer did not.

Observed reviewer reactions when the route was opened cold, without reading
docs, without inspecting DOM:

- "Details has a bunch of data but I cannot tell what it does for me."
- "What is Truth even for? Why is it a separate button from Details?"
- "Why can Truth and Details not be open at the same time?"
- "The annotation that pops up near the satellite is too big, it covers the
  satellite I am supposed to be watching."
- "If a piece of information is small or short-lived, why is it crammed into
  the Details panel instead of appearing near the satellite or as a toast?"
- "I have collected a lot of real-world cross-orbit handover data — where is
  it on screen? Or is it also stuffed inside Details where I cannot see it?"

Mapped to current implementation, every reaction maps to a real DOM artifact:

| Reviewer reaction | DOM artifact | Why it fails |
| --- | --- | --- |
| "Details is data but not meaning" | `[data-m8a-v49-inspector-current]` repeats the same state copy as the scene narrative; "Why / Changed / Watch / Next" are 4 paragraphs of similar phrasing; raw actor/cue ids appear under `Implementation evidence` | The inspector reads as a debug dump because every section answers "what state is selected" and almost none answers "what should I do with this." |
| "Truth's purpose is unclear" | `m8a-v410-product-ux__boundary-surface` content is exclusively non-claim disclaimers; there is no piece of *positive* information here | Truth is a legal-style disclaimer panel given control-strip prominence equal to Details. From the reviewer's seat it is just a second button that opens a different sheet. |
| "Truth and Details mutually exclusive" | `detailsSheetState` and `boundarySurfaceState` deliberately cancel each other (controller, the v4.10 design, lines around the toggle handlers) | When a reviewer is reading a state explanation in Details, they cannot simultaneously see the truth scope of that explanation. They have to mentally hold one while opening the other. The constraint makes the product harder to use, not safer. |
| "Hover popup too big, blocks satellite" | `m8a-v47-product-ux__scene-annotation` is a permanent 360×174px panel placed next to the focus actor on every frame | This is not a hover popup — it is permanent. It is also five times larger than a satellite glyph. The reviewer reads it as "the popup that points at the wrong thing." |
| "Small/transient info should not live in Details" | There is **no** transient surface in the codebase. There is no toast, no in-scene transient marker, no small near-actor chip. Every piece of information is either persistent or hidden in a sheet. | The product has only two ranks: "always on screen forever" or "hidden in Details." Real product UIs need at least four ranks: glance / hover / pinned-inspector / archive. |
| "Real research data is buried" | The projection holds: 2 endpoint operator-family identities (CHT, Speedcast); 13 satellites with per-actor source TLE lineage (CelesTrak NORAD GP, line1/line2, fetched-at UTC); 6 unique operator-family precision evidence URLs; bounded metric class per state per actor; R2 catalog of 5 blocked candidate endpoints with per-orbit evidence strength | None of this is visible from the scene. Only operator-family **labels** are pinned to ground stations; everything else lives inside Details prose. |

`V4.10` shipped a five-state sequence rail and a compact "Truth" boundary
button. Both are real improvements over `V4.9`. They are also the only
product-visible improvements. The rest of `V4.10` improved the *scaffolding*
for a product redesign without delivering the product redesign.

## Diagnostic Principle

`V4.10`'s failure mode generalizes: **DOM correctness is not product
correctness**. The validation tests that closed `V4.10` could pass on a route
that no human reviewer would call a product. That gap is the thing this
phase exists to close.

## What V4.11 Must Do Differently

`V4.11` rules:

1. **Reviewer comprehension is the primary validation channel.** A reviewer
   who has never seen the route must be able to answer "what is happening,
   what is real, what is simulation, where do I look, what changes next" in
   under thirty seconds, with Details and Truth both closed. If they cannot,
   the slice has not landed, regardless of test status.
2. **No new DOM-only smoke that cannot fail when the product fails.** Every
   smoke must reference a behavior that a human reviewer would notice if it
   broke. Tests that only check `data-*` attributes are not sufficient; they
   are allowed only as supporting evidence.
3. **Information hierarchy is now four-rank, not two-rank.**
   - Glance: always-on, ≤24px tall, scene-anchored.
   - Hover: ≤240×140px, appears under cursor, fades on leave.
   - Pinned: ≤320×440px, requested explicitly, dismissable, never default-open
     on load.
   - Archive: full evidence inspector, only available behind a dedicated
     control, never default-open.
4. **Real research data is surfaced at the glance and hover ranks.**
   Operator-family precision badge, orbit-class evidence chips, source
   provenance badge, role token, latency-class indicator must each be
   directly visible in the default scene without opening any sheet.
5. **Transient state changes get a transient surface.** Window transitions
   produce a 2.5-second toast or scene cue. They do not require the reviewer
   to be looking at Details.

## Accepted Baseline (Unchanged From V4.10)

`V4.11` must preserve, exactly:

- route: `/?scenePreset=regional&m8aV4GroundStationScene=1`
- endpoint pair: `taiwan-cht-speedcast-singapore-operator-family-2026-04-26`
- endpoint A: Taiwan / Chunghwa Telecom multi-orbit ground infrastructure
- endpoint B: Singapore / Speedcast Singapore Teleport
- precision: `operator-family-only`
- actor set: 6 OneWeb LEO, 5 SES O3b mPOWER MEO, 2 GEO display-context actors
- model id: `m8a-v4.6d-simulation-handover-model.v1`
- runtime source boundary: repo-owned projection only
- `R2` status: read-only evidence/catalog support, not runtime selector
- the five accepted V4.6D windows in their accepted order
- `V4.10` Slice 5 validation evidence under `output/m8a-v4.10-slice5/`
- `V4.10` Slice 1-4 regression smokes (`test:m8a-v4.10:slice1..5`); `V4.11`
  may extend assertions but may not weaken them

## Non-Goals

`V4.11` is not:

- `V5`
- endpoint expansion or selector
- `R2` runtime promotion
- new endpoint pair, new actor, new orbit class
- live external source read
- measured latency / jitter / throughput / continuity values
- a real operator handover event log
- a claim that a satellite, gateway, or path is active
- a Cesium control redesign unless required to remove product overlap
- a refactor of contracts or modules without a visible product reason

## Information Architecture Change

Replace the current two-rank model:

```text
[ persistent ]   = scene narrative (360×174), control strip, sequence rail,
                   ground-station labels, satellite labels
[ on-demand  ]   = Details sheet, Truth boundary surface
```

with a four-rank model:

```text
[ glance     ]   = scene-anchored micro-cue (≤24px tall), orbit-class chip
                   on each satellite, evidence-strength chip on each ground
                   station, sequence rail, compact state strip, simulated
                   timeline
[ hover      ]   = popover under cursor on any satellite, ground station, or
                   sequence rail mark; ≤240×140; shows operator + orbit class
                   + source provenance + latency-class + role; pin-on-click
[ pinned     ]   = inspector panel, ≤320×440, opened by explicit Details/
                   Truth action, supports 2 visible roles concurrently
                   (state evidence and truth boundary), dismissable
[ archive    ]   = full implementation evidence (raw ids, candidate arrays,
                   debug dumps), collapsed by default, behind a dedicated
                   "implementation evidence" toggle inside the pinned
                   inspector
```

The current `m8a-v47-product-ux__scene-annotation` (360×174) is removed in
its current form. Its content is split:

- title + first-read line → glance-rank micro-cue, ≤24px tall, anchored to
  the focus actor
- watch cue → glance-rank scene chip, anchored to the watch cue actor
- next-state hint → sequence rail (already exists)

## Truth And Details Concurrency

The `V4.10` rule that Details and Truth cannot be open at once is removed.

`V4.11` replaces it with one inspector surface that has two roles, and both
roles can be visible at the same time:

- "State evidence" role: what the active window means, what changed, what
  to watch, what is next
- "Truth boundary" role: what is not being claimed in this window

Concurrency rules:

- the inspector is closed by default
- "Details" opens the State Evidence role at the top of the inspector
- "Truth" opens the Truth Boundary role and scrolls/jumps to it
- if one role is open and the other is requested, the inspector keeps both
  open and lets the user see them together
- closing the inspector closes both roles
- the inspector never auto-opens on transition

This is a behavior change, not just a styling change. The smoke test must
verify the concurrent-open path.

## Hover Affordance Contract

`V4.11` must add a real hover affordance because the product currently has
none. The contract:

- hovering any satellite glyph, ground-station marker, or sequence-rail mark
  for ≥150ms shows a popover under the cursor
- popover ≤240px wide, ≤140px tall
- popover content (satellite hover):
  - line 1: operator family name (e.g., "Eutelsat OneWeb")
  - line 2: orbit class chip (LEO / MEO / GEO) + role token (focus / watch /
    candidate / continuity-hold / guard / fallback)
  - line 3: source provenance chip ("CelesTrak NORAD GP TLE 2026-04-26")
  - line 4: bounded latency class ("low-latency context class")
  - line 5: non-claim micro-stamp ("display-context, not active serving")
- popover content (ground-station hover):
  - line 1: operator family name
  - line 2: precision chip ("operator-family precision")
  - line 3: orbit-class evidence chips (LEO strong, MEO strong, GEO strong)
  - line 4: evidence URL count badge ("3 sources" → click pins inspector
    to a sources view)
- popover content (sequence-rail mark hover):
  - line 1: window product title (e.g., "MEO continuity hold")
  - line 2: simulated trigger ("LEO geometry aging triggers MEO hold")
  - line 3: bounded metric classes for that window
- pop-up must respect `prefers-reduced-motion`
- click pins the popover content into the inspector and the inspector opens
- popover follows accessibility rules: focusable for keyboard navigation,
  dismissed on Escape, visible on focus (not only mouse hover)

## Transient Surface (Toast / Scene Cue) Contract

`V4.11` must add a transient surface because the product currently has none.

When the V4.6D window transitions:

- emit a 2.5s toast in the upper-left of the canvas, ≤320×72, with title
  ("LEO pressure → MEO continuity hold") and one supporting line
- emit a brief scene cue near the new focus actor: ≤180×24 chip that fades
  in over 200ms, persists 2s, then fades to the glance-rank chip
- toasts are stackable up to two; older toasts fade earlier
- toasts respect `prefers-reduced-motion` (instant in/out, no slide)
- toasts are mirrored as ARIA `role="status"` for screen readers
- toasts do not block any control or satellite glyph (max-width derived
  from the canvas, never larger than 22% of canvas width)
- the persistent five-state sequence rail still shows the new active and
  next states as before

## Real-Data Surfacing Contract

The following real-research items must be visible in the default load,
without opening any sheet, without hovering anything:

- ground station A precision chip: "operator-family precision"
- ground station B precision chip: "operator-family precision"
- ground station A orbit-evidence triplet: "LEO strong | MEO strong | GEO
  strong" (compact, ≤16px text, color-coded by strength)
- ground station B orbit-evidence triplet: same shape
- per-satellite orbit-class chip on each glyph: "LEO" / "MEO" / "GEO"
- focus actor role token: "focus" near the active LEO actor only
- model truth chip on the simulated timeline: "simulation review"
- source provenance summary in the corner of the canvas: "TLE: CelesTrak
  NORAD GP · fetched 2026-04-26 · 13 actors"

These chips replace the current verbose ground-station labels
("Singapore / Speedcast operator-family anchor / operator-family precision"
on two lines) with single-line scannable chips.

## Layout Target

```text
+------------------------------------------------------------------+
| [state-strip]  ...  [orbit-focus chip]  [now/next]  [toast slot] |
|                                                                  |
|        SPACE / GLOBE AS PRIMARY WORKSPACE                        |
|                                                                  |
|     scene-anchored micro-cue near focus actor (≤24px)            |
|     orbit-class chips ON each satellite glyph                    |
|     ground-station precision chip + evidence triplet             |
|                                                                  |
|     [hover popover under cursor on demand, ≤240×140]             |
|                                                                  |
|     [Sequence rail: 5 ordered marks, active + next emphasized]   |
|                                              [Details] [Truth]   |
|     [TLE source provenance corner badge ........................ |
+------------------------------------------------------------------+
```

When the inspector is opened (by Details or Truth):

```text
+------------------------------------------------------------------+
|                                              [ Inspector ]       |
|                                              [ State evidence ]  |
|        scene narrative remains visible       [ Truth boundary ]  |
|                                              [ Sources ]         |
|                                              [ Implementation    |
|                                                evidence (closed)]|
+------------------------------------------------------------------+
```

The pinned inspector is ≤320px wide and ≤calc(100vh - 9.5rem) tall, fits to
the right side, and never spans more than 28% of canvas width on desktop.

## Required Runtime Slices

This SDD is doc-only. If runtime implementation is opened later, use these
slices in order. Each slice closes only with reviewer-comprehension evidence.

### Slice 0 - Baseline And Target Lock

No product runtime change.

Tasks:

- capture current `V4.10` default at 1440×900, 1280×720, 390×844 — already
  in `output/m8a-v4.10-slice5/`, but reannotate for V4.11 baseline
- write a one-page reviewer-comprehension protocol: what to ask, in what
  order, with what visual prompts
- run the protocol on at least one reviewer who has not seen the route
- write the V4.11 target storyboard for all five windows
- write the V4.11 reviewer-comprehension target answers per window
- get planning/control acceptance before any runtime code starts

Acceptance:

- baseline reviewer transcript exists and shows V4.10 fails the protocol
- target storyboard exists for all five V4.6D windows
- planning/control approves Slice 0

### Slice 1 - Glance-Rank Surface

Goal: replace the 360×174 scene annotation with glance-rank micro-cues.

Scope:

- remove or reduce `m8a-v47-product-ux__scene-annotation` to ≤24px tall
  scene-anchored cue
- add per-satellite orbit-class chip
- add ground-station precision chip + evidence triplet
- add corner source-provenance badge
- preserve sequence rail, control strip, simulated timeline

Acceptance:

- default 1440×900 capture shows ≥4 distinct real-data chips visible without
  any hover or click
- the previous 360×174 scene-annotation panel no longer occupies the canvas
  in the default view
- reviewer-comprehension protocol passes on questions 1-3 (what is active,
  which orbit class, where do I look)

### Slice 2 - Hover Popover

Goal: introduce hover-rank affordance.

Scope:

- implement hover popover for satellites, ground stations, and sequence rail
- popover follows the dimensional and content contract above
- click-to-pin opens the inspector with the relevant role
- keyboard focus parity (Tab + Escape)

Acceptance:

- mouse hover on a satellite shows a popover within 200ms
- popover never exceeds 240×140
- pinned-on-click opens inspector with the satellite's evidence as the
  primary view
- reviewer-comprehension protocol passes on question 4 (what is real
  source data)

### Slice 3 - Inspector Concurrency Redesign

Goal: replace the V4.10 mutual-exclusion behavior with a single inspector
that supports both State Evidence and Truth Boundary roles, concurrently.

Scope:

- merge `m8a-v410-product-ux__details-sheet` and
  `m8a-v410-product-ux__boundary-surface` into one panel
- add anchor-jump behavior: Details button scrolls/focuses State Evidence;
  Truth button scrolls/focuses Truth Boundary
- both roles render at the same time when both are requested
- the implementation evidence remains collapsed by default

Acceptance:

- clicking Details then clicking Truth without closing produces a panel
  with both roles visible
- closing the panel from any control closes both roles
- existing V4.9/V4.10 regression smokes for "details default closed,"
  "truth default closed," "no forbidden claims," "five-state order" still
  pass
- reviewer-comprehension protocol passes on question 5 (what is not being
  claimed) without needing to memorize the difference between two buttons

### Slice 4 - Transition Toast And Scene Cue

Goal: introduce transient-rank surface.

Scope:

- emit a 2.5s toast on every V4.6D window transition
- emit a brief scene cue chip near the new focus actor
- both fade with a max-2-stack policy
- toast respects reduced-motion and is mirrored to ARIA live region

Acceptance:

- V4.6D transition `leo-aging-pressure → meo-continuity-hold` triggers
  exactly one toast and one scene cue, both within 250ms
- toast text references the current and next windows in product copy
  (no raw window ids)
- toast never overlaps a control surface or sequence rail
- reduced-motion mode renders the toast statically without animation
- ARIA live region announces the transition to assistive tech

### Slice 5 - Real-Data Surfacing And Source Provenance

Goal: surface the existing real-research data so a reviewer sees it on the
default load.

Scope:

- ground-station precision and evidence chips become first-class glance
  elements
- corner source-provenance badge "TLE: CelesTrak NORAD GP · fetched
  2026-04-26 · 13 actors" lives by default
- click on the corner badge opens the inspector "Sources" role with the
  full source URL list, fetched-at UTCs, and per-actor TLE record names
- click on any orbit-evidence chip opens the inspector "Sources" role
  filtered to that orbit class

Acceptance:

- a reviewer can identify the source of the displayed actor positions
  (CelesTrak NORAD GP TLE) within ten seconds, without opening Details
- a reviewer can read the operator-family precision claim of each
  ground station from the default view
- a reviewer can see at least one piece of orbit-class evidence per
  ground station from the default view
- existing R2 read-only boundary preserved (no candidate endpoints
  promoted)

### Slice 6 - Validation Matrix With Real Reviewers

Goal: prove product comprehension, not DOM correctness.

Scope:

- run the Slice 0 protocol on at least three reviewers who have not seen
  the route
- record their answers per window per question
- compare with the target answers
- close the phase only if comprehension target is met

Acceptance:

- ≥3 reviewers can answer ≥4/5 protocol questions correctly per window in
  ≤30 seconds, without opening Details or Truth
- before/after screenshots show clear visible difference from V4.10
- visual acceptance reviewer-checklist below all pass
- no V4.10/V4.9/V4.8 regression smoke regresses

## Manual Reviewer Checklist (V4.11)

Before V4.11 closure, a reviewer who has never seen the route must answer
yes to all of these from the default 1440×900 view:

- I can see the active orbit class focus from a glance.
- I can see what to watch in the scene from a glance.
- I can see what state is next from a glance.
- I can see that this is a simulation, not a live operator log, from a
  glance.
- I can hover any satellite and see who operates it.
- I can hover any ground station and see what evidence supports its claim
  to multi-orbit capability.
- I can see the source of the displayed satellite positions from a glance
  (TLE provenance).
- I can open Details and Truth at the same time.
- I can dismiss the inspector from any state without losing my orientation.
- The default scene narrative does not block the satellite I am supposed to
  watch.
- A state transition draws my attention without forcing me to read text.

If any answer is no, V4.11 is not complete. The validation matrix must
record reviewer transcripts.

## Smoke Acceptance Criteria

Smoke must:

- assert glance-rank chips are visible and within their dimensional budget
  in the default view at 1440×900, 1280×720, and 390×844
- assert hover popover appears within 200ms on satellite, ground station,
  and sequence-rail hover; assert dimensional budget; assert content
  shape includes operator + orbit class + source + role
- assert inspector concurrency: opening State Evidence and then Truth
  Boundary leaves both visible
- assert transition toast: exactly one toast per V4.6D window transition;
  bounded duration; bounded position; reduced-motion respected
- assert real-data surfacing: corner source-provenance badge, ground
  station evidence chips visible by default
- preserve every V4.10 invariant smoke (route, pair, precision, actor set,
  source boundary, R2 read-only, V4.6D model id, no forbidden claims)
- include at least one **negative** smoke per slice that fails when the
  visible product fails (e.g., scene-annotation panel size budget, toast
  presence on transition, hover popover presence on satellite)

## Denied Completion Patterns

Do not close `V4.11` if:

- the implementation only adds new data attributes
- screenshots look substantially the same as V4.10
- Details remains the primary explanation surface
- the inspector still forbids concurrent open of State Evidence and Truth
  Boundary roles
- there is no transient surface (toast / scene cue) on transition
- there is no hover popover on satellites
- the 360×174 scene-annotation panel still occupies its current real estate
- visual acceptance is replaced by DOM-only smoke tests
- no reviewer-comprehension transcripts are part of the final handoff

## Runtime Opening Conditions

Runtime implementation may open only after:

- this SDD is explicitly accepted
- `V4.10` Slice 5 final handoff is read as the latest closeout state
- planning/control explicitly opens `V4.11` Slice 0 first
- Slice 0 baseline + storyboard are accepted before runtime code starts
- implementation scope remains product-visible experience redesign for
  the accepted single scenario
- route, endpoint pair, precision, actor set, source boundary, R2
  read-only boundary, and V4.6D model truth remain unchanged

## Blocked Unless A Future SDD Changes Scope

- endpoint selector
- endpoint expansion
- new endpoint pair
- new source data
- live external source read
- actor-set expansion
- precision expansion beyond operator-family-only
- active satellite/gateway/path/native RF handover claims
- measured latency/jitter/throughput/continuity values
- R2 runtime promotion
- V5 scenario-selection work
- copy that implies real operator logs or measured handover events

## External Reference Translation

`V4.11` keeps `V4.10`'s External Reference Translation Contract and
extends it with a hover-and-toast row.

| Reference pattern | V4.11 hard requirement | Invalid implementation |
| --- | --- | --- |
| Flightradar24 / MarineTraffic object hover | Hovering a satellite or ground station produces a compact popover with operator + orbit class + source + role within 200ms; click to pin into inspector | A second persistent panel near the satellite that is on by default |
| Grafana annotation toasts | Window transitions emit a transient toast and a scene cue; both auto-dismiss; live-region mirrored | A persistent ribbon at the top, or a state-change message buried in Details |
| NASA Eyes scene-first composition | Default load has ≤1 small (≤24px tall) scene-anchored micro-cue near the focus actor; the rest is glance chips and the sequence rail | A 360×174 panel pinned next to the satellite |
| Mission ops decision dashboards | Inspector is one surface with State Evidence and Truth Boundary as concurrent roles; closing dismisses both | Two mutually-exclusive sheets that the reviewer cannot reconcile in their head |
| Source-of-truth attribution chips | Ground stations carry an inline precision chip and orbit-evidence triplet; the canvas corner shows the TLE provenance summary; click opens the Sources role of the inspector | All source data only available by opening Details and reading the prose |

## Handoff Note To Planning Control

This SDD is a real critique of `V4.10`. It is not a request to redo `V4.10`.
`V4.10` left behind useful scaffolding — the V4.6D model, the five-state
rail, the closed-by-default Details, the boundary surface, the screenshot
capture pipeline. `V4.11` reuses all of it. What `V4.11` changes is the
information rank model, the way the scene is annotated, and the validation
contract. Planning control should treat `V4.11` as a focused product fix
inside the same scenario, not as a new phase.
