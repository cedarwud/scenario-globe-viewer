# M8A-V4.11 Slice 0 Baseline / Protocol / Storyboard

Source note: this is the Slice 0 detail supplement to
[m8a-v4.11-real-product-experience-redesign-plan.md](./m8a-v4.11-real-product-experience-redesign-plan.md).
It is doc-only. It does not authorize any runtime implementation. Its job is
to record the V4.10 baseline observations, the reviewer-comprehension
protocol, and the per-window storyboard that every later V4.11 slice must
satisfy.

## Status

- planning-control SDD supplement
- doc-only
- current as of 2026-05-02; Conv 4 protocol revision added 2026-05-04
- intended phase: `M8A-V4.11` Slice 0
- starts after `M8A-V4.10` Slice 5 closeout
- no runtime implementation authority by itself

## Slice 0 Tasks (Recap)

Slice 0 has three tasks, each producing an evidence artifact:

1. **Baseline reannotation** — capture the V4.10 default load and re-walk
   each artifact in `output/m8a-v4.10-slice5/` with V4.11-specific failure
   notes (size budget violations, missing transient surface, inspector
   concurrency violation, real-data not surfaced).
2. **Reviewer-comprehension protocol** — write a one-page ask-list that
   reviewers run cold against the route. Recorded transcripts become the
   acceptance evidence for every later slice.
3. **Per-window storyboard** — for each of the five V4.6D windows, fix the
   target glance-rank composition, hover content, toast text, pinned
   inspector content, and unreliable-anchor fallback. Slices 1-5 must
   match the storyboard.

## Baseline Reannotation

### V4.10 Default View Failures

Reannotation rule: cite the actual artifact, the v4.11 budget it would
violate if shipped, and the reviewer reaction it caused.

| V4.10 artifact | Observed dimension | V4.11 budget | Reviewer reaction it produced |
| --- | --- | --- | --- |
| `m8a-v47-product-ux__scene-annotation` (scene narrative) | 360×174 permanent | glance ≤24px tall scene-anchored cue | "the popup that points at the wrong thing" |
| `m8a-v47-product-ux__strip` (top-left state strip) | 584×85 with controls | secondary ≤584×64 with state title only; controls grouped right | reviewer reads it as the primary control surface, not the scene |
| Cesium label "Taiwan / CHT operator-family anchor / operator-family precision" | two-line label, ≥320×34 | single-line precision chip ≤180×24 + separate orbit-evidence triplet ≤180×24 | reviewer sees redundant text, no chip-style scannable status |
| Cesium label "Singapore / Speedcast operator-family anchor / operator-family precision" | two-line label, ≥320×34 | single-line precision chip ≤180×24 + separate orbit-evidence triplet ≤180×24 | same as above |
| `[data-m8a-v49-inspector-current]` body (inside Details) | repeats state copy four times across "Current state / Why / Changed / Watch / Next" | inspector "State Evidence" role single combined section ≤200 words | "Details has data but no meaning" |
| `m8a-v410-product-ux__boundary-surface` content | only non-claim disclaimers | inspector "Truth Boundary" role co-resident with State Evidence; no longer a standalone surface | "Truth has no positive content; why is it equal to Details?" |
| `detailsSheetState` ⊥ `boundarySurfaceState` mutual exclusion | wired into both toggle handlers | concurrency required: opening one role does not close the other | "Why can't I see both at once?" |
| Window transition (e.g., `leo-aging-pressure → meo-continuity-hold`) | only the sequence-rail mark moves; no toast, no scene cue | 2.5s toast + ≤180×24 scene cue chip near new focus actor | reviewer can miss the transition entirely if not staring at the rail |
| Source TLE provenance (CelesTrak NORAD GP, 13 actors, fetched 2026-04-26) | only inside Details collapsed evidence | corner provenance badge always visible | "I can't tell where the satellite positions come from" |
| 5 R2 blocked candidate endpoints | not exposed at all in runtime | corner provenance badge or inspector "Sources" role can list them as read-only catalog | reviewer cannot distinguish "this is the only valid pair" from "we just chose this pair" |

### V4.10 Screenshot Inventory To Reuse

Slice 0 must reuse, not regenerate, V4.10's accepted screenshots as the
baseline. Each is referenced by V4.11 acceptance to prove the visible
delta:

- `output/m8a-v4.10-slice5/v4.10-slice5-default-1440x900.png`
- `output/m8a-v4.10-slice5/v4.10-slice5-default-1280x720.png`
- `output/m8a-v4.10-slice5/v4.10-slice5-default-390x844.png`
- `output/m8a-v4.10-slice5/v4.10-slice5-details-open-1440x900.png`
- `output/m8a-v4.10-slice5/v4.10-slice5-boundary-open-1440x900.png`
- `output/m8a-v4.10-slice5/v4.10-slice5-transition-leo-aging-pressure-1440x900.png`

V4.11 captures live under `output/m8a-v4.11-slice{N}/` and must never
overwrite the V4.10 baseline.

## Reviewer-Comprehension Protocol

### Protocol Goals

The protocol is the V4.11 primary acceptance channel. Slice 6 cannot close
unless three reviewers complete it on V4.11 with ≥4/5 questions correct
per window in ≤30 seconds without opening Details. There is no standalone
Truth button in the Conv 3/4 design; truth disclosure is ambient footer
context plus the State Evidence truth tail.

The protocol is also the V4.10 baseline failure check. Slice 0 cannot
close unless at least one reviewer fails the protocol on V4.10 — that
failure is what justifies V4.11.

### Reviewer Profile

A valid reviewer for the protocol:

- has not previously seen this route
- has not read any V4 SDD before the session
- knows what "satellite handover" means at a layperson level (no need
  to know LEO/MEO/GEO acronyms — see Q1)
- can read the visible Chinese chips and the retained source terms
  `TLE / CelesTrak NORAD GP`
- agrees to think aloud during the session

A reviewer who has implemented or reviewed any V4.x slice is **not** a
valid Slice 6 reviewer for that slice's acceptance.

### Session Format

- duration: ≤6 minutes per reviewer
- viewport: 1440×900 desktop, full Cesium UI shown
- replay: starts at default load, then plays at 60× through all five
  windows (≈1m54s of simulated time)
- moderator: silent except for reading the questions
- recording: text transcript of reviewer's spoken answers; no audio/video
  required, no PII recorded
- artifacts: one transcript file per reviewer per slice, stored under
  `output/m8a-v4.11-slice{N}/reviewer-transcripts/`

### Five Questions (Asked Per Window, In Order)

1. **What is happening right now?** — Reviewer should describe the active
   handover state in their own words.
   - Acceptable: "現在看這顆 LEO", "位置條件變差", "MEO 暫時接住",
     "新的 LEO 是候選", "GEO 是保底覆蓋"
   - Unacceptable: silence ≥10s, "I don't know", or asking the moderator
     for context

2. **Which satellite or orbit should I be looking at?** — Reviewer must
   point to the focus actor or its orbit class on the screen.
   - Acceptable: pointing at the active satellite, its orbit chip, or saying
     "現在看這顆"
   - Unacceptable: pointing at the wrong orbit, pointing at a control
     panel, or asking moderator

3. **Where does the next moment go?** — Reviewer should name the next
   state from the sequence rail or scene cue.
   - Acceptable: reading the "Next:" line or the next sequence-rail mark
   - Unacceptable: "I don't know", referring to time only ("in a minute")

4. **Is this real operator data or simulation?** — Reviewer must call out
   that this is a simulation review, not a live operator log.
   - Acceptable: reading `[模擬展示]`, saying "這是模擬展示", or on W5
     reading "不是實際備援切換證據"
   - Unacceptable: "I think it's real" / unsure

5. **Where do the satellite positions come from?** — Reviewer should be
   able to find the TLE source from the footer chip without opening
   Details.
   - Acceptable: reading `TLE / CelesTrak NORAD GP` or `CelesTrak NORAD GP`
     out loud
   - Unacceptable: opening Details to look it up, "I don't know"

### Scoring Rubric

- 5 / 5: reviewer answered all five within 30s without opening Details.
- 4 / 5: reviewer needed one prompt or got one question wrong but
  answered the others quickly.
- ≤3 / 5: window failed for that reviewer.

A slice closes only if ≥3 reviewers score ≥4 / 5 on every window. The
slice-6 final handoff must include the per-reviewer per-window matrix.

### V4.10 Expected Failure Pattern

When the protocol is run on V4.10, the predicted failure pattern is:

- Q1 partial pass on windows 1, 4, 5 because of the sequence rail; fail
  on windows 2, 3 because the scene narrative is too verbose to read
  quickly
- Q2 fail on most windows because the scene narrative annotation visually
  competes with the satellites it points at
- Q3 partial pass via sequence rail
- Q4 fail because the Truth boundary is hidden behind a button labeled
  "Truth, not operator log" — reviewers do not know what that means
  without opening it
- Q5 fail across the board because the provenance is only inside Details

If V4.10 unexpectedly passes, V4.11 may not be required and Slice 0 must
re-evaluate scope before opening any later slice.

## Five-Window Storyboard

Conv 4 protocol revision: any older storyboard text below that mentions
opening Details and Truth together, a standalone Truth button, or using the
corner provenance badge as the primary source affordance is superseded by the
Conv 3/4 design: single State Evidence inspector, footer ambient disclosure,
truth tail, and Sources opened only from the inspector advanced
source-provenance toggle.

Each window storyboard fixes the visual contract for slices 1-5. The
storyboard answers, for each of the five V4.6D deterministic windows:

- glance-rank chips visible in default load
- focus-actor scene-anchored micro-cue (≤24px) copy
- hover popover content for the focus actor
- transition toast triggered when entering this window
- pinned inspector State Evidence role primary copy
- pinned inspector Truth Boundary role primary copy
- unreliable-anchor fallback behavior
- desktop and narrow screenshot targets

Copy rules (from V4.10 carried forward):

- never use `display context establishes`, `active serving`, `active
  gateway`, `active path`, `real handover`
- use `simulated`, `review focus`, `context`, `guard` deliberately
- glance / micro-cue / hover lines stay ≤80 characters
- toast title ≤60 characters; supporting line ≤80 characters
- pinned inspector State Evidence ≤200 words combined

### Window 1 — `leo-acquisition-context`

Focus actor: oneweb-0386 LEO (OneWeb LEO context).

Glance chips visible in default load:

- per-actor orbit-class chip: 6 LEO, 5 MEO, 2 GEO chips
- ground stations: precision chip "operator-family precision" (×2)
- ground stations: orbit-evidence triplet "LEO ✓ · MEO ✓ · GEO ✓"
  (color-coded "strong/strong/strong")
- corner provenance: "TLE: CelesTrak NORAD GP · fetched 2026-04-26 · 13
  actors"
- top-left state strip: "Active: LEO review focus · Next: LEO pressure"
- bottom: 5-state sequence rail with mark 1 active and mark 2 next
- truth chip embedded in state strip: "simulation review"

Focus-actor micro-cue (≤24px tall, ≤180px wide, anchored to oneweb-0386):

- "focus · LEO"

Hover popover for oneweb-0386 (≤240×140):

- L1 "Eutelsat OneWeb"
- L2 "LEO · focus role"
- L3 "TLE source: CelesTrak NORAD GP · 2026-04-26"
- L4 "low-latency context class"
- L5 "display context, not active serving"

Transition toast on entering this window (only on restart from end of
window 5):

- title: "LEO review focus"
- line: "Restart: watch for pressure before the MEO hold."

Pinned inspector State Evidence role (when opened):

- title: "LEO review focus"
- combined paragraph (≤200 words):
  "The simulation review is currently anchored on the OneWeb LEO context
  marked as the focus role. The five-state V4.6D model is in window 1 of
  5. Watch the LEO actor for the early pressure signal — the next
  modeled state is LEO pressure. Endpoint precision remains operator-family
  only and no active gateway is being claimed."

Pinned inspector Truth Boundary role (when opened):

- title: "Truth boundary"
- chips: "simulation output", "operator-family precision",
  "display-context actors"
- bullets: same five non-claims preserved from V4.10

Unreliable-anchor fallback:

- if the focus actor world-position projects off-screen, the focus-actor
  micro-cue collapses into the top-left state strip and the strip shows
  "Active: LEO review focus (off-screen)"

Screenshot targets:

- desktop default: `output/m8a-v4.11-slice1/v4.11-w1-default-1440x900.png`
- narrow default: `output/m8a-v4.11-slice1/v4.11-w1-default-390x844.png`
- desktop hover: `output/m8a-v4.11-slice2/v4.11-w1-hover-leo-1440x900.png`
- desktop pinned: `output/m8a-v4.11-slice3/v4.11-w1-pinned-1440x900.png`

### Window 2 — `leo-aging-pressure`

Focus actor: oneweb-0537 LEO.

Glance chips visible:

- same baseline chips as window 1
- focus-actor chip role token reads "pressure" instead of "focus"
- the previous focus chip on oneweb-0386 demotes to "candidate"

Focus-actor micro-cue:

- "pressure · LEO"

Hover popover for oneweb-0537 (≤240×140):

- L1 "Eutelsat OneWeb"
- L2 "LEO · pressure role"
- L3 "TLE source: CelesTrak NORAD GP · 2026-04-26"
- L4 "changing-geometry jitter class"
- L5 "display context, not active serving"

Transition toast on entering this window:

- title: "LEO pressure"
- line: "Continuity will shift to the MEO hold next."

Pinned State Evidence role:

- title: "LEO pressure"
- paragraph (≤200 words):
  "The simulation marks the LEO context as under aging pressure in
  window 2 of 5. The geometry is degrading by simulation, not by
  measurement. The next modeled state holds continuity on the MEO
  context. No real RF handover is being asserted."

Pinned Truth Boundary role: same shape as window 1.

Unreliable-anchor fallback: same rule.

Screenshot targets:

- `output/m8a-v4.11-slice2/v4.11-w2-default-1440x900.png`
- `output/m8a-v4.11-slice4/v4.11-w2-toast-1440x900.png` (transition toast
  visible)

### Window 3 — `meo-continuity-hold`

Focus actor: o3b-mpower-f6 MEO.

Glance chips visible:

- baseline chips
- a MEO actor takes the focus chip role token "continuity-hold"
- previous LEO focus actors demote to "candidate"

Focus-actor micro-cue:

- "hold · MEO"

Hover popover for o3b-mpower-f6 (≤240×140):

- L1 "SES O3b mPOWER"
- L2 "MEO · continuity-hold role"
- L3 "TLE source: CelesTrak NORAD GP · 2026-04-26"
- L4 "mid-latency continuity class"
- L5 "display context, not active serving"

Transition toast on entering this window:

- title: "MEO continuity hold"
- line: "MEO holds continuity in this simulation window."

Pinned State Evidence role:

- title: "MEO continuity hold"
- paragraph (≤200 words):
  "The simulation holds continuity on the SES O3b mPOWER MEO context
  in window 3 of 5. This is wider-area continuity by model, not a
  measured failover. LEO returns as a candidate focus in the next
  window. Endpoint precision remains operator-family only."

Pinned Truth Boundary role: same shape.

Unreliable-anchor fallback: same rule. Note: the sequence rail still
shows mark 3 active even when MEO actor is off-screen — that is the
intended fallback.

Screenshot targets:

- `output/m8a-v4.11-slice2/v4.11-w3-hover-meo-1440x900.png`
- `output/m8a-v4.11-slice4/v4.11-w3-toast-1440x900.png`

### Window 4 — `leo-reentry-candidate`

Focus actor: oneweb-0702 LEO.

Glance chips:

- baseline chips
- a LEO actor takes role token "re-entry"
- previous MEO focus actor demotes to "candidate"

Focus-actor micro-cue:

- "re-entry · LEO"

Hover popover for oneweb-0702 (≤240×140):

- L1 "Eutelsat OneWeb"
- L2 "LEO · re-entry role"
- L3 "TLE source: CelesTrak NORAD GP · 2026-04-26"
- L4 "candidate-capacity context class"
- L5 "display context, not active serving"

Transition toast:

- title: "LEO re-entry"
- line: "GEO will close the sequence as guard context."

Pinned State Evidence role:

- title: "LEO re-entry"
- paragraph (≤200 words):
  "LEO returns as a candidate review focus in window 4 of 5. The
  next state closes the sequence on GEO guard context. Continuity
  here is modeled, not measured."

Pinned Truth Boundary role: same shape.

Unreliable-anchor fallback: same rule.

Screenshot targets:

- `output/m8a-v4.11-slice2/v4.11-w4-hover-leo-1440x900.png`
- `output/m8a-v4.11-slice4/v4.11-w4-toast-1440x900.png`

### Window 5 — `geo-continuity-guard`

Focus actor: st-2-geo-continuity-anchor.

Glance chips:

- baseline chips
- a GEO actor takes role token "guard"
- LEO/MEO actors are "candidate" or "off-cycle"

Focus-actor micro-cue:

- "guard · GEO"

Hover popover for st-2 (≤240×140):

- L1 "Singtel / SES (provider-managed anchor)"
- L2 "GEO · guard role"
- L3 "TLE source: CelesTrak NORAD GP · 2026-04-26"
- L4 "guard-context continuity class"
- L5 "display context, not active failover proof"

Transition toast:

- title: "GEO guard context"
- line: "Restart to review the sequence again."

Pinned State Evidence role:

- title: "GEO guard context"
- paragraph (≤200 words):
  "The sequence closes on GEO as guard context in window 5 of 5. GEO
  is shown as continuity guard only — no failover proof is being
  asserted. Restart to review the simulation again."

Pinned Truth Boundary role:

- includes the additional "no active failover proof" line specific to
  GEO guard

Unreliable-anchor fallback: same rule. GEO actor is fixed-earth-relative
so off-screen is rare; if it occurs the strip reads "(off-screen)".

Screenshot targets:

- `output/m8a-v4.11-slice2/v4.11-w5-hover-geo-1440x900.png`
- `output/m8a-v4.11-slice4/v4.11-w5-toast-1440x900.png`

## Slice 0 Acceptance

Slice 0 closes only if all of the following are recorded:

- baseline reannotation table in this SDD is reviewed and accepted by
  planning/control
- reviewer-comprehension protocol has been run on V4.10 by ≥1 reviewer
  whose transcript is filed under
  `output/m8a-v4.11-slice0/reviewer-transcripts/v4.10-baseline-{id}.md`
- the V4.10 transcript shows the protocol failure pattern (≤3/5 on at
  least three windows)
- per-window storyboards above are explicitly accepted as the visual
  contract for slices 1-5
- planning/control marks Slice 0 as accepted before any later slice
  opens

## Forbidden In Slice 0

- runtime code changes
- CSS changes
- screenshot capture under `output/m8a-v4.11-slice{N}/` for N ≥ 1
- new V4.6D model changes
- new endpoint pair, R2 promotion, precision expansion, or measured
  metric values
- copy edits inside the existing controller (those land in slices 1-5
  with their own scope)

## Note On Reviewer Sourcing

If three protocol-valid reviewers cannot be sourced for Slice 6
acceptance within the V4.11 phase window, the phase pauses rather than
silently weakening the contract. Reviewer-comprehension is the gate;
substituting DOM tests for it is the v4.10 failure mode this whole phase
exists to correct.
