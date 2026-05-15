# M8A V4.12 F-09 Communication-Rate Visualization Plan

Date: 2026-05-06
Working phase name: **M8A V4.12 customer must-have followup**.

## 0. Status

Status: planning SDD, doc-only.

This file does not authorize implementation. It does not open runtime work by
itself. No smoke, no runtime change, no feature mounting, no implementation
prompt, and no commit are part of this planning task.

Planning/control amended the V4.12 candidate pick from F-16 to **F-09
dedicated communication-rate visualization** under the "best result, no
time/budget constraint" framing.

F-09 is picked over F-16/F-10/F-11 because the audit ranks it as the highest
customer demo-impact candidate. The audit §1 table is reused by reference, especially
`docs/sdd/m8a-v4.12-itri-must-have-candidate-audit.md:18-23`; the full table is
not duplicated here. The audit §2 ranking already places F-09 first for demo
impact (`docs/sdd/m8a-v4.12-itri-must-have-candidate-audit.md:29-34`), even
though the original recommended pick text remains F-16.

F-16 statistics report export is deferred, not abandoned. It remains the next
candidate after F-09 closes.

Route-local demo delta, 2026-05-11:

`docs/sdd/itri-demo-route-requirement-closure-sdd.md` Phase 3 approved a small
V4 demo-route mirror of F-09. That mirror is limited to a modeled
network-speed class/proxy surface on
`/?scenePreset=regional&m8aV4GroundStationScene=1`; it does not supersede the
Phase 6 / Operator HUD F-09 plan below and does not close live `iperf` /
`ping`, measured throughput, ESTNeT/INET, or external validation truth.

## 1. customer Requirement Reference

Acceptance-report quote:

`/home/u24/papers/itri/itri-acceptance-report-2026-04-20/01-itri-requirement-inventory-and-status.md:22`:

```text
| F-09 | Display communication rate | `pending` | `networkSpeedMbps` already exists inside the physical-input and handover-decision model, but there is no dedicated communication-rate visualization surface yet. | `not yet scheduled into a phase` |
```

customer README §2.6 communication-time / rate / reporting context:

`/home/u24/papers/itri/README.md:246-264`:

```text
### 2.6 Communication-Time / Rate / Reporting

The original functional requirements and milestones explicitly mention:

- Live display of available communication time
- Communication-rate visualization
- Ability to generate communication-time statistics
- Statistics report export

The kickoff UI functional-requirements diagram also adds an important parenthetical note:

- Live display of available communication time, verifiable using tools such as `iperf` and `ping`

So the minimum requirement is not only a live view, but also includes:

- Live display
- Reviewable statistics
- Deliverable / exportable reports
- And communication time is not a pure theoretical value; the original wording explicitly hints that `iperf` / `ping` style testing can be used for verification
```

customer README §8.1 must-have checklist quote:

`/home/u24/papers/itri/README.md:547-560`:

```text
### 8.1 Must-Have Functional Requirements

- Integrate the customer's own satellite orbit model
- Explicitly support or at least target multi-orbit types: `LEO/MEO/GEO`
- Take `TLE` input and track satellite motion
- Build an interactive 3D graphical simulation system
- Provide a UI control interface
- Provide a UI with dynamically adjustable parameters
- Display available communication time / communication-time statistics
  - The kickoff diagram explicitly mentions verification via `iperf` / `ping` style testing
- Display communication rate
- Switchable handover strategy
- Handover rules and related parameters are configurable / simulatable
- Switch links based on conditions such as `latency/jitter/network speed`
```

Interpretation:

F-09 can close only the repo-owned bounded visualization seam. It does not close
external `iperf` / `ping` measurement truth, and it must not present the current
`networkSpeedMbps` model as measured throughput.

## 2. Current Scene Reality

### Existing Communication Time panel scope

The existing Phase 6 `Communication Time` panel shows time availability state,
not rate:

- `src/features/communication-time/bootstrap-communication-time-panel.ts:56-74`
  creates the `Communication Time` panel and its visible fields.
- The fields are `Status`, `Available`, `Unavailable`, `Remaining Available`,
  and `Provenance` (`src/features/communication-time/bootstrap-communication-time-panel.ts:68-74`).
- `src/features/communication-time/bootstrap-communication-time-panel.ts:132-139`
  renders heading, provenance note, status, available, unavailable, remaining,
  and provenance detail.

Source-grep evidence:

```bash
rg -n "class=.*chart|data-.*chart|svg|canvas|table|legend|Network Speed|network speed|networkSpeedMbps" \
  src/features/communication-time \
  src/features/handover-decision \
  src/features/physical-input \
  src/features/operator
```

The command returned `networkSpeedMbps` matches in physical-input and
handover-decision sources, but no `Communication Time` panel match for
`networkSpeedMbps`, chart/table/legend markup, or a rate surface.

### Where networkSpeedMbps lives today

`networkSpeedMbps` is already present, but as bounded/proxy data used by
physical-input and handover-decision logic:

- Physical input declares the boundary as `Bounded proxy physical inputs; not
  final physical-layer truth` and says the projection target is
  `latencyMs / jitterMs / networkSpeedMbps`
  (`src/features/physical-input/physical-input.ts:3-10`).
- `CandidatePhysicalInputs.baseMetrics` includes `networkSpeedMbps`
  (`src/features/physical-input/physical-input.ts:53-67`).
- `ProjectedPhysicalDecisionMetrics` includes `networkSpeedMbps` with
  `provenanceKind` (`src/features/physical-input/physical-input.ts:85-92`).
- Default bounded base metrics include orbit-class defaults for LEO, MEO, and
  GEO (`src/features/physical-input/physical-input.ts:174-193`).
- The physical projection calculates and returns `networkSpeedMbps` with
  `provenanceKind: "bounded-proxy"`
  (`src/features/physical-input/physical-input.ts:394-412`).
- The handover decision contract says its candidate metrics are deterministic
  bootstrap metrics and `not measured latency, jitter, or throughput truth`
  (`src/features/handover-decision/handover-decision.ts:1-10`).
- `HandoverCandidateMetrics` includes `networkSpeedMbps`
  (`src/features/handover-decision/handover-decision.ts:26-33`).
- Handover ranking compares candidates by highest `networkSpeedMbps` after
  latency and jitter (`src/features/handover-decision/handover-decision.ts:249-264`
  and `src/features/handover-decision/handover-decision.ts:267-284`).
- A better candidate can add the `network-speed-better` reason signal
  (`src/features/handover-decision/handover-decision.ts:436-444`).
- The bootstrap handover source maps projected physical metrics into handover
  candidates and preserves bounded-proxy provenance
  (`src/runtime/bootstrap-handover-decision-source.ts:40-50`).

Planning conclusion: F-09 should visualize the existing bounded network-speed
model/class. It must not promote `networkSpeedMbps` into measured throughput.

### Whether any rate chart or surface exists today

No dedicated communication-rate surface exists today.

Source-grep evidence:

```bash
rg -n "communication-rate|communication rate|rate visualization|throughput chart|network speed chart|network-speed chart|rate-panel|rate chart|data-rate" \
  src/features \
  src/runtime/bootstrap \
  src/runtime/m8a-v411-inspector-concurrency.ts \
  tests/smoke
```

The only source matches were the V4.11 disabled/gap metadata:

- `src/runtime/m8a-v411-inspector-concurrency.ts:301-303` has
  `communication-rate-visualization`, `Dedicated communication-rate
  visualization`, and `No dedicated communication-rate surface yet; F-09 remains
  pending`.

V4.11 spec v2 says the same:

- `docs/sdd/m8a-v4.11-content-and-visual-followup-spec.md:222-224` marks
  `Dedicated communication-rate visualization` as not connected and says F-09
  remains `pending`.
- `docs/sdd/m8a-v4.11-content-and-visual-followup-spec.md:243-244` maps F-09
  to a disabled tile, not a completed surface.

### Operator HUD slot reality

The Phase 6 Operator HUD currently has slots for timeline, communication,
physical, decision, starter, and validation:

- `src/features/operator/bootstrap-operator-hud.ts:155-176` defines
  `data-operator-time-slot`, `data-operator-communication-slot`,
  `data-operator-physical-slot`, `data-operator-decision-slot`,
  `data-operator-starter-slot`, and `data-operator-validation-slot`.
- `src/features/operator/bootstrap-operator-hud.ts:340-342` mounts the existing
  `Communication Time` panel into `data-operator-communication-slot`.
- `src/features/operator/bootstrap-operator-hud.ts:344-359` mounts Physical
  Inputs, Handover Decision, Scene Starter, and Validation State into their
  existing slots.

There is no current dedicated rate slot. F-09 can either extend the existing
communication slot/panel or add a sibling `communication-rate` slot adjacent to
the communication/decision panels. That placement remains an open
planning/control question in §9.

### V4.11 route boundary

F-09 belongs in the Phase 6 acceptance route, not the V4.11 ground-station scene.

Source evidence:

- `src/runtime/bootstrap/composition.ts:405-416` mounts the Bootstrap Operator
  HUD only when `mountHud` is true.
- `src/runtime/bootstrap/composition.ts:512-520` passes
  `mountHud: adoptFirstIntakeAsActiveOwner`.
- `src/runtime/bootstrap/composition.ts:655-661` creates the M8A V4 ground-station
  scene separately when the V4 runtime request is present.
- `docs/sdd/m8a-v4.11-content-and-visual-followup-spec.md:736-746` records the
  same fact: Bootstrap Operator HUD mounts Phase 6 panels, while the M8A V4.11
  route does not mount Operator HUD panels.
- `docs/sdd/m8a-v4.11-content-and-visual-followup-spec.md:126-140` preserves the
  V4.11 scene boundary: 13 actors, operator-family precision, no active
  satellite/gateway/path claim, no measured throughput truth, no native RF
  handover, and no live `ping/iPerf`.

## 3. Goal / Acceptance Criteria

Goal:

Close F-09 by adding a visible communication-rate visualization surface for the
existing bounded network-speed model/class in the Phase 6 Operator HUD route.

F-09 closed requires:

1. A visible communication-rate visualization surface mounted in the Phase 6
   Operator HUD route.
2. Source wiring from existing bounded physical-input / handover-decision
   `networkSpeedMbps` model data, reconciled into class/bucket presentation.
3. Provenance labels that say `modeled class`, `bounded proxy`, or equivalent
   and explicitly say not measured throughput.
4. No raw measured-throughput presentation. Any Mbps wording is allowed only as
   a bounded model/class label, not as a live measured numeric value.
5. Color-not-only treatment: labels, symbols, line styles, bucket text, and a
   tabular fallback must carry the same meaning as color.
6. Reduced-motion support for trend animation, live-looking refresh, pulses, or
   transitions.
7. Accessibility: keyboard reachability, visible focus, ARIA labels/roles for
   the visualization and fallback table, and screen-reader-readable current
   modeled class.
8. Smoke evidence and screenshot evidence proving the surface is visible, the
   modeled-class label is visible, and forbidden claims are absent.

## 4. Scope / Non-Goals

In scope for a future implementation prompt:

- a single visualization surface for bounded `networkSpeedMbps` / rate class;
- placement in the Phase 6 Operator HUD route;
- use of existing physical-input and/or handover-decision bounded data;
- class/bucket mapping and copy that preserves provenance;
- color-not-only chart treatment and tabular fallback;
- accessibility, reduced-motion, smoke, and screenshot evidence;
- contract updates only where needed for the F-09 visualization surface.

Non-goals:

- no F-10 policy switcher;
- no F-11 rule editor;
- no F-16 export workflow;
- no F-13 `>=500 LEO` work;
- no live measurement, `iperf`, or `ping` integration;
- no V4.11 scene rewrite;
- no new endpoint pair;
- no native RF handover, active satellite, gateway, or path claim;
- no external NAT/tunnel/DUT/traffic-generator validation.

## 5. Forbidden Claims

The F-09 surface and any evidence docs must not claim:

- measured throughput numeric value. Mbps may appear only as a bounded class
  label or model/proxy source name, not as a raw measured number;
- live `ping` / `iperf` truth;
- `>=500 LEO` support or validation;
- active satellite, gateway, or path truth;
- native RF handover;
- external physical-layer truth;
- ESTNeT / INET end-to-end network truth;
- NAT, tunnel, bridge, virtual DUT, physical DUT, or traffic generator closure;
- full customer acceptance completion.

V4.11 boundary references:

- `docs/sdd/m8a-v4.11-content-and-visual-followup-spec.md:126-140` forbids
  active path, measured throughput, native RF handover, and live `ping/iPerf`
  claims in the V4.11 scene.
- `docs/sdd/m8a-v4.11-content-and-visual-followup-spec.md:632-638` excludes
  new source data, raw customer side-read, live external fetch, native RF handover,
  measured throughput, and `>=500 LEO` runtime scale delivery.

## 6. Phase Plan

Phase count: **5 implementation phases**.

### Phase 1 - Contract And Skill Query Reconciliation

Goal:

- lock the F-09 visualization contract before implementation starts.

Work:

- inventory `networkSpeedMbps` in physical-input, handover-decision, bootstrap
  source, telemetry, and smoke seams;
- decide whether the visualization consumes physical-input projected metrics,
  handover-decision snapshot candidates, or a small derived adapter;
- define bounded rate-class buckets and labels without implying measured
  throughput;
- reconcile the chart shape using the skill query outputs in §7: trend-over-time
  line, bullet/gauge, and tabular fallback;
- define exact provenance copy and forbidden-claim scan terms.

Reconciliation:

- compare the contract against the F-09 acceptance-report row;
- confirm no F-10/F-11/F-16/F-13 work is required;
- run a source grep for `measured throughput`, `live iperf`, `live ping`,
  `active gateway`, `native RF handover`, and `500 LEO`;
- receive planning/control confirmation on bucket labels and chart shape before
  Phase 2.

### Phase 2 - Component And Bounded-Class Data Wiring

Goal:

- create the rate visualization component and wire it to bounded class data.

Work:

- implement a focused communication-rate view model, adapter, or panel surface;
- derive current and historical class points from existing bounded data;
- preserve provenance fields from physical-input / handover-decision sources;
- expose deterministic selectors/data attributes for smoke and screenshot
  capture;
- mount inside the chosen Operator HUD location.

Reconciliation:

- verify the component does not alter handover decisions, policy behavior,
  scenario replay, report export, or V4.11 scene state;
- compare DOM labels against §5 forbidden claims;
- confirm `networkSpeedMbps` is not displayed as live measured throughput.

### Phase 3 - Visual, Accessibility, And Tabular Fallback

Goal:

- make the visualization reviewable without color-only or motion-only meaning.

Work:

- implement the selected trend/bullet/sparkline shape with explicit class text;
- add legend labels, line styles/patterns, markers, or bucket glyphs so color is
  not the only carrier;
- add a tabular fallback with timestamp/window, orbit/candidate, class label,
  and provenance/source columns;
- add ARIA label/description, keyboard access for any toggles, visible focus,
  and reduced-motion handling;
- keep text and controls inside stable dimensions so the Operator HUD does not
  shift.

Reconciliation:

- verify color-not-only and contrast 4.5:1;
- verify the fallback table carries all chart meaning;
- verify reduced-motion disables or freezes animated emphasis while preserving
  readable class state;
- verify no control depends on hover alone.

### Phase 4 - Smoke, Screenshot, And Acceptance Evidence

Goal:

- prove F-09 is visible and truth-bounded in the browser.

Work:

- add focused smoke coverage for surface mount, class label, provenance label,
  color-not-only fallback, reduced-motion, and forbidden-claim absence;
- capture screenshot evidence for the Phase 6 acceptance route;
- include at least one screenshot/DOM assertion that the visualization is not
  mounted as a V4.11 ground-station scene feature;
- assert no console error during the smoke flow.

Reconciliation:

- compare smoke selectors against the implementation contract;
- compare screenshots against §3 acceptance criteria;
- rerun forbidden-claim scan before close-out.

### Phase 5 - Final Reconciliation And Handoff Doc

Goal:

- prepare F-09 for close-out and the next candidate handoff.

Work:

- write a short implementation handoff/close-out note after the future
  implementation lands;
- record chosen chart shape, bucket thresholds, source seam, screenshot paths,
  smoke commands, and any accepted limitations;
- update the V4.11 disabled-tile copy only if planning/control explicitly wants
  a post-F-09 hookpoint copy update;
- leave F-16 as the next candidate.

Reconciliation:

- confirm F-09 is the only claimed closure;
- confirm F-16 remains deferred and not modified by F-09;
- confirm the implementation prompt did not expand into policy switching,
  rule editing, export, `>=500 LEO`, live measurement, or V4.11 rewrite work.

## 7. Skill Use Plan

Skill files read:

- `/home/u24/.codex/skills/ui-ux-pro-max/SKILL.md:47-62` prioritizes
  accessibility, interaction, layout, typography/color, animation, and charts.
- `/home/u24/.codex/skills/ui-ux-pro-max/SKILL.md:68-79` includes contrast,
  focus states, ARIA labels, keyboard navigation, color-not-only, and
  reduced-motion.
- `/home/u24/.codex/skills/frontend-ui-engineering/SKILL.md:77-114` favors
  separation of data handling from presentation and the simplest state ownership
  that works.
- `/home/u24/.codex/skills/frontend-ui-engineering/SKILL.md:159-167` requires
  semantic color tokens, contrast, and no color-only meaning.
- `/home/u24/.codex/skills/frontend-ui-engineering/SKILL.md:169-250` covers
  keyboard navigation, ARIA labels, focus management, meaningful empty states,
  and responsive testing breakpoints.

The repo-local `.codex` path is a file in this workspace, so the required
queries were run from the installed skill path:
`/home/u24/.codex/skills/ui-ux-pro-max/scripts/search.py`.

Phase-to-skill mapping:

- Phase 1 uses `chart` queries
  `rate visualization throughput modeled class chart`,
  `trend over time line chart bandwidth`, and
  `bullet gauge performance vs target` to lock chart shape, plus the `ux` query
  `modeled class proxy not measured truth disclaimer` for provenance/disclaimer
  reconciliation.
- Phase 2 uses `frontend-ui-engineering` component/data separation and simple
  state ownership; no new query is needed unless Phase 1 changes the source
  seam.
- Phase 3 uses the same three `chart` queries for line/bullet fallback details,
  plus the `ux` query `color not only data legend tabular fallback` for
  color-not-only, contrast, and table fallback checks.
- Phase 4 uses the `ux` query `color not only data legend tabular fallback`,
  `ui-ux-pro-max` accessibility/reduced-motion rules, and
  `frontend-ui-engineering` keyboard/ARIA/focus guidance for smoke and browser
  evidence.
- Phase 5 uses all five query outputs as acceptance reconciliation material so
  the handoff records which chart and UX guidance shaped the close-out.

Required query output, verbatim:

```text
## UI Pro Max Search Results
**Domain:** chart | **Query:** rate visualization throughput modeled class chart
**Source:** charts.csv | **Found:** 3 results

### Result 1
- **Data Type:** Trend Over Time
- **Keywords:** trend, time-series, line, growth, timeline, progress
- **Best Chart Type:** Line Chart
- **Secondary Options:** Area Chart, Smooth Area
- **When to Use:** Data has a time axis; user needs to observe rise/fall trends or rate of change over a continuous period
- **When NOT to Use:** Fewer than 4 data points (use stat card); more than 6 series (visual noise); no time dimension exists
- **Data Volume Threshold:** <1000 pts: SVG; ≥1000 pts: Canvas + downsampling; >10000: aggregate to intervals
- **Color Guidance:** Primary: #0080FF. Multiple series: distinct colors + distinct line styles. Fill: 20% opacity
- **Accessibility Grade:** AA
- **Accessibility Notes:** Differentiate series by line style (solid/dashed/dotted) not color alone. Add pattern overlays for colorblind users.
- **A11y Fallback:** Dashed/dotted lines per series; togglable data table with timestamps and values
- **Library Recommendation:** Chart.js, Recharts, ApexCharts
- **Interactive Level:** Hover + Zoom

### Result 2
- **Data Type:** Sentiment / Emotion
- **Keywords:** sentiment, emotion, nlp, opinion, feeling, text-analysis
- **Best Chart Type:** Word Cloud with Sentiment
- **Secondary Options:** Sentiment Arc, Radar Chart
- **When to Use:** NLP output visualization; exploratory analysis of text corpus sentiment; frequency-weighted keyword overview
- **When NOT to Use:** Precise values matter (word size is inherently imprecise); screen-reader context; corpus < 50 items
- **Data Volume Threshold:** 50–5000 terms optimal. Beyond 5000: apply top-N filtering before render. Avoid on mobile
- **Color Guidance:** Positive: #22C55E. Negative: #EF4444. Neutral: #94A3B8. Word size maps to frequency
- **Accessibility Grade:** C
- **Accessibility Notes:** Word clouds fail screen readers. Never use as sole output of NLP analysis. Always pair with list view.
- **A11y Fallback:** Sortable list view by frequency with sentiment label column; word cloud as supplementary only
- **Library Recommendation:** D3-cloud, Highcharts, Nivo
- **Interactive Level:** Hover + Filter

### Result 3
- **Data Type:** Performance vs Target
- **Keywords:** performance, target, kpi, gauge, goal, threshold, progress
- **Best Chart Type:** Gauge Chart or Bullet Chart
- **Secondary Options:** Dial, Thermometer
- **When to Use:** Single KPI measured against a defined target or threshold; dashboard summary context
- **When NOT to Use:** No target or benchmark exists; comparing multiple KPIs at once (use bullet chart grid)
- **Data Volume Threshold:** Single metric per gauge; for 3+ KPIs use bullet chart grid layout
- **Color Guidance:** Performance: Red → Yellow → Green gradient. Target: marker line. Threshold zones clearly differentiated
- **Accessibility Grade:** AA
- **Accessibility Notes:** Always show numerical value + % of target as text beside chart. Never rely on color position alone.
- **A11y Fallback:** Numerical value + % of target shown as visible text; ARIA live region for real-time updates
- **Library Recommendation:** D3.js, ApexCharts, Custom SVG
- **Interactive Level:** Hover
```

```text
## UI Pro Max Search Results
**Domain:** chart | **Query:** trend over time line chart bandwidth
**Source:** charts.csv | **Found:** 3 results

### Result 1
- **Data Type:** Trend Over Time
- **Keywords:** trend, time-series, line, growth, timeline, progress
- **Best Chart Type:** Line Chart
- **Secondary Options:** Area Chart, Smooth Area
- **When to Use:** Data has a time axis; user needs to observe rise/fall trends or rate of change over a continuous period
- **When NOT to Use:** Fewer than 4 data points (use stat card); more than 6 series (visual noise); no time dimension exists
- **Data Volume Threshold:** <1000 pts: SVG; ≥1000 pts: Canvas + downsampling; >10000: aggregate to intervals
- **Color Guidance:** Primary: #0080FF. Multiple series: distinct colors + distinct line styles. Fill: 20% opacity
- **Accessibility Grade:** AA
- **Accessibility Notes:** Differentiate series by line style (solid/dashed/dotted) not color alone. Add pattern overlays for colorblind users.
- **A11y Fallback:** Dashed/dotted lines per series; togglable data table with timestamps and values
- **Library Recommendation:** Chart.js, Recharts, ApexCharts
- **Interactive Level:** Hover + Zoom

### Result 2
- **Data Type:** Real-Time Streaming
- **Keywords:** streaming, real-time, ticker, live, velocity, pulse, monitoring
- **Best Chart Type:** Streaming Area Chart
- **Secondary Options:** Ticker Tape, Moving Gauge
- **When to Use:** Live monitoring dashboards; IoT/ops data updating at ≥1 Hz; user needs current value at a glance
- **When NOT to Use:** Update frequency < 1/min (use periodic-refresh line chart); flashing content without reduced-motion support
- **Data Volume Threshold:** Canvas/WebGL required. Buffer last 60–300s of data. Downsample older data on scroll
- **Color Guidance:** Current pulse: #00FF00 (dark theme) or #0080FF (light theme). History: fading opacity. Grid: dark background
- **Accessibility Grade:** B
- **Accessibility Notes:** Pause/resume control required. Current value as large visible text KPI. Respect prefers-reduced-motion.
- **A11y Fallback:** Pause/resume button required; current value shown as large text KPI; prefers-reduced-motion: freeze animation
- **Library Recommendation:** Smoothed D3.js, CanvasJS
- **Interactive Level:** Real-time + Pause + Zoom

### Result 3
- **Data Type:** Anomaly Detection
- **Keywords:** anomaly, outlier, spike, alert, detection, monitoring, deviation
- **Best Chart Type:** Line Chart with Highlights
- **Secondary Options:** Scatter with Alert
- **When to Use:** Monitoring a time-series for outliers; alerting users to unexpected spikes or dips in operational data
- **When NOT to Use:** Anomalies are predefined categories (use bar with highlight); real-time context without a pause control
- **Data Volume Threshold:** Stream at ≤60fps with Canvas; batch: up to 10,000 pts; mark anomalies as a separate data layer
- **Color Guidance:** Normal: #0080FF solid line. Anomaly marker: #FF0000 circle + filled. Alert band: #FFF3CD background zone
- **Accessibility Grade:** AA
- **Accessibility Notes:** Use shape marker (not color only) for anomaly points. Add text annotation per anomaly event.
- **A11y Fallback:** Text alert annotation per anomaly; anomaly summary list panel alongside chart
- **Library Recommendation:** D3.js, Plotly, ApexCharts
- **Interactive Level:** Hover + Alert
```

```text
## UI Pro Max Search Results
**Domain:** chart | **Query:** bullet gauge performance vs target
**Source:** charts.csv | **Found:** 3 results

### Result 1
- **Data Type:** Performance vs Target
- **Keywords:** performance, target, kpi, gauge, goal, threshold, progress
- **Best Chart Type:** Gauge Chart or Bullet Chart
- **Secondary Options:** Dial, Thermometer
- **When to Use:** Single KPI measured against a defined target or threshold; dashboard summary context
- **When NOT to Use:** No target or benchmark exists; comparing multiple KPIs at once (use bullet chart grid)
- **Data Volume Threshold:** Single metric per gauge; for 3+ KPIs use bullet chart grid layout
- **Color Guidance:** Performance: Red → Yellow → Green gradient. Target: marker line. Threshold zones clearly differentiated
- **Accessibility Grade:** AA
- **Accessibility Notes:** Always show numerical value + % of target as text beside chart. Never rely on color position alone.
- **A11y Fallback:** Numerical value + % of target shown as visible text; ARIA live region for real-time updates
- **Library Recommendation:** D3.js, ApexCharts, Custom SVG
- **Interactive Level:** Hover

### Result 2
- **Data Type:** Performance vs Target (Compact)
- **Keywords:** bullet, compact, kpi, dashboard, target, benchmark, range
- **Best Chart Type:** Bullet Chart
- **Secondary Options:** Gauge, Progress Bar
- **When to Use:** Dashboard with multiple KPIs side by side; space-constrained contexts where a gauge is too large
- **When NOT to Use:** Single KPI with emphasis (use gauge); data has no defined target range; fewer than 3 KPIs
- **Data Volume Threshold:** Ideal for 3–10 bullet charts in a grid; scales to any count efficiently
- **Color Guidance:** Qualitative ranges: #FFCDD2 / #FFF9C4 / #C8E6C9 (bad/ok/good). Performance bar: #1976D2. Target: black 3px marker
- **Accessibility Grade:** AAA
- **Accessibility Notes:** All values always visible as text. Color ranges are labeled with text thresholds not color alone.
- **A11y Fallback:** Numerical values always visible (not hover-only); color ranges labeled with threshold text
- **Library Recommendation:** D3.js, Plotly, Custom SVG
- **Interactive Level:** Hover

### Result 3
- **Data Type:** Flow / Process Data
- **Keywords:** flow, process, sankey, distribution, source, target, transfer
- **Best Chart Type:** Sankey Diagram
- **Secondary Options:** Alluvial, Chord Diagram
- **When to Use:** Showing how quantities flow between nodes; multi-source multi-target distribution
- **When NOT to Use:** Flow directions form loops (use network graph); fewer than 3 source-target pairs; mobile-primary context
- **Data Volume Threshold:** <50 flows: SVG; ≥50: Canvas; >200 flows: aggregate minor flows into 'Other' node
- **Color Guidance:** Gradient from source to target color. Flow opacity: 0.4–0.6. Node labels always visible
- **Accessibility Grade:** C
- **Accessibility Notes:** Structural flow charts cannot be conveyed by color alone. Provide flow table. Avoid on mobile.
- **A11y Fallback:** Flow table (Source → Target → Value); keyboard-traversable node list with tab stops
- **Library Recommendation:** D3.js (d3-sankey), Plotly
- **Interactive Level:** Hover + Drilldown
```

```text
## UI Pro Max Search Results
**Domain:** ux | **Query:** modeled class proxy not measured truth disclaimer
**Source:** ux-guidelines.csv | **Found:** 3 results

### Result 1
- **Category:** AI Interaction
- **Issue:** Disclaimer
- **Platform:** All
- **Description:** Users need to know they talk to AI
- **Do:** Clearly label AI generated content
- **Don't:** Present AI as human
- **Code Example Good:** AI Assistant label
- **Code Example Bad:** Fake human name without label
- **Severity:** High

### Result 2
- **Category:** Navigation
- **Issue:** Sticky Navigation
- **Platform:** Web
- **Description:** Fixed nav should not obscure content
- **Do:** Add padding-top to body equal to nav height
- **Don't:** Let nav overlap first section content
- **Code Example Good:** pt-20 (if nav is h-20)
- **Code Example Bad:** No padding compensation
- **Severity:** Medium

### Result 3
- **Category:** Animation
- **Issue:** Duration Timing
- **Platform:** All
- **Description:** Animations should feel responsive not sluggish
- **Do:** Use 150-300ms for micro-interactions
- **Don't:** Use animations longer than 500ms for UI
- **Code Example Good:** transition-all duration-200
- **Code Example Bad:** duration-1000
- **Severity:** Medium
```

The `modeled class proxy not measured truth disclaimer` query returned rows, but
no direct row for modeled-throughput/proxy truth labeling. Apply the analogous
disclaimer rule plus the repo-specific forbidden-claim boundaries in §5.

```text
## UI Pro Max Search Results
**Domain:** ux | **Query:** color not only data legend tabular fallback
**Source:** ux-guidelines.csv | **Found:** 3 results

### Result 1
- **Category:** Accessibility
- **Issue:** Color Only
- **Platform:** All
- **Description:** Don't convey information by color alone
- **Do:** Use icons/text in addition to color
- **Don't:** Red/green only for error/success
- **Code Example Good:** Red text + error icon
- **Code Example Bad:** Red border only for error
- **Severity:** High

### Result 2
- **Category:** Accessibility
- **Issue:** Color Contrast
- **Platform:** All
- **Description:** Text must be readable against background
- **Do:** Minimum 4.5:1 ratio for normal text
- **Don't:** Low contrast text
- **Code Example Good:** #333 on white (7:1)
- **Code Example Bad:** #999 on white (2.8:1)
- **Severity:** High

### Result 3
- **Category:** Data Entry
- **Issue:** Bulk Actions
- **Platform:** Web
- **Description:** Editing one by one is tedious
- **Do:** Allow multi-select and bulk edit
- **Don't:** Single row actions only
- **Code Example Good:** Checkbox column + Action bar
- **Code Example Bad:** Repeated actions per row
- **Severity:** Low
```

## 8. V4.11 Entanglement Check

Entanglement assessment: **independent**.

F-09 lives in the Phase 6 acceptance route and Operator HUD seam, not in the
V4.11 ground-station scene.

Reasons:

- The V4.11 spec says Phase 6 owns bounded/proxy seams for communication time,
  handover decision, physical input, and validation state
  (`docs/sdd/m8a-v4.11-content-and-visual-followup-spec.md:115-123`).
- The V4.11 metrics table marks `Dedicated communication-rate visualization` as
  not reachable from the scene and says F-09 remains `pending`
  (`docs/sdd/m8a-v4.11-content-and-visual-followup-spec.md:220-224`).
- The Bootstrap Operator HUD and V4.11 ground-station scene are mounted through
  separate route/runtime branches (`src/runtime/bootstrap/composition.ts:512-520`
  and `src/runtime/bootstrap/composition.ts:655-661`).

Post-F-09 note:

Once F-09 is closed, the V4.11 disabled tile in spec v2 §4.3 should reference
the completed Phase 6 communication-rate surface instead of saying F-09 remains
`pending`. That should be handled as post-V4.11 copy coordination or a separate
V4.11 hookpoint-copy update, not as part of the F-09 implementation unless
planning/control explicitly includes it.

## 9. Open Questions For Planning/Control

1. Visualization shape: trend-over-time line vs bullet/gauge vs tabular
   sparkline? The audit suggested trend-over-time plus bullet.
2. Color encoding: one line per orbit class, one line per actor/candidate, or
   aggregate class state?
3. Time range: full session, rolling window, or per V4.6D window?
4. Y-axis: bounded class buckets such as low/mid/high, or numeric class value?
   Numeric display must not imply measured truth.
5. Hookpoint copy in the existing Communication Time panel: update the panel
   text, or leave Communication Time alone?
6. Should F-09 live inside the existing Communication Time panel, or as a
   sibling adjacent panel/slot?

## 10. Acceptance Gates

Future implementation cannot be accepted unless these gates pass:

- accessibility per spec v2 §10.3 pattern: keyboard order, visible focus,
  color-not-only, and reduced-motion
  (`docs/sdd/m8a-v4.11-content-and-visual-followup-spec.md:639-648`);
- color-not-only verification for every rate class, line, marker, and status;
- contrast 4.5:1 for normal text and chart labels;
- reduced-motion support for animations, pulses, streaming effects, and
  transition emphasis;
- forbidden-claim scan green for measured throughput, live `ping/iPerf`, active
  path/gateway/satellite, native RF handover, and `>=500 LEO`;
- modeled-class / bounded-proxy label visible in the same surface as the chart;
- tabular fallback visible or reachable by keyboard;
- smoke evidence for mount, class label, provenance label, fallback, and
  forbidden-claim absence;
- screenshot evidence from the Phase 6 acceptance route.

## 11. Open After Planning SDD

This SDD does not settle these implementation-prompt decisions:

- exact visualization shape and whether the final surface combines a trend line
  with a compact bullet/class readout;
- bucket thresholds and labels for low/mid/high or equivalent bounded classes;
- whether raw `networkSpeedMbps` values are transformed before display and how
  the source value is kept out of measured-throughput copy;
- source seam: physical-input projected metrics, handover-decision snapshots, or
  a dedicated derived adapter;
- time window and sampling cadence for the chart/fallback table;
- Operator HUD placement: existing Communication Time panel vs sibling rate
  panel/slot;
- exact ARIA structure and keyboard flow for chart/table toggles;
- screenshot viewport set and smoke selectors;
- whether the V4.11 disabled tile copy is updated after F-09 closes;
- whether F-16 planning resumes immediately after F-09 close-out.
