# Selected-Pair Panel Reframe SDD

Status: proposed
Date: 2026-05-25

## 1. Problem

The selected-pair side panel currently tries to be three products at once:

1. A reviewer-facing demo panel.
2. A requirements trace surface.
3. A provenance/debug dump.

That mix has made the panel hard to read. A 1280x800 visual audit of the
canonical selected-pair route showed:

- Row 4 alone occupied about 507 px.
- Row 5 and Row 6 started below the viewport.
- The panel root scrolled, even though the existing IA says only disclosure
  bodies should scroll.
- Opening `All visibility windows` or `Sources + non-claims` produced thousands
  of pixels of list content.

Reference capture:
`output/playwright/scenario-globe-viewer-selected-pair-1280x800.png`

The fix is not a CSS-only squeeze. The panel needs a stricter information
architecture: the default surface should answer the reviewer's immediate
questions, while trace and provenance detail move to an evidence surface.

## 2. Goals

1. Make selected-pair mode readable at first glance.
2. Keep every Bucket A requirement traceable to a visible or machine-readable
   surface.
3. Preserve modeled/source boundary honesty without forcing every caveat into
   the first viewport.
4. Keep CSV/export and provenance data available for technical review.
5. Keep the selected-pair route neutral and product-like.

## 3. Non-Goals

1. Do not remove runtime compute, TLE provenance, or CSV capability.
2. Do not change station selection, marker, or replay-clock behavior.
3. Do not add a policy selector.
4. Do not wire antenna-pattern output into the selected-pair visible compute
   path in this slice.
5. Do not touch the retained fixed demo fixture path.
6. Do not turn 12h/24h into the default reading mode; they are exploration
   presets only.

## 4. Source Scope

The canonical requirement list has three buckets:

- Bucket A: demo-facing requirements that must be visible without extra route
  navigation.
- Bucket B: public-standard or public-source substitutes for items that need
  higher-authority external data to become stronger claims.
- Bucket C: infrastructure or report-layer items outside this UI scope.

Selected-pair mode should primarily explain Bucket A. Bucket B should appear as
source boundary or evidence, not as first-rank product content. Bucket C should
not be reproduced in the panel.

## 5. Current Content Triage

| Current content | Requirement role | Decision |
| --- | --- | --- |
| Pair title | route identity | Keep in main panel |
| Source-tier badge | source boundary | Keep, but shorten label |
| ISO time window | replay/projection context | Keep, but compact |
| Copy link | shareability | Remove from selected-pair header |
| Rain rate slider | Bucket A dynamic parameter + rain demo | Keep in main panel |
| Comm time | Bucket A communication-time stat | Keep in main panel |
| Handover count | Bucket A handover stat | Keep in main panel |
| Visibility-window preview list | Bucket A orbit data + comm-window evidence | Replace with a visible compact 6h link map |
| Link-selection event preview list | Bucket A switching evidence + V-MO1 | Replace with a short next-6h link plan under the map |
| Full visibility-window list | audit/evidence detail | Move out of on-screen reading; include in one downloadable evidence report |
| Full handover list | audit/evidence detail | Move out of on-screen reading; include in one downloadable evidence report |
| Runtime inventory/caps | data-completeness evidence | Summarize in drawer; full rows in evidence report |
| Station coordinate sources | data-completeness evidence | Summarize in drawer; full rows in evidence report |
| Metric anchors | data-completeness evidence | Summarize in drawer; full rows in evidence report |
| Standards references | source evidence | Keep one-line citation in main where relevant; summarize in drawer and report |
| Non-claims | source boundary | Keep concise assumptions in drawer; full payload in report |
| Mean dwell | secondary statistic | Keep in report unless needed by a future main-panel decision |
| Footer precision line | truth anchor | Keep, shorten |

## 6. New Information Architecture

The selected-pair panel becomes a decision surface with six visible regions.
It should not use root scrolling at 1280x800.

### 6.1 Header

Purpose: identify the pair and source level.

Content:

- short station A name
- short station B name
- compact tier badge: `Public source`, `Same-family inferred`, or
  `Geometry only`
- compact time window: `00:00-06:00 UTC · 360m`

The full badge text and non-claims move to evidence.

### 6.2 Outcome Strip

Purpose: answer "can this pair communicate in this window?"

Content:

- `Available` total communication time
- `Handovers` event count, excluding initial acquisition
- `Next link` satellite/orbit or explicit empty reason

This replaces the current first-level list dominance. The primary outcome is
not "709 rows exist"; it is whether the selected pair has a usable link and
what the next decision is.

### 6.3 Visible 3-Lane Link Map

Purpose: make the default six-hour window visually scannable before reading individual
events. The map should answer whether the pair is continuously covered, where
handovers cluster, and whether orbit lanes change during the window.

Content:

- horizontal time axis for the selected projection window
- compact duration presets: `6h`, `12h`, `24h`
- one compact lane each for LEO, MEO, and GEO coverage
- colored segments inside the matching orbit lane
- visible marker line for handover events
- empty-state band when no pair intersection exists

The timeline should be derived from existing `visibilityWindows`,
`handoverEvents`, and `communicationStats`. It does not need a new compute path.
It is visible by default, with lane labels and the compact link plan providing
the accessible equivalent. Lanes without coverage stay visible but dimmed, so
absence reads as an explicit state rather than missing data.

The `6h` preset is the primary product reading mode. `12h` and `24h` are
diagnostic exploration modes for cases where a selected pair has valid future
coverage but sparse short-window activity. The preset is not a handover-policy
selector.

The selected-pair demo policy must not let a continuously available orbit hide
all other viable orbit classes. `demo-balanced-v1` should remain bounded, but
it may rotate to another viable orbit after a dwell guard so cross-orbit
handover is visible without creating second-by-second churn:

- hold a fresh orbit for a short minimum dwell when it is still viable;
- allow a not-yet-shown orbit to interrupt after a shorter opportunity guard;
- rotate away from a long-held viable orbit on a slower cadence when another
  viable orbit exists.

### 6.4 Compact Link Plan

Purpose: make the selected pair readable without requiring timeline decoding.

Content:

- `Start link`: active or first acquisition candidate
- `Next handover`: next handover event after the current projection start
- `Cross-orbit`: pinned only when a later cross-orbit migration exists in the
  window

Each row shows:

- UTC time
- from/to satellite or initial satellite
- target orbit class
- plain-language reason

Hard cap: three rows in the main panel. Full event history moves to evidence.
This schedule supports the visual map; it should not dominate the panel.

### 6.5 Rain Impact

Purpose: make K-E6 visible without opening a dump.

Content:

- rain slider
- immediate delta summary: throughput and jitter impact by supported orbit
- citation line: `ITU-R P.618-14 §2.2.1`
- one caveat sentence when rain is outside the active carrier band

The current `Rain impact` disclosure can become part of this visible region,
but it must be compressed to outcome first, details second.

### 6.6 Details & Sources Entry

Purpose: preserve traceability without polluting the main panel. The content is
secondary by default: open it when validating why a number is shown, checking
source boundaries, exporting evidence, or debugging a projection run. The main
panel must answer the operator's first question without requiring this drawer.

Content:

- one button/link: `Details & sources`
- one secondary action: `Report`

Opening `Details & sources` shows a fixed-height drawer on desktop and a bottom
sheet on mobile. The surface may scroll internally, but it must not render
row-level verification dumps as the primary reading experience. It opens with a
short visual validation summary. The `Download evidence report` action remains
available, but it should not displace the graphical summary layer.

The drawer contains:

- evidence summary counts
- evidence health strip
- orbit coverage heatmap
- handover event rail
- policy threshold chips
- rain delta bars
- source confidence
- assumptions and limits
- standards references
- raw verification counts
- one HTML evidence report download

The drawer should read as an evidence summary dashboard, not a textual dump.
Graphical summaries are the first reading layer; exact rows remain in the
downloaded report. The graphical layer may use compact bars, rails, chips, and
heatmap cells for:

- per-orbit visibility coverage and active serving time;
- acquisition, same-orbit handover, and cross-orbit migration events;
- policy thresholds: elevation, hysteresis, minimum window, and latency;
- TLE/source health, actor counts, model counts, and pair source tier;
- rain impact per orbit.

The following evidence stays textual because it carries responsibility and
source-boundary meaning: standards citations, assumptions/non-claims, exact
source paths, and raw JSON/report data.

The downloaded evidence report is the full verification medium. It is a
self-contained HTML file with tabs for Summary, Visibility windows, Handover
events, Sources, Assumptions & models, Runtime data, and raw JSON. This keeps
the UI readable while giving technical reviewers one artifact that contains the
row-level data that does not fit the side panel.

### 6.7 Readability Floor

The selected-pair experience is a working analysis surface, not a dense
instrument readout. Primary chrome should target an approximately 16-17px
reading baseline and must not rely on sub-14px labels for active decisions.
Keep the main panel, selector, chips, replay strip, telemetry chips, and
tooltips at that readable floor. If the content no longer fits one viewport,
the panel should scroll internally rather than shrinking text again.

## 7. Requirement Mapping

| Requirement group | Main panel surface | Evidence surface |
| --- | --- | --- |
| Multi-orbit integration and switching | visible 6h link map + compact link plan | full event list + policy citation |
| Orbit data integration | visible 6h link map + next link identity | full visibility list + TLE source rows |
| 3D visualization | globe | not needed |
| UI interaction | selection controls + rain slider + replay strip | not needed |
| Handover rule parameters | decision reason labels | policy thresholds and model IDs |
| Communication-rate visualization | rain impact deltas | model details and standards refs |
| Large LEO support | actor count chip | source inventory and caps |
| Playback speed | replay strip | not needed |
| Communication time | `Available` KPI + visible 6h link map | evidence report stat rows |
| Strategy-based switching | link plan | full event history |
| Report export | Evidence report action | tabbed HTML report body |
| TLE input/tracking | TLE chip + moving actors | source inventory |
| Rain attenuation | rain region + delta summary | full modeled-output metadata |
| Demo deliverable | whole route | route evidence |
| 24-hour stability evidence | machine-readable viewer-root data | evidence row linking retained artifact |
| Cross-orbit live handover | pinned cross-orbit marker/card | full event history |

Bucket B substitutes stay in the evidence surface unless a substitute directly
affects an interactive demo outcome, such as rain or modeled link metrics.

Bucket C is not panel content.

## 8. Data Contract

The existing `RuntimeProjectionResult` is sufficient for the first reframe.
The UI layer should derive a small view model:

```ts
interface SelectedPairPanelViewModel {
  readonly pairLabel: string;
  readonly sourceBadge: string;
  readonly windowLabel: string;
  readonly availabilityLabel: string;
  readonly handoverCountLabel: string;
  readonly nextLinkLabel: string;
  readonly timelineSegments: ReadonlyArray<PanelTimelineSegment>;
  readonly decisionCards: ReadonlyArray<PanelDecisionCard>;
  readonly rainImpactRows: ReadonlyArray<PanelRainImpactRow>;
  readonly conciseBoundary: string;
}
```

The evidence drawer may consume the full `RuntimeProjectionResult` and
`dataCompleteness` state. The main panel should not directly render unbounded
arrays.

Selected-pair mode uses the `demo-balanced-v1` modeled handover policy by
default. The policy keeps a minimum orbit dwell before forcing another lane,
then prioritizes orbit classes that have not yet appeared in the active window.
This is a display-oriented strategy: it makes multi-orbit capability legible
when supported by the computed windows. Underrepresented orbit promotion uses
a visibility-present gate; ordinary fallback selection still uses the runtime
policy scoring, hysteresis, and source-boundary disclosure in evidence.

## 9. Layout Rules

At 1280x800:

1. The panel root must not scroll.
2. Header, outcome strip, visible 3-lane link map, compact link plan, rain impact, and evidence
   entry must fit in the visible panel.
3. Main panel lists must be capped by design, not by accidental overflow.
4. Evidence drawer/modal may scroll internally.
5. Empty states must occupy the same reserved regions as non-empty states.
6. No one-off long ISO strings should dominate the first viewport.

At <=720 px width:

1. The selected-pair panel becomes a bottom sheet.
2. The bottom sheet shows outcome strip + evidence entry first.
3. Timeline and decision cards remain available without horizontal overflow.

## 10. Accessibility Rules

1. Icon-only controls require accessible names.
2. Timeline and decision cards need text equivalents.
3. Evidence drawer open/close must be keyboard operable.
4. Rain slider keeps a visible label and updates `aria-valuenow`.
5. Live replay event updates use polite status text, not visual-only pulses.

## 11. Acceptance Criteria

### A1. Main Panel Fit

On the canonical selected-pair route at 1280x800:

- `[data-v4-projection-side-panel="true"]` has `scrollHeight <= clientHeight + 2`
  in the ready state.
- No main-panel child has `getBoundingClientRect().bottom > window.innerHeight`.
- Evidence drawer is closed by default.

### A2. No Unbounded Main Lists

The main panel must not render:

- more than three decision cards;
- more than one next-window summary row;
- the full visibility-window array;
- the full handover-event array;
- runtime inventory/cap/source tables.

### A3. Requirement Trace Preserved

Evidence mode must expose stable text or data attributes for:

- Bucket A requirement IDs that are represented by the selected-pair route;
- model IDs for handover, link budget, throughput, jitter, latency, and rain
  impact;
- source health and accepted/rejected TLE counts;
- station precision/source boundary;
- report export.

### A4. Empty States Are Honest

When projection output has no pair intersection, no shared supported orbit, no
handover event, or unavailable source data:

- the panel shows a typed reason in the outcome strip;
- no fake active link is rendered;
- evidence mode exposes the same reason code.

### A5. Visual Quality

The first viewport should read as an operational decision panel, not a source
document:

- one dominant outcome strip;
- one compact timeline;
- no dense paragraph block in the main panel;
- no terminal-style source block in the default view.

### A6. Regression Gates

Run at minimum:

- `npm run build`
- selected-pair information-density smoke, updated for the new IA
- selected-pair data-completeness smoke
- cross-orbit audit for 6h, with a focused 3-orbit subset check
- one visual capture at 1280x800 and one at 390x844

## 12. Implementation Slices

### Slice 1: Main-Panel View Model

Create a small view-model adapter near the panel code. It converts
`RuntimeProjectionResult` into bounded main-panel content.

No visual redesign yet; tests can assert caps and labels.

### Slice 2: Rebuild Main Panel

Replace Row 4 list dominance with:

- outcome strip;
- timeline;
- bounded decision cards;
- visible rain impact summary;
- evidence/report entry.

Keep current compute and export builders.

### Slice 3: Details Drawer

Move full lists and provenance blocks into an evidence drawer/modal. It may
reuse the existing block builders, but should not mount by default if doing so
hurts render cost.

### Slice 4: Smoke Updates

Update the information-density smoke to assert:

- no root scroll;
- bounded main-panel rows;
- details drawer opens, is visibly fixed to the viewport, and scrolls internally;
- requirement trace selectors still exist.

### Slice 5: Cleanup

Remove dead row/disclosure code that no longer feeds either main panel or
evidence drawer. Keep machine-readable dataset attributes that smokes consume.

## 13. Open Decisions

1. Details surface shape: right-side drawer versus modal.
   Resolved: right-side fixed-height drawer on desktop, bottom sheet on mobile.
2. Timeline implementation: SVG, HTML grid, or canvas.
   Recommendation: HTML/CSS grid first; no canvas unless layout becomes too
   complex.
3. Evidence export placement and format.
   Resolved: one compact `Report` action next to `Details & sources`, plus the
   same primary action inside the drawer. The artifact is a self-contained HTML
   evidence report rather than multiple one-off downloads.
4. Projection duration control.
   Resolved: keep `6h` as default, expose `12h` and `24h` as compact timeline
   presets, and keep the active preset in `durationMinutes` URL state.
5. Handover strategy for selected-pair readability.
   Resolved: selected-pair mode defaults to `demo-balanced-v1`, which favors
   underrepresented visible orbit lanes after a minimum dwell and labels
   actual from-orbit/to-orbit changes as cross-orbit migrations.
