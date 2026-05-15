# M8A-V4.11 Storyboard Rewrite Proposal — Per-Window Operator Concern

Date: 2026-05-03 (v2, reviewer feedback incorporated)
Status: **proposal**, not SDD authority, not implementation prompt
Origin: planning/control after user feedback that V4.11 Slice 0 storyboard
applies a uniform info schema to all 5 V4.6D windows, producing
"same screen with different chip text"

## Revision log

- **v1 (2026-05-03)**: initial per-window operator-concern rewrite
- **v2 (2026-05-03)**: integrate UX reviewer feedback. Changes:
  - Per-window questions reframed to lead with **link quality / when switch / why switch**, not internal handover narrative
  - Layperson glossary upgraded to reviewer-recommended plain-language terms
  - Visual-token spec now concrete (shape / color / opacity / motion / radius / duration), not adjectives
  - Truth footer upgraded from one-line to a **chip system** with W5 high-prominence variant
  - **Scene-context chip** added: "13-actor demo; Scale evidence (>=500 LEO) lives in Phase 7.1"
  - **Smoke impact matrix** added (13 affected smoke surfaces enumerated)
  - Honest implementation cost revised to **3-4 conversations**, not 1-2

## Why this proposal exists

V4.11 Slice 1–5 implemented exactly what V4.11 SDD specified. The SDD has a
gap: §Five-Window Storyboard treats all 5 windows as the same template, and
the language is engineering-side. Different operator concerns cannot be
answered by the same template; layperson cannot read engineering vocabulary.

This proposal does not modify any runtime, smoke, or accepted V4.6D contract.
It proposes amendments to V4.11 §Storyboard and the visual contracts for
Slices 1, 2, 3, 5.

## Core principle

Each window foregrounds a **link-quality / decision** read of "what's
happening, when's the switch, why". Other information is demoted to
ambient. Truth boundary is a footer chip system, not a co-equal inspector
role. Scene-context chip names what scope this scene actually covers.
Language is layperson plain English.

## Per-window rewrite

Numbers below are illustrative (114-min simulated session × 5 windows ×
~22 min each). Implementation derives actual numbers from V4.6D ratio
mapping.

### W1 — LEO Acquisition

Lead question: **"How is the link quality right now? How much longer can this LEO be used?"**

Foreground:

- **Link quality readout** (large text, near focus actor): e.g. "Strong · direct LEO link"
- Focus LEO visual emphasis: rising arc trail (see §Visual Token Spec)
- Service duration indicator: "Service time: ~22 minutes"
- Next event preview: "Next: signal weakening (in 22 minutes)"

Demoted to ambient:

- Other LEO/MEO/GEO actors — only orbit-class chip remains, 30% opacity
- Corner provenance footer — persistently visible, not foregrounded

Hover on focus LEO (3 lines):

- "OneWeb LEO · looking at this one"
- "Link quality: strong"
- "Service time: ~22 minutes"

Inspector (single role, opens on click):

- "Just connected to OneWeb LEO, link quality is strong. In about 22 minutes,
  geometry change will move it into the signal-weakening stage."

### W2 — LEO Aging Pressure

Lead question: **"Quality is dropping; when do we switch, and why?"**

Foreground:

- **Link quality degradation indicator** (horizontal bar animating strong->medium->weak)
- Switch countdown: "Switch to MEO: ~10 minutes"
- **Switch reason chip** (prominent): "Geometry degrading"
- Focus LEO visual emphasis: fading arc trail

Demoted:

- Non-active LEO actors — very dim
- GEO — only a single footer line "Guard coverage on standby"

Hover on focus LEO:

- "OneWeb LEO · signal weakening"
- "Switch in ~10 minutes"
- "Geometry degrading"

Hover on incoming MEO (phase-specific):

- "SES O3b mPOWER MEO · about to take over"
- "Holding briefly for ~22 minutes"

Inspector:

- "The LEO geometry is degrading. In about 10 minutes the connection will
  switch to the broader-coverage MEO for a brief hold."

### W3 — MEO Continuity Hold

Lead question: **"Running broad coverage on MEO; how long can it hold, and why MEO?"**

Foreground:

- **MEO hold duration bar**: "Holding briefly for ~22 minutes"
- **Coverage type description**: "Broad coverage · slightly higher latency"
- Estimated new LEO arrival: "New LEO arrives in ~14 minutes"
- Focus MEO: steady wide-coverage shading

Demoted:

- Non-candidate LEO actors — dim
- Re-entry candidate LEO — small pulse preview
- GEO — ambient

Hover on focus MEO:

- "SES O3b mPOWER MEO · holding briefly"
- "Holding briefly for ~22 minutes"
- "New LEO returning soon"

Inspector:

- "MEO is currently holding briefly. Coverage is broad but latency is
  slightly higher. The simulation expects a new LEO candidate in about
  14 minutes."

### W4 — LEO Re-entry Candidate

Lead question: **"A new LEO is back; is the quality good enough to switch over?"**

Foreground:

- **Candidate LEO quality readout** (large text): "Candidate quality: strong / medium / weak"
- Estimated service duration after switch-back: "If switched back: ~22 minutes low latency"
- MEO is still backstop: "MEO is still holding, decision can wait"
- Candidate LEO: candidate pulse

Demoted:

- Other LEO actors — dim
- GEO — ambient

Hover on candidate LEO:

- "OneWeb LEO · candidate"
- "Quality: strong"
- "If switched back: ~22 minutes"

Hover on continuing MEO:

- "MEO · still holding"
- "Can wait for decision"

Inspector:

- "A new LEO has entered the candidate range. Geometry predicts about 22
  minutes of low-latency service after switching back. MEO is still
  holding, so there is no immediate switching pressure."

### W5 — GEO Continuity Guard

Lead question: **"Why keep GEO around? When does this segment end?"**

Foreground:

- **GEO role description** (prominent): "Guard coverage · always reachable"
- Sequence-end countdown: "Sequence ends: ~5 minutes · restart to view again"
- GEO actor: steady ring
- LEO/MEO: heavily dimmed

Demoted:

- LEO/MEO actors — lowest presence
- Next-segment hint replaced by **restart button**

Hover on GEO:

- "Singtel/SES GEO · guard coverage"
- "Always reachable"
- "Sequence ending soon"

Inspector:

- "GEO serves as the guard coverage role, always reachable, but this is
  only a simulation view, not actual failover evidence. The sequence
  ends here."

## Cross-window changes

### Footer chip system (replaces Truth button)

A single footer row at the bottom, containing 4 chips:

```
[Simulation view]  [operator-family precision]  [TLE: CelesTrak NORAD GP · 2026-04-26]  [13 actors]
```

W5 adds one additional high-prominence chip (red/orange outline):

```
[⚠ Not actual failover evidence]
```

- High-prominence chip uses outline + slightly larger font
- The other 4 chips are ambient (light gray background, small font, not attention-grabbing)
- No more "Truth" button; concurrency is simplified to a single-role inspector

### Scene-context chip (**new**)

A persistent chip at the **top center** of the canvas:

```
This is a 13-actor simulation view · Full >=500 LEO multi-orbit validation lives in Phase 7.1
```

- Medium font, light background
- Optional click action: jump to Phase 7.1 readout (if present) or show a "Phase 7.1 in progress" note
- Resolves reviewer Q5: reviewers immediately understand this scene's scope and won't mistakenly
  assume it is the full customer deliverable

### Inspector becomes single-role

- Remove the parallel Truth Boundary role
- Split the original Truth content between footer (general parts) + inspector State Evidence
  tail (specific non-claim descriptions)
- Inspector open/close behavior: click Details / focus actor -> open; click X or outside -> close
- Slice 3 concurrency removed

## Layperson glossary (reviewer plain-language version adopted)

| Engineering term (current SDD) | Layperson English (adopted from reviewer suggestion) |
|---|---|
| `holding` | holding briefly |
| `guard / persistent reach` | guard coverage |
| `geometry shifting` / `changing-geometry` | geometry degrading |
| `review only` / `display-context, not active serving` | simulation view |
| `display representative actor` / `focus` | looking at this one |
| `candidate-capacity context class` | (not shown by default) |
| `continuity-hold class` | holding briefly |
| `guard-context continuity class` | guard coverage |
| `low-latency context class` | low latency |
| `mid-latency continuity class` | slightly higher latency |
| `higher-latency continuity class` | high latency (guard use) |
| `operator-family precision` | (retained in English in footer, since it is a technical precision term) |
| `simulation review` | simulation view |
| `not active failover proof` | not actual failover evidence |
| `TLE: CelesTrak NORAD GP · fetched 2026-04-26 · 13 actors` | split into three footer chips: [TLE source] [date] [13 actors] |

## Visual Token Spec (replaces "adjectives")

The focus actor visual in each window is composed of the following tokens. Implementation
must satisfy the concrete dimensions, not just the literal meaning of phrases like "rising arc".

### W1 — Rising arc trail

- Shape: polyline trail along the focus LEO's ground track
- Start: acquisition point (LEO position at the start of W1)
- End: current position
- Color: cyan `#00d4ff`
- Opacity: linear gradient from 0% (start) to 100% (current)
- Width: 3 px
- Motion: current position extends as replay advances; start is fixed
- Duration: entire W1 window

### W2 — Fading arc trail

- Shape: polyline trail (past 30 simulated seconds) + predicted polyline (next
  60 simulated seconds, dashed)
- Color: amber->red gradient (mapped to quality; quality goes strong->weak through W2)
- Opacity: current=100%, past/future tails=20%
- Width: 3 px
- Motion: red ratio grows with aging
- Duration: entire W2 window

### W3 — Steady wide-coverage shading

- Shape: ground disk (Cesium ellipse or polygon) centered on the MEO ground-projection
- Radius: ~1500 km nominal (per V4.6D MEO geometry class)
- Color: muted blue `#5b8db8`
- Opacity: 30%
- Motion: 0.5 Hz slow breathing (30%->35%->30%), not fast, to avoid distraction
- Duration: entire W3 window

### W4 — Candidate pulse

- Shape: concentric expanding rings around the candidate LEO
- Start radius: 50 px screen-space
- End radius: 200 px screen-space (fade out)
- Color: strong=green `#5bd99c` / mid=amber `#e8b04a` / weak=orange `#ff9a4a`
- Opacity: 80% inside -> 0% outside
- Motion: 1 Hz pulse (one expansion per second)
- Duration: entire W4 window

### W5 — Steady ring

- Shape: halo ring around the GEO actor
- Radius: 80 px screen-space
- Color: gold `#e8c860`
- Opacity: 60% steady
- Motion: none (steady = guard semantics)
- Duration: entire W5 window

### Demoted actor visual (across windows)

- Opacity: 30% sustained
- Color: gray `#888888`
- No trail / pulse / ring / shading
- Orbit-class chip retained but with reduced opacity

### Other foreground vs ambient

- Link quality readout (W1/W2/W4): 18px font, dark text, white background pill
- Switch countdown / duration (W2/W3/W4/W5): 14px font, accent color
- Focus-actor micro-cue: <=14px font, adjacent to actor billboard, max
  180x24

## Smoke Impact Matrix (**new**, recorded honestly)

The table below lists which existing smoke files will be affected once this
proposal lands. Reviewer Q6 was right to challenge "1-2 conversations is too
optimistic."

| Smoke file | Existing assertion | Impact from this proposal | What the smoke needs |
|---|---|---|---|
| Slice 1 negative smoke | 13 orbit-class chips default visible | Retained, but demoted-actor chips have reduced opacity | Add opacity tolerance |
| Slice 1 negative smoke | 2 ground-station precision chips + triplet default visible | **Removed** ground-station chip + triplet (info moves to footer) | Major rewrite + disclosure |
| Slice 1 negative smoke | Corner provenance badge default visible | Replaced by footer chip system | Rewrite footer assertion |
| Slice 2 hover smoke | 5-line popover content schema | Shrunk to 3 lines + phase-specific content | Rewrite expected hover content per window |
| Slice 2 hover smoke | popover <=240x140 | May be smaller (3 lines) | Tighten budget |
| Slice 3 concurrency smoke | Truth Boundary role can open concurrently | **Remove** Truth role; single-role inspector | Full rewrite |
| Slice 3 smoke | Truth button trigger | **Remove** Truth button | Rewrite |
| Slice 4 toast smoke | Toast text copied verbatim from Slice 0 storyboard | Text refreshed per phase-specific copy | Copy update |
| Slice 5 smoke | Corner badge click -> Sources role | **Demote**: corner badge becomes footer chip; Sources moves into the inspector advanced toggle | Rewrite affordance assertion |
| Slice 5 smoke | Orbit-evidence chip click -> filtered Sources | **Remove** orbit-evidence chip | Full rewrite |
| Slice 5 smoke | Sources role contains 13 TLE + 5 R2 + 2 ground stations | Retained (moved to inspector advanced) | Path adjustment |
| V4.10 slice3/4/5 smoke | Truth boundary surface separation | Further softened (already disclosed once at Slice 3) | Additional Smoke Softening Disclosure |
| V4.8 / V4.9 smoke | Inspector layout shape | Further adjustment | Additional disclosure |

**Estimate: 13 smoke points need updating.** The Lock-in J disclosure will be
bigger than the Slice 3 disclosure (Slice 3 only touched 7 disclosure points).

## Honest implementation footprint (v2 revision)

It is not "1-2 implementation conversations". Honest estimate:

1. **Conversation 1: visual token + scene-context chip**
   Implement 5 visual tokens (rising arc / fading arc / steady shading / pulse
   / steady ring), add scene-context chip, update Slice 1 existing chip transparency.

2. **Conversation 2: hover popover + inspector single-role rewrite**
   Rewrite Slice 2 hover content (5 lines -> 3 phase-specific lines), close out
   the Slice 3 Truth Boundary role, switch inspector to single role + rewrite
   State Evidence.

3. **Conversation 3: footer chip system + Truth removal + Slice 5 demote**
   Implement footer chip system (4 standard + W5 high-prominence), remove the
   Truth button, demote Slice 5 affordance (chip moves into inspector advanced).

4. **Conversation 4: smoke matrix update + Lock-in J full disclosure**
   Update 13 smoke points, write disclosure docs, run the full regression.

Each conversation is estimated at 1.5-2 hours of implementation work +
reconciliation. **Total: 4 conversations x ~2 hours = 8 hours +
reconciliation overhead**.

## What this proposal cannot fix (honest disclosure)

The core point reviewer Q7 caught: **this proposal reduces information noise,
but the things the customer cares about most for acceptance — "scale,
measurement, parameters, output" — still are not in this scene.**

Strategies that mitigate but cannot eliminate this gap:

- The scene-context chip states explicitly "13-actor demo; Scale evidence
  (>=500 LEO) lives in Phase 7.1" — so reviewers immediately know this scene
  is not the full customer deliverable
- The inspector advanced toggle can include cross-links to the Phase 6 readout
  (comm time, handover decision, physical input, validation boundary — the
  four panels that are already closed)
- Do not pretend this scene solves a must-have; it only addresses the smaller
  goal of "making the defensible scenario feel product-like"

## Addendum 1 — Round 2 reviewer gaps closed (2026-05-03)

Round 2 verification results from the UX-side reviewer: V1/V3/V4/V5 PASS,
V2/V6 PARTIAL, V7 raised 7 new issues, V8 raised the biggest concern that
countdown numbers had no V4.6D contract. This addendum closes them out one
by one.

### 1.1 Countdown derivation rule (V7-#1 + V8)

The V4.6D contract `m8a-v4.6d-simulation-handover-model.v1` explicitly forbids
`numericLatencyAllowed/JitterAllowed/ThroughputAllowed`, but **does not forbid
window-progress-derived time numbers**. This proposal's countdown follows the
rule below (it qualifies as a V4.6D **derivation rule**, not a V4.6D expansion,
and not a measured metric):

```
withinWindowFraction = (replayRatio - window.startRatioInclusive)
                       / (window.stopRatioExclusive - window.startRatioInclusive)
remainingFraction = 1 - withinWindowFraction
remainingSimulatedSec = remainingFraction
                        × (window.stopRatioExclusive - window.startRatioInclusive)
                        × FULL_REPLAY_SIMULATED_SECONDS

displayString = formatApproximate(remainingSimulatedSec)
              = "~N minutes" (<=60 min displays minutes, >60 displays hours)
              = "~N seconds" (<=60 sec)
```

`FULL_REPLAY_SIMULATED_SECONDS` is an existing V4.6A baseline value (see the
V4.6B projection spec); it is not a newly added contract. `replayRatio` is an
existing V4.6D input. So the countdown is a deterministic derivation of two
existing inputs, **not a new measured or claimed value**.

The implementation must add a small annotation "~ = simulated value" near the
footer chip so laypersons do not mistake it for a measured countdown.

Forbidden-claim scan **needs no change**: these strings are not latency /
jitter / throughput, and they have no overlap with the keys listed by V4.6D
§Forbidden-Claim Scan Policy.

### 1.2 Inspector copy full layperson sweep (V2 PARTIAL)

Fix the following three items:

| Location | v2 text | Addendum fix |
|---|---|---|
| W3 inspector | "a new LEO candidate will appear" | "a new candidate LEO will appear" |
| W4 inspector | "geometry predicts about 22 minutes of low-latency service after switching back" | "based on geometry prediction, about 22 minutes of low latency after switching back" |
| W5 inspector | "not actual failover evidence" (English `failover`) | "not actual failover evidence" (Addendum §1.2 (formerly Chinese rewording)) |

W4 hover is updated in sync: `"OneWeb LEO · candidate"` -> already plain language, OK.
W5 hover "sequence ending soon" -> OK.

The word "failover": the glossary accepts keeping `failover` in English for the
W5 footer chip (the chip is a shortened form, and laypersons easily understand
it as "switching"), but the inspector copy uses the layperson term consistently.

### 1.3 Visual-token Cesium feasibility quick-check (V7-#4)

| Token | Risk | Cesium-feasible path |
|---|---|---|
| polyline alpha gradient 0%->100% | Native `PolylineMaterialProperty` does not support per-vertex alpha | **Switch to 5-8 polyline segments, each with stepped alpha** (sandcastle `Polyline Per-segment Coloring` pattern); or write a custom `Material`, but the former is cheaper |
| 0.5 Hz breathing opacity / 1 Hz pulse | `CallbackProperty` per-frame is feasible; frame budget risk is low (13 actors + ~5 dynamic properties) | **Adopt CallbackProperty**; conv 1 measures 60fps frame budget first; if it fails, fall back to 0.25 Hz / 0.5 Hz |
| 1500 km MEO disk visually dominates | At the default Taiwan-Singapore camera distance, it would consume most of the scene | **Reduce radius to 800 km** (still a plausible MEO footprint scale); or switch to an outline ring with no fill (visually ~70% lighter than a filled disk); conv 1 tests both |
| amber->red gradient (W2) requires within-window time progress | V4.6D already provides `replayRatio` + window range, from which `withinWindowFraction` can be derived (same as §1.1) | **Use the §1.1 `withinWindowFraction` directly to drive the gradient lerp** |

Decision: **conv 1 must first spike all 5 Cesium token implementations**
(<=30 min spike); only continue to conv 2/3/4 once they pass; if any spike
fails -> revert to this addendum and fix the spec.

### 1.4 Scene-context chip dimensional spec (V7-#3 + V5 caveats)

Spec additions:

- Font size: 14 px
- Max width: 380 px
- Height: 28 px
- Background: `#F5F5F5` (light gray, unobtrusive)
- Border: 1 px solid `#D0D0D0`
- Corner radius: 6 px
- Position: top center, 16 px from canvas top edge
- Text: "13-satellite simulation view; Full >=500 LEO multi-orbit validation lives in a later phase"

Replace `Phase 7.1` with "a later phase" — laypersons can understand it
without exposing internal phase nomenclature.

Click behavior: v1's wording "if present" was too loose. Confirmed version:
**click** expands into a <=320x140 popover showing "this scene's scope
description + links to Phase 6 accepted items (comm time / handover
decision / physical input / validation boundary)". If the Phase 6 panel
does not exist in this viewer route (cross-link required to another route),
the popover provides a link; if the panel exists in the same route, provide
an anchor. Conv 1 confirms the link target.

### 1.5 Ground-station evidence visibility regression (V7-#5)

v2 moved the ground-station precision chip + LEO/MEO/GEO triplet into the
footer as global chips — the reviewer caught that this would visually erase
the per-station multi-orbit evidence, conflicting with customer F-02
(multi-orbit visual evidence).

Addendum fix: keep a **short bar chip** next to the ground station, smaller
than the v1 triplet:

```
[LEO MEO GEO ✓]
```

- Font 11 px, height 18 px, max width 96 px
- Just below the ground-station billboard
- One per ground station (two total)
- Does not expand into a triplet, does not wrap; clicking opens a hover popover
  with the full triplet details

This is 75% smaller than the v1 two-line >=320x34 label, while preserving
intuitive per-station multi-orbit evidence. It does not overlap with the
footer (the footer carries simulation/precision/source global chips; the
ground-station chip is a per-station multi-orbit evidence chip — different
responsibilities).

### 1.6 Bottom-area layout spec (V7-#6)

Adding an explicit layout spec:

```
+----------------------------------------------------------+
|        [scene-context chip 14px <=380x28]                |  <- top center, 16px from edge
|                                                          |
| [state strip 14px]                       [toast slot]    |  <- top corners
|                                                          |
|                                                          |
|              GLOBE PRIMARY WORKSPACE                     |
|            (focus actor + visual token)                  |
|                                                          |
|                  [GS chip 11px]                          |  <- per ground station
|                  [GS chip 11px]                          |
|                                                          |
|     [5-state sequence rail 14px ~832x56]                 |  <- bottom center
|                                                          |
| [Simulation view] [precision] [TLE] [13 actors] [Details]|  <- footer chip row + Details button
|                       (W5 only +[⚠ Not actual failover evidence])  |
+----------------------------------------------------------+
```

z-order and spacing:

- Footer chip row: height 24 px, 12 px above sequence rail
- Sequence rail bottom is 56 px above canvas bottom
- W5 high-prominence chip sits on the **right side** of the footer chip row, in line with the Details button
- Insert an 8 px transparent spacer between footer and sequence rail to avoid sticking
- The Details button is kept (only inspector trigger); the Truth button is removed

Total bottom-area height is about 100 px (24 + 8 + 56 + 16 spacer), under 12%
of canvas height, not crowded.

### 1.7 Slice 3 design-switch acknowledgement (V7-#7)

V4.11 SDD §Slice 3 original contract: "make Truth and Details concurrent".
This proposal goes **further**: remove the Truth role, and split the Truth
content into the footer + the inspector State Evidence tail.

Design pivot rationale (recorded explicitly):

- The V4.10 reviewer complaint "Why can't I see both at once?" was not rooted
  in mutual exclusion, but in "Truth is a disclaimer button that laypersons
  cannot read"
- Concurrency solved mutual exclusion but did not solve Truth's own
  readability problem
- The footer chips turn the disclosure into ambient context, so laypersons
  do not need to understand "what Truth is" yet still register continuously
  that "this is a simulation"

The Slice 3 existing acceptance evidence (concurrent visibility screenshot,
smoke asserting two roles) needs to be **archived as design-evolution
evidence** after implementation, not discarded — this is the V4.11 SDD
§Slice 3 -> addendum-revised design-evolution record, which must be written
into the conv 4 handoff doc as §Slice 3 Design Evolution Note.

### 1.8 Smoke matrix expansion (V6 PARTIAL)

The two categories V6 missed, added back:

**1.8.1 Reviewer-comprehension protocol revision**

The acceptable-answer examples in Slice 0 SDD §Reviewer-Comprehension
Protocol §Five Questions assume V4.10 baseline language (such as
"low-latency context class"). After v2 switched everything to layperson
plain English, the protocol must be updated in sync:

| Q | v4.10 acceptable | Addendum acceptable |
|---|---|---|
| Q2 orbit focus | "LEO / MEO / GEO", orbit chip | Same + "looking at this one / this satellite" |
| Q4 real vs simulation | "simulation review / not live" | "simulation view / not real / this is a simulation" |
| Q5 satellite-position source | "CelesTrak NORAD GP", provenance badge | Same + "TLE / satellite position data source" (footer chip) |

New acceptable answers: the four layperson terms "geometry degrading /
holding briefly / guard coverage / candidate" should appear in the
corresponding windows. Conv 4 must update the protocol and add the
disclosure.

**1.8.2 Visual-token new smoke**

The 5 visual tokens (rising arc / fading arc / breathing disk / pulse /
ring) are new Cesium objects and require **new smoke files** asserting:

- Each token appears in its corresponding window at default load
- Token does not appear in the wrong window
- Token opacity / radius / color stays within the spec budget
- The demoted actor's 30% transparency is asserted

New smoke file: `tests/smoke/verify-m8a-v4.11-addendum-visual-tokens-runtime.mjs`

### 1.9 Honest implementation footprint (addendum revision)

Reviewer V6's "5-6 conv" estimate is closer to reality. The addendum expands
the work further:

| Conv | Work | Estimated time |
|---|---|---|
| Conv 0 (spike) | Cesium 5-token feasibility spike (§1.3); if it fails, revert to fix spec | <=1 hour |
| Conv 1 | 5 visual tokens + scene-context chip + ground-station chip | 2 hours |
| Conv 2 | hover popover phase-specific rewrite (5 windows x 3 lines) + inspector single-role + countdown derivation | 2 hours |
| Conv 3 | footer chip system + Truth removal + W5 high-prominence chip + bottom layout | 1.5 hours |
| Conv 4 | Slice 5 demote + Sources moved into inspector advanced + smoke matrix 13-point update + new visual-token smoke + Slice 0 protocol revision + Lock-in J full disclosure + Slice 3 Design Evolution Note | 2.5 hours |

**Total: 5 conv x ~9 hours of implementation work + 5 reconciliation rounds**.
This is 1 conv + 1 hour more honest than v2's "4 conversations / 8 hours"
estimate.

## Status reminder

This is **proposal v2 + Addendum 1**, requiring:

1. UX-side reviewer round 2 — done (this addendum closes it out)
2. planning/control acceptance — **next step**
3. Conv 0 spike kickoff (Cesium token feasibility verification)
4. Conv 1-4 implementation
5. Lock-in J full disclosure + Slice 0 protocol revision

Until then, the V4.11 Slice 1-5 existing implementation stays as-is.

Reviewer V9's suggestion "after the addendum is done, start at conv 1 without
a full v3" is adopted. No v3 will be opened. The next step is
planning/control acceptance + conv 0 spike kickoff.
