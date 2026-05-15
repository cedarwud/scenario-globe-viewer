# M8A V4.12 F-09 Implementation Phase 1 Visualization Spec

Date: 2026-05-06
Working phase name: **M8A V4.12 customer must-have followup**.

Status: Phase 1 contract/spec lock-in only. This document does not authorize
component implementation, styling, smoke work, V4.11 scene changes, or commits.

Authority context:

- F-09 acceptance status remains `pending`: `networkSpeedMbps` already exists
  inside physical-input and handover-decision models, but no dedicated
  communication-rate visualization surface exists.
- F-12 is already `completed (bounded)` for the repo-owned handover decision seam:
  latency, jitter, and network speed are deterministic bounded/proxy metrics,
  not measured truth.
- F-09 therefore closes only a bounded visualization seam. It must not promote
  `networkSpeedMbps` into measured throughput.

## 1. Visualization Shape Decision

Decision: use a compact modeled-class trend line over bounded simulation windows,
with a text-first current class readout and a data-table fallback. Do not use a
gauge/bullet as the primary visualization, and do not use a sparkline as the
sole visualization.

Rationale:

- A rate-class visualization has a time/window dimension, so the line-chart
  guidance is the closest match.
- A gauge/bullet requires a target or benchmark and pushes visible numeric
  value/%-of-target copy. That conflicts with F-09's no measured numeric
  throughput claim.
- A sparkline-only surface would hide the class vocabulary and would not satisfy
  the explicit legend/table/accessibility contract.
- The future implementation should use discrete/stepped class positions, not a
  continuous numeric Mbps axis. The visible axis labels are the class labels in
  Section 2.

Required skill query results were run with the exact requested query strings and
domains. The repo-local `.codex` path is an empty file in this workspace, so the
installed skill path was used:
`/home/u24/.codex/skills/ui-ux-pro-max/scripts/search.py`.

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
**Domain:** chart | **Query:** trend over time line chart dashboard
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
```

```text
## UI Pro Max Search Results
**Domain:** chart | **Query:** bullet gauge performance bounded class
**Source:** charts.csv | **Found:** 2 results

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
```

```text
## UI Pro Max Search Results
**Domain:** ux | **Query:** color not only data legend accessible
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
- **Category:** Accessibility
- **Issue:** ARIA Labels
- **Platform:** All
- **Description:** Interactive elements need accessible names
- **Do:** Add aria-label for icon-only buttons
- **Don't:** Icon buttons without labels
- **Code Example Good:** aria-label='Close menu'
- **Code Example Bad:** <button><Icon/></button>
- **Severity:** High
```

```text
## UI Pro Max Search Results
**Domain:** ux | **Query:** tabular fallback chart data table
**Source:** ux-guidelines.csv | **Found:** 3 results

### Result 1
- **Category:** Responsive
- **Issue:** Table Handling
- **Platform:** Web
- **Description:** Tables can overflow on mobile
- **Do:** Use horizontal scroll or card layout
- **Don't:** Wide tables breaking layout
- **Code Example Good:** overflow-x-auto wrapper
- **Code Example Bad:** Table overflows viewport
- **Severity:** Medium

### Result 2
- **Category:** Data Entry
- **Issue:** Bulk Actions
- **Platform:** Web
- **Description:** Editing one by one is tedious
- **Do:** Allow multi-select and bulk edit
- **Don't:** Single row actions only
- **Code Example Good:** Checkbox column + Action bar
- **Code Example Bad:** Repeated actions per row
- **Severity:** Low

### Result 3
- **Category:** Sustainability
- **Issue:** Auto-Play Video
- **Platform:** Web
- **Description:** Video consumes massive data and energy
- **Do:** Click-to-play or pause when off-screen
- **Don't:** Auto-play high-res video loops
- **Code Example Good:** playsInline muted preload='none'
- **Code Example Bad:** autoplay loop
- **Severity:** Medium
```

## 2. Class Bucket Vocabulary

Decision: use the existing V4.6D bounded network-speed class vocabulary, not
new low/mid/high labels.

Accepted F-09 class ids:

```ts
type CommunicationRateClass =
  | "candidate-capacity-context-class"
  | "continuity-context-class"
  | "guard-context-class";
```

Visible labels:

| Class id | Visible label | Meaning |
| --- | --- | --- |
| `candidate-capacity-context-class` | Candidate capacity context | The source window contains the strongest bounded candidate-capacity context for display. |
| `continuity-context-class` | Continuity context | The source window is modeled as a bounded continuity context. |
| `guard-context-class` | Guard context | The source window is modeled as a bounded guard/fallback context. |

Source alignment evidence:

```text
docs/sdd/m8a-v4.6d-simulation-handover-model-contract.md:172:  metricTruth: "modeled-bounded-class-not-measured";
docs/sdd/m8a-v4.6d-simulation-handover-model-contract.md:175:  numericThroughputAllowed: false;
docs/sdd/m8a-v4.6d-simulation-handover-model-contract.md:179:    "network-speed-class",
docs/sdd/m8a-v4.6d-simulation-handover-model-contract.md:235:  networkSpeedClass:
docs/sdd/m8a-v4.6d-simulation-handover-model-contract.md:236:    | "candidate-capacity-context-class"
docs/sdd/m8a-v4.6d-simulation-handover-model-contract.md:237:    | "continuity-context-class"
docs/sdd/m8a-v4.6d-simulation-handover-model-contract.md:238:    | "guard-context-class";
src/runtime/m8a-v4-ground-station-projection.ts:266:  metricTruth: "modeled-bounded-class-not-measured";
src/runtime/m8a-v4-ground-station-projection.ts:275:  networkSpeedClass:
src/runtime/m8a-v4-ground-station-projection.ts:276:    | "candidate-capacity-context-class"
src/runtime/m8a-v4-ground-station-projection.ts:277:    | "continuity-context-class"
src/runtime/m8a-v4-ground-station-projection.ts:278:    | "guard-context-class";
src/runtime/m8a-v4-ground-station-projection.ts:339:  numericThroughputAllowed: false;
```

Classification rule for Phase 2:

- Group projected physical candidates by orbit class for chart series. This
  gives at most three series: LEO, MEO, GEO.
- Map each window/orbit-class group to one of the accepted class ids. The
  internal rank can use bounded projected `networkSpeedMbps`, but the displayed
  point and table cell must show only the class id/label.
- Do not invent numeric thresholds. Do not show low/mid/high. Do not show raw
  Mbps values in the visualization.

Resolved open questions:

- Color encoding: use one series per orbit class, with text labels, marker
  shapes, and line styles. Do not use one line per actor/candidate. Do not rely
  on aggregate state alone; show aggregate current class as text, and keep
  source candidate rows in the table fallback.
- Y-axis: use bounded class buckets only. Any numeric ordinal used by rendering
  is internal and must not be displayed or announced as data.

## 3. Source Seam Contract

Decision: physical-input bounded projected metrics own the communication-rate
data. Handover-decision is a downstream proxy consumer and may be used only for
decision context such as selected/serving candidate ids. It must not become the
rate data owner.

The future F-09 adapter should consume `PhysicalInputState.projectedMetrics`
from the Phase 6 physical-input controller. If handover context is useful, the
adapter may join on candidate id, but the rate class source remains
physical-input.

Source-grep evidence for physical-input ownership:

```bash
rg -n "PHYSICAL_INPUT_BOUNDARY_NOTE|PHYSICAL_INPUT_BOUNDARY_DETAIL|PHYSICAL_INPUT_PROJECTION_TARGET|ProjectedPhysicalDecisionMetrics|networkSpeedMbps: number|provenanceKind: PhysicalInputProvenanceKind|provenanceKind: \"bounded-proxy\"" src/features/physical-input/physical-input.ts
```

```text
5:export const PHYSICAL_INPUT_BOUNDARY_NOTE =
7:export const PHYSICAL_INPUT_BOUNDARY_DETAIL =
9:export const PHYSICAL_INPUT_PROJECTION_TARGET =
65:    networkSpeedMbps: number;
85:export interface ProjectedPhysicalDecisionMetrics {
90:  networkSpeedMbps: number;
91:  provenanceKind: PhysicalInputProvenanceKind;
116:  projectionTarget: typeof PHYSICAL_INPUT_PROJECTION_TARGET;
130:      networkSpeedMbps: number;
135:      networkSpeedMbps: number;
150:  projectedMetrics: ReadonlyArray<ProjectedPhysicalDecisionMetrics>;
151:  projectionTarget: typeof PHYSICAL_INPUT_PROJECTION_TARGET;
176:  { latencyMs: number; jitterMs: number; networkSpeedMbps: number }
331:  networkSpeedMbps: number;
370:): ProjectedPhysicalDecisionMetrics {
411:    provenanceKind: "bounded-proxy"
416:  projectedMetrics: ReadonlyArray<ProjectedPhysicalDecisionMetrics>,
418:): ProjectedPhysicalDecisionMetrics {
569:    projectionTarget: PHYSICAL_INPUT_PROJECTION_TARGET,
570:    disclaimer: PHYSICAL_INPUT_BOUNDARY_NOTE,
589:      projectionTarget: PHYSICAL_INPUT_PROJECTION_TARGET,
590:      disclaimer: PHYSICAL_INPUT_BOUNDARY_NOTE,
```

Source-grep evidence for handover-decision as consumer/proxy:

```bash
rg -n "HANDOVER_DECISION_PROXY_PROVENANCE|not measured latency|networkSpeedMbps: number|highestNetworkSpeed|network-speed-better|must stay bounded-proxy" src/features/handover-decision/handover-decision.ts
```

```text
3:export const HANDOVER_DECISION_PROXY_PROVENANCE = "bounded-proxy" as const;
4:export const HANDOVER_DECISION_PROXY_PROVENANCE_LABEL =
5:  HANDOVER_DECISION_PROXY_PROVENANCE;
6:export const HANDOVER_DECISION_PROXY_PROVENANCE_NOTE =
8:export const HANDOVER_DECISION_PROXY_PROVENANCE_DETAIL =
9:  "Deterministic bootstrap candidate metrics used for repo-owned handover evaluation; not measured latency, jitter, or throughput truth.";
12:export type DecisionInputProvenance = typeof HANDOVER_DECISION_PROXY_PROVENANCE;
21:  | "network-speed-better"
31:  networkSpeedMbps: number;
95:  "network-speed-better",
233:    if (candidate.provenance !== HANDOVER_DECISION_PROXY_PROVENANCE) {
235:        `Handover decision candidate provenance must stay bounded-proxy: ${candidate.candidateId}`
254:  const highestNetworkSpeed = Math.max(
263:      Number(candidate.networkSpeedMbps === highestNetworkSpeed)
362:      inputKind: HANDOVER_DECISION_PROXY_PROVENANCE,
363:      label: HANDOVER_DECISION_PROXY_PROVENANCE_LABEL,
364:      note: HANDOVER_DECISION_PROXY_PROVENANCE_NOTE,
365:      detail: HANDOVER_DECISION_PROXY_PROVENANCE_DETAIL
443:      reasonCodes.add("network-speed-better");
462:    inputKind: HANDOVER_DECISION_PROXY_PROVENANCE,
463:    label: HANDOVER_DECISION_PROXY_PROVENANCE_LABEL,
464:    note: HANDOVER_DECISION_PROXY_PROVENANCE_NOTE,
465:    detail: HANDOVER_DECISION_PROXY_PROVENANCE_DETAIL
```

Source-grep evidence for the physical-to-handover bridge:

```bash
rg -n "toHandoverCandidateMetrics|resolveBootstrapPhysicalProjectedMetrics|networkSpeedMbps: candidate.networkSpeedMbps|provenance: HANDOVER_DECISION_PROXY_PROVENANCE" src/runtime/bootstrap-handover-decision-source.ts
```

```text
8:  resolveBootstrapPhysicalProjectedMetrics,
40:function toHandoverCandidateMetrics(
41:  projectedMetrics: ReturnType<typeof resolveBootstrapPhysicalProjectedMetrics>
48:    networkSpeedMbps: candidate.networkSpeedMbps,
49:    provenance: HANDOVER_DECISION_PROXY_PROVENANCE
147:  const projectedMetrics = resolveBootstrapPhysicalProjectedMetrics(
174:    candidates: toHandoverCandidateMetrics(projectedMetrics)
```

Source-grep absence check for an existing rate surface:

```bash
rg -n "communication-rate|communication rate|rate visualization|throughput chart|network speed chart|network-speed chart|rate-panel|rate chart|data-rate" src/features src/runtime/bootstrap tests/smoke
```

```text
No matches.
```

## 4. Time Window Choice

Decision: use bounded simulation windows, aligned to the existing physical-input
active-window model and the V4.6D class/window vocabulary. Do not use a rolling
live buffer.

Phase 2 should render a finite set of window points for the current scenario,
with the active window identified in text and in the table. This is effectively
a full bounded-session view expressed as per-window samples, not a live
streaming chart. The source window should come from physical-input state:
`activeWindow.startRatio`, `activeWindow.stopRatio`, and `activeWindow.contextLabel`.

Rationale:

- Full-session raw samples would imply a precision the current source does not
  own.
- Rolling-window streaming would imply live measurement. The skill query's
  streaming result also requires pause/resume and current numeric KPI behavior,
  which is not part of F-09 Phase 2.
- Per-window class points align with V4.6D's existing
  `modeled-bounded-class-not-measured` and `numericThroughputAllowed: false`
  pattern.

Resolved open question:

- Time range: bounded per-window samples over the scenario, with active window
  emphasis. Not a rolling live chart.

## 5. HUD Placement

Decision: place F-09 inside the existing Communication Time panel as a dedicated
`Communication Rate` section mounted in the existing communication slot. Do not
add a new Operator HUD slot in Phase 2.

Placement evidence:

```bash
rg -n "Communication Time|Status|Available|Unavailable|Remaining Available|Provenance|data-communication-panel" src/features/communication-time/bootstrap-communication-time-panel.ts
```

```text
34:  "communicationStatus",
37:  "communicationProvenanceDetail"
56:    <div class="communication-time-panel" data-communication-panel="bootstrap">
58:        <span class="communication-time-panel__eyebrow">Communication Time</span>
69:        ${createField("Status", "status")}
70:        ${createField("Available", "available")}
71:        ${createField("Unavailable", "unavailable")}
72:        ${createField("Remaining Available", "remaining")}
73:        ${createField("Provenance", "provenance")}
79:    "[data-communication-panel='bootstrap']"
149:  elements.root.dataset.communicationStatus = state.currentStatus.kind;
152:  elements.root.dataset.communicationProvenanceDetail = state.provenance.detail;
155:    communicationStatus: state.currentStatus.kind,
158:    communicationProvenanceDetail: state.provenance.detail
```

```bash
rg -n "data-operator-communication-slot|data-operator-physical-slot|data-operator-decision-slot|mountBootstrapCommunicationTimePanel|mountBootstrapPhysicalInputPanel|mountBootstrapHandoverDecisionPanel" src/features/operator/bootstrap-operator-hud.ts
```

```text
8:import { mountBootstrapCommunicationTimePanel } from "../communication-time";
9:import { mountBootstrapHandoverDecisionPanel } from "../handover-decision";
10:import { mountBootstrapPhysicalInputPanel } from "../physical-input";
159:          data-operator-communication-slot="true"
163:          data-operator-physical-slot="true"
167:          data-operator-decision-slot="true"
205:    "[data-operator-communication-slot='true']"
208:    "[data-operator-physical-slot='true']"
211:    "[data-operator-decision-slot='true']"
340:  const unmountCommunicationTimePanel = mountBootstrapCommunicationTimePanel({
344:  const unmountPhysicalInputPanel = mountBootstrapPhysicalInputPanel({
348:  const unmountHandoverDecisionPanel = mountBootstrapHandoverDecisionPanel({
```

Rationale:

- The Operator HUD already has a communication slot but no dedicated rate slot.
- Adding a sibling slot would widen HUD structure and likely require styling
  work, which belongs outside Phase 1.
- The existing Communication Time panel already owns the communication context,
  and the rate section can be a dedicated surface without changing V4.11.

Resolved open questions:

- Hookpoint copy: leave existing Communication Time fields and copy intact. Add
  a separate `Communication Rate` section with its own heading and footnote.
- Placement: inside the existing Communication Time panel, not a new sibling
  panel/slot.

## 6. ARIA And Keyboard Outline

Phase 2/3 accessibility contract:

- The visualization container must be focusable with `tabindex="0"` when it has
  chart content, and it must have an accessible name such as
  `aria-labelledby="communication-rate-heading"`.
- The chart must expose a concise description via `aria-describedby`, including
  current modeled class, source kind, active window, and the phrase
  `Modeled, not measured.`
- If the chart exposes point navigation, left/right arrows move between window
  points and update the accessible description. If point navigation is not
  implemented, the focus target opens no hidden keyboard-only interaction and
  simply provides the summary.
- The data-table fallback must be reachable by keyboard through a visible
  button with `aria-expanded` and `aria-controls`.
- The fallback table must use a real table element with a caption and columns:
  window, orbit class, candidate context, modeled network-speed class,
  provenance, and note.
- A polite live region may announce changes only when the active modeled class
  changes. Do not announce every animation frame or replay tick.
- Visible focus indicators are required for the chart focus target, table
  toggle, and any point controls.
- Reduced-motion must freeze or remove class-transition animation while keeping
  the current modeled class readable.

Screen reader announcement format:

```text
Communication rate. Modeled network-speed class: Candidate capacity context.
Source: physical-input bounded proxy. Window: <window label>. Modeled, not measured.
```

Color-not-only contract:

- LEO, MEO, and GEO series must have distinct visible text labels and distinct
  line styles or markers.
- Class meaning must appear in point labels and the table, not only in color.
- The table is not optional evidence; it is the accessibility fallback for chart
  meaning.

## 7. Forbidden-Claim Discipline

The F-09 surface must obey these display rules:

- No Mbps numeric value may claim or appear to claim measured truth.
- The bounded class label must be visible wherever a future implementation
  mentions the `networkSpeedMbps` source field.
- The phrase `Modeled, not measured.` must appear on the F-09 surface itself.
- The surface must also identify the source as `physical-input bounded proxy`
  or equivalent.
- Do not imply live `ping`, live `iperf`, speed test, ESTNeT, INET, external
  tunnel/bridge/DUT, physical traffic generator, NAT validation, or measured
  network truth.
- Do not claim active satellite, gateway, teleport path, native RF handover,
  endpoint-pair promotion, R2 promotion, F-10/F-11/F-16 closure, F-13 `>=500 LEO`
  closure, or full customer acceptance completion.
- Do not mount or describe this as a V4.11 ground-station scene feature.

Allowed copy examples:

- `Communication Rate`
- `Modeled network-speed class`
- `Candidate capacity context`
- `Physical-input bounded proxy`
- `Modeled, not measured.`

Disallowed copy examples:

- `Measured throughput`
- `Live Mbps`
- `iPerf result`
- `Ping-verified rate`
- `ESTNeT throughput`
- `INET speed`
- `Active gateway rate`

## 8. Contract Types If Applicable

No TypeScript files are changed in Phase 1. The existing Phase 6 physical-input
contract already carries the source metric and provenance. The F-09 contract is
a derived visualization/view-model contract, not a mutation of physical-input or
handover-decision source truth.

Written adapter contract for Phase 2:

```ts
type CommunicationRateClass =
  | "candidate-capacity-context-class"
  | "continuity-context-class"
  | "guard-context-class";

type CommunicationRateSourceModule = "physical-input";
type CommunicationRateSourceField = "networkSpeedMbps";
type CommunicationRateTruthState = "modeled-bounded-class-not-measured";

interface CommunicationRateWindowRef {
  startRatio: number;
  stopRatio: number;
  contextLabel: string;
}

interface CommunicationRateClassPoint {
  window: CommunicationRateWindowRef;
  orbitClass: "leo" | "meo" | "geo";
  candidateContextIds: ReadonlyArray<string>;
  classId: CommunicationRateClass;
  label:
    | "Candidate capacity context"
    | "Continuity context"
    | "Guard context";
  provenanceKind: "bounded-proxy";
}

interface CommunicationRateSnapshot {
  scenarioId: string;
  evaluatedAt: string;
  sourceModule: CommunicationRateSourceModule;
  sourceField: CommunicationRateSourceField;
  truthState: CommunicationRateTruthState;
  activeWindow: CommunicationRateWindowRef;
  currentClass: CommunicationRateClass | "unavailable";
  points: ReadonlyArray<CommunicationRateClassPoint>;
  footnote: "Modeled, not measured.";
  numericThroughputDisplayAllowed: false;
}
```

Recommended Phase 2 file placement if code is added:

- `src/features/communication-rate/communication-rate.ts` for the derived class
  snapshot contract and adapter.
- `src/features/communication-rate/bootstrap-communication-rate-section.ts` for
  the future DOM section, mounted by the Communication Time panel.

F-09 SDD Section 9 open-question resolution matrix:

| Open question | Resolution |
| --- | --- |
| 1. Visualization shape | Modeled-class trend line over bounded windows, with text current class and table fallback. |
| 2. Color encoding | One series per orbit class, with line style/marker/text labels. No actor/candidate line series. |
| 3. Time range | Bounded per-window samples over the current scenario; no rolling live buffer. |
| 4. Y-axis | Class buckets only: candidate capacity context, continuity context, guard context. No numeric axis labels. |
| 5. Hookpoint copy | Leave existing Communication Time copy intact; add a dedicated Communication Rate section. |
| 6. HUD placement | Inside the existing Communication Time panel under the existing communication slot. |

Phase 1 closeout state:

- TS contract files changed: none.
- Compile required: no, because no TS files changed.
- Smoke required: no, because no TS/runtime/CSS files changed.
- V4.11 scene changed: no.
- Phase 2/3/4/5 implementation leaked: no.
- Measured-truth claim added: no.
