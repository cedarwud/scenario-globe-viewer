# M8A-V3 D-03 Presentation Polish Slice Plan

Date: 2026-05-13
Working phase name: **M8A-V3 D-03 presentation composition polish**.

## 0. Purpose

The V4.12 + V4.13 customer must-have chain landed five new bounded surfaces inside
the bootstrap Operator HUD:

- F-09 Communication Rate section (inside the Communication Time panel)
- F-10 Handover Policy selector (inside the operator control row)
- F-11 Handover Rule Config editor (inside the Handover Decision panel)
- F-13 / V4.13 multi-orbit point-primitive overlay (scene layer)
- F-16 Report Export action (inside the operator control row, between
  controls and telemetry slots)

These slices preserved the V4.12 contract surface and added all of the
required runtime data. However, they did not redesign default-visible
composition. The post-V4.12 + V4.13 Operator HUD now packs the following into
one bottom-anchored `hud-panel--status` container:

```
operator-status-hud
├─ __controls   (5-col grid: Scenario heading | Scenario | Replay Mode | Replay Speed | Handover Policy)
├─ __report-export   (full-width Report Export action — F-16)
├─ __telemetry  (auto-fit minmax(15rem, 1fr) — 6 slots:
│                 Time placeholder, Communication Time + F-09,
│                 Physical Inputs, Handover Decision + F-11,
│                 Scene Starter, Validation State)
```

Baseline screenshots captured at desktop-1440x900 show that this single
container now occupies between 40% and 60% of vertical screen real-estate on
the default operator route. That directly fails three of the four M8A-V3
**Hard Gates** in
[`m8a-v3-validation-and-acceptance-plan.md`](./m8a-v3-validation-and-acceptance-plan.md#hard-gates):

- HG1: the Earth/corridor/orbit scene must remain the primary subject
- HG2: the default addressed scene must not be panel-led
- HG3: one compact primary information surface must remain the default
  visible satcom surface

D-03 is therefore unblocked and overdue. This plan inventories the gaps,
proposes scoped slices, and locks the slice-1 execution boundary so this
conversation can land slice 1 without scope drift.

Parent SDD: see
[`m8a-v3-presentation-convergence-umbrella-plan.md`](./m8a-v3-presentation-convergence-umbrella-plan.md).

Related authority chain:

- [`m8a-v3-primary-scene-composition-plan.md`](./m8a-v3-primary-scene-composition-plan.md)
- [`m8a-v3-camera-and-overlay-convergence-plan.md`](./m8a-v3-camera-and-overlay-convergence-plan.md)
- [`m8a-v3-motion-and-replay-affordance-plan.md`](./m8a-v3-motion-and-replay-affordance-plan.md)
- [`m8a-v3-entry-and-first-impression-plan.md`](./m8a-v3-entry-and-first-impression-plan.md)
- [`m8a-v3-validation-and-acceptance-plan.md`](./m8a-v3-validation-and-acceptance-plan.md)
- [`m8a-v4.12-followup-index.md`](./m8a-v4.12-followup-index.md)
- [`m8a-v4.13-multi-orbit-scale-runtime-plan.md`](./m8a-v4.13-multi-orbit-scale-runtime-plan.md)

Acceptance-report row to update on close-out of the full D-03 slice chain:
[`itri-acceptance-report-2026-04-20/01-itri-requirement-inventory-and-status.md`](../../../itri/itri-acceptance-report-2026-04-20/01-itri-requirement-inventory-and-status.md)
row D-03 (currently `部分完成`).

## 1. Status

- planning-only SDD (slice-1 execution authorized for this conversation)
- no runtime implementation authority by itself
- D-03 row in the acceptance report is **not** allowed to change until all
  approved slices are landed and the umbrella Hard Gates are met
- preserves the V3 umbrella scope lock: first-case `OneWeb LEO + Intelsat GEO`
  aviation, service-layer switching, `isNativeRfHandover = false`
- preserves every V4.12 acceptance smoke selector and every V4.13 multi-orbit
  evidence surface

## 2. Scope Lock

D-03 polish is scoped to default-visible **composition** of the Operator HUD
and its parent `hud-panel--status` container, plus the truth-boundary copy
that already lives inside the V4.12 panels. It is not scoped to:

- new customer must-have closure (F-01, F-02 measured, F-07/F-08/F-12 measured,
  F-17, V-02..V-06)
- new endpoint authority (M8A-V4 ground-station / second operator pair)
- new customer orbit-model integration
- measurement-backed truth substitution
- entry/discovery layer (first-impression and homepage CTA are scoped to
  M8A-V3.1; not reopened here)
- motion / replay affordance redesign (M8A-V3.3; not reopened here)
- camera reframing logic (M8A-V3.4 and V4.10/V4.11; not reopened here)

If a slice during execution begins touching any of the above, it must stop
and reopen the slice plan rather than widen mid-flight.

## 3. Baseline Evidence

Captured 2026-05-13 via `tests/visual/capture-m8a-v3-d03-baseline.mjs` at
desktop-1440x900, deterministic clock = `2026-05-13T12:00:10.250Z`:

| Route | Output | Observed gap |
|---|---|---|
| `/?scenePreset=global` | `output/m8a-v3-d03/baseline/operator-hud-global-1440x900.png` | Status panel container occupies the lower ~50% of the viewport; six telemetry slots wrap into two rows; F-11 rule editor is open by default and dominates the Handover Decision column. |
| `/?scenePreset=regional` | `output/m8a-v3-d03/baseline/operator-hud-regional-1440x900.png` | Same panel sprawl as global; regional terrain becomes hidden beneath the lower half of the panel. |
| `/?firstIntakeRuntimeAddress=app-oneweb-intelsat-geo-aviation&firstIntakeAutoplay=1&scenePreset=global` | `output/m8a-v3-d03/baseline/first-intake-addressed-global-1440x900.png` | Addressed first-intake path; preserved here as a regression baseline for the M8A-V3.1 path that the R1V cleanup already hides the operator status panel from. |

Each slice in this plan must re-run the capture script before and after
implementation and store the after-image under
`output/m8a-v3-d03/<slice-id>/`.

### After-image evidence

Slice 1 (D-03.S1) after-images, captured 2026-05-13 at the same viewport and
deterministic clock:

| Route | Output |
|---|---|
| `/?scenePreset=global` | `output/m8a-v3-d03/d03-s1/operator-hud-global-d03-s1-1440x900.png` |
| `/?scenePreset=regional` | `output/m8a-v3-d03/d03-s1/operator-hud-regional-d03-s1-1440x900.png` |
| `/?firstIntakeRuntimeAddress=app-oneweb-intelsat-geo-aviation&firstIntakeAutoplay=1&scenePreset=global` | `output/m8a-v3-d03/d03-s1/first-intake-addressed-global-d03-s1-1440x900.png` |
| Smoke collapsed view | `output/m8a-v3-d03/d03-s1/d03-s1-default-collapsed-1440x900.png` |
| Smoke expanded view | `output/m8a-v3-d03/d03-s1/d03-s1-expanded-1440x900.png` |
| Runtime state | `output/m8a-v3-d03/d03-s1/d03-s1-runtime-state.json` |

Observed slice-1 panel height: **352 px** collapsed (≤ 360 px ceiling) and
**352 px** when the secondary disclosure is closed, growing to the
secondary-expanded ceiling only when the user opts in.

## 4. Identified Presentation Gaps

Five gaps were identified against the M8A-V3 umbrella Hard Gates. Each gap is
scoped narrowly so it can be a separate slice without cross-coupling.

### Gap G1 — Status panel vertical sprawl

- Symptom: `hud-panel--status` has `min-height: 10rem` + an unbounded
  auto-fit telemetry grid (`grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr))`).
  With six telemetry slots wrapping at 1440px, plus the F-11 rule editor
  expanded by default, the panel grows to roughly 30–40rem tall and covers
  the lower half of the globe.
- Hard Gate failure: HG1 (Earth not primary subject), HG2 (panel-led
  default), HG3 (no single primary information surface).
- Evidence: baseline `operator-hud-global-1440x900.png`,
  `operator-hud-regional-1440x900.png`.

### Gap G2 — Equal-weight telemetry slots with no primary surface

- Symptom: the six telemetry slots (Time, Communication Time + F-09,
  Physical Inputs, Handover Decision + F-11, Scene Starter, Validation
  State) all sit at equal grid weight. No visual rank distinguishes the
  primary cross-orbit handover read-out from supporting boundary state.
- Hard Gate failure: HG3 (one compact primary information surface).
- Evidence: same baselines as G1.

### Gap G3 — F-11 Rule Config editor opens by default

- Symptom: `bootstrap-handover-decision-panel.ts` ships the rule editor as
  `<details ... open>`. The editor adds ~16–22rem of vertical content to
  the Handover Decision column on first paint, in addition to the
  decision read-out itself. F-16 already starts hidden behind a disclosure
  toggle; F-11 does not.
- Hard Gate failure: HG2 (panel-led default).
- Evidence: source file line 202–207; visible in baseline images as the
  weight/tie-break form rendered before user interaction.

### Gap G4 — Operator control row lacks grouping

- Symptom: top control row uses a 5-column CSS grid
  (`minmax(10rem, 1.1fr) minmax(11rem, 1fr) minmax(12rem, 1fr) minmax(12rem, 1.1fr) minmax(12rem, 1fr)`)
  with no grouping cue between Scenario controls (Scenario heading + select),
  Replay controls (Mode + Speed), and Policy controls (Handover Policy
  selector + live region). At narrower widths the chipsets wrap awkwardly
  into the policy cell.
- Hard Gate adjacency: HG2 (panel-led default) and umbrella §7
  (scene-led reading rule).
- Evidence: source file
  `src/features/operator/bootstrap-operator-hud.ts` lines 122–186 +
  `src/styles.css` lines 195–207.

### Gap G5 — Truth-boundary copy duplicated across panels

- Symptom: each panel reasserts its own "Modeled, not measured" /
  "bounded proxy" footnote independently
  (Communication Rate, Physical Inputs, Validation State, Report Export).
  The repeated copy is correct in isolation but produces visual noise and
  obscures the umbrella truth contract. The umbrella permits one compact
  primary information surface to host the cross-panel truth chip
  (see umbrella §"Recovery Principle"). No such chip exists today.
- Hard Gate adjacency: M8A-V3 acceptance criterion #15 ("satcom information
  is compact, useful, and non-blocking") and #16 ("visible or inspectable
  non-claims remain intact"). Removing duplication is allowed; weakening
  the claim is not.
- Evidence: panel source files under
  `src/features/communication-rate/`, `src/features/physical-input/`,
  `src/features/validation-state/`, `src/features/report-export/`.

## 5. Slice Inventory

| Slice ID | Title | Primary gap | Scope size | Risk | Status |
|---|---|---|---|---|---|
| D-03.S1 | Status panel containment + secondary telemetry collapse | G1 (+ partial G2) | 1 CSS file + 1 panel-orchestrator file + 1 new smoke + 1 new capture script | low | landed 2026-05-13 in commit `b4ae72a` (see §13) |
| D-03.S2 | F-11 Rule Config default-closed disclosure | G3 | 1 panel file + 1 smoke amendment + 1 new smoke + capture-script profile | low | landed 2026-05-13 in commit `6f6770b` (see §14.7) |
| D-03.S3 | Operator control row grouping | G4 | 1 HUD file + 1 CSS update + 1 new smoke + 1 package.json delta | low | landed 2026-05-13 in commit `a51a840` (see §15.7) |
| D-03.S4 | Primary surface rank + cross-panel truth chip | G2 (full) + G5 | 1 HUD file + 1 new compact-chip component + 1 CSS update + 1 new smoke + 1 capture-script delta + 1 package.json delta | medium | landed 2026-05-13 in commit `b02be72` (see §16.7) |
| D-03.S5 | Acceptance-route final acceptance + D-03 row update | umbrella Hard Gates | docs + close-out | low | landed 2026-05-13 as docs-only acceptance-route close-out (see §17) |

Slices must be executed in **separate conversations**. Each slice ends with a
quality gate run and commit. S5 was the only slice allowed to update the D-03
acceptance row and the D-03 closure-adjacent status pointers named in §10.

Slice ordering rationale:

- S1 first because it addresses HG1 + HG2 simultaneously and unblocks
  visual evaluation of subsequent slices. It is the lowest-risk biggest-win
  step.
- S2 second because the F-11 rule editor is currently the largest single
  vertical contributor inside an individual telemetry slot, and shrinking it
  amplifies the impact of S1's containment ceiling.
- S3 third because operator control row reorganization is essentially
  cosmetic but easier to evaluate once the status panel itself is
  contained.
- S4 fourth because cross-panel truth chip + primary-surface ranking is the
  highest-risk change (it touches data-attribute boundaries on multiple
  panels), and benefits from the panel having stable height after S1–S3.
- S5 last and is the only slice allowed to update the D-03 acceptance row.

## 6. Slice 1 (D-03.S1) — Status Panel Containment + Secondary Collapse

### 6.1 Acceptance criteria

1. `hud-panel--status` total rendered height at desktop-1440x900 default
   route is ≤ 40% of viewport height (≤ 360 px) on both `scenePreset=global`
   and `scenePreset=regional` when the secondary disclosure is closed. When
   the user opens the secondary disclosure the host panel may grow to a
   ≤ 60vh / ≤ 32 rem ceiling to fit the additional content.
2. The default Operator HUD designates Communication Time (with its embedded
   F-09 Communication Rate section) and Handover Decision (with its embedded
   F-11 Rule Config editor) as the two **primary** telemetry slots, places
   them ahead of the Report Export action in the panel reading order, and
   keeps them mounted without user action. Full uninterrupted visibility of
   the entire primary lane in a single viewport requires the secondary
   disclosure to remain closed AND slice 2 (G3 — F-11 Rule Config
   default-closed) to land. Slice 1 must not modify the F-11 editor's
   default state.
3. Physical Inputs, Scene Starter, and Validation State telemetry slots are
   demoted to a **secondary** group that is collapsed behind a single
   disclosure control in the default state. The disclosure control is
   keyboard-reachable, has `aria-expanded`, and reveals all three secondary
   slots simultaneously when opened.
4. All V4.12 acceptance smokes still pass against the new layout
   (selectors are preserved; collapsed slots remain in the DOM and read
   `aria-hidden="true"` when collapsed but are reachable for assertion).
5. V4.13 multi-orbit Phase 7.1 harness still passes (slice 1 does not
   touch overlay or runtime code).
6. New slice-1 smoke `verify-m8a-v3-d03-s1-status-panel-containment-runtime.mjs`
   asserts:
   - status panel root has a `data-status-panel-containment="v3-d03-s1"`
     attribute (lets future slices key off the active version)
   - bounding-rect height ≤ 40% of viewport (assertion runs at 1440x900)
   - primary slots root element has `data-status-panel-rank="primary"` and
     contains both Communication Time and Handover Decision panels
   - secondary slots root element has `data-status-panel-rank="secondary"`,
     starts with `aria-hidden="true"`, contains Physical Inputs, Scene
     Starter, and Validation State panels
   - disclosure toggle has `aria-expanded="false"` by default and flips to
     `true` after a click, with the secondary group becoming visible
7. Forbidden-claim scan green (see §8).
8. Before / after screenshots captured for both global and regional presets
   and stored under `output/m8a-v3-d03/d03-s1/`.

### 6.2 Implementation outline

Files expected to change (slice-1 ceiling: 3 source files + 1 CSS file +
1 capture-script delta + 1 new smoke):

1. `src/features/operator/bootstrap-operator-hud.ts`
   - Split `__telemetry` grid into two named child containers:
     - `__telemetry-primary` (Communication Time, Handover Decision)
     - `__telemetry-secondary` (Physical Inputs, Scene Starter,
       Validation State)
   - Add disclosure button between the two containers with
     `data-status-panel-secondary-toggle="true"` and
     `aria-controls` pointing at the secondary container id.
   - Add `data-status-panel-containment="v3-d03-s1"` on the operator HUD
     root.
   - Add `data-status-panel-rank="primary"` and `data-status-panel-rank="secondary"`
     on the two child containers.
   - Preserve every existing telemetry slot data-attribute (the smokes
     query by `[data-operator-time-slot='true']` etc., not by container).
2. `src/styles.css`
   - Set `hud-panel--status` `max-height: min(40vh, 22rem)`.
   - Add `overflow-y: auto` to the operator HUD root when the secondary
     group is expanded; default state stays without scroll.
   - Style the two new containers as horizontal flex rows (primary first).
   - Style the disclosure toggle as a compact chip matching the existing
     `.operator-control-chip` token family.
3. `tests/smoke/verify-m8a-v3-d03-s1-status-panel-containment-runtime.mjs`
   - New smoke (modelled after `verify-m8a-v4.12-f16-statistics-report-export-runtime.mjs`).
4. `tests/visual/capture-m8a-v3-d03-baseline.mjs`
   - Extend to also write `output/m8a-v3-d03/d03-s1/` after-images for the
     two default routes when invoked with `--profile d03-s1`.
5. `package.json` — add `test:m8a-v3-d03:s1` script.

### 6.3 Forbidden during slice 1

Slice 1 must not:

- modify any panel internal markup (Communication Time, Handover Decision,
  Physical Inputs, Scene Starter, Validation State, Report Export, F-09
  Communication Rate section, F-11 Rule Config editor)
- modify any data attribute that the V4.12 smokes query
- modify the F-10 handover policy selector or live region
- modify camera, overlay, scene preset, or replay-clock logic
- touch first-intake addressed-route surfaces or the R1V cleanup path
- modify the V4.13 multi-orbit overlay path
- modify any forbidden-claim copy or footnote text
- introduce a second timer, second autoplay track, or new replay control
- introduce any measured-truth language or active-path language

### 6.4 Quality gates for slice 1 commit

Before committing slice 1, run in order:

1. `npm run build` — green
2. `npm run test:m8a-v4.12:f09` — green
3. `node tests/smoke/verify-m8a-v4.12-f10-handover-policy-selector-runtime.mjs` — green
4. `node tests/smoke/verify-m8a-v4.12-f11-handover-rule-config-runtime.mjs` — green
5. `node tests/smoke/verify-m8a-v4.12-f16-statistics-report-export-runtime.mjs` — green
6. `node tests/validation/run-phase7.1-viewer-scope-validation.mjs --validation-profile-id multi-orbit-scale-1000 --target-leo-count 500 --requested-overlay-mode multi-orbit-scale-points --enforce-pass` — green
7. `node tests/smoke/verify-m8a-v3-d03-s1-status-panel-containment-runtime.mjs` — green
8. Forbidden-claim scan (see §8)
9. `node tests/visual/capture-m8a-v3-d03-baseline.mjs --profile d03-s1` — produces after-images

Commit message prefix: `feat(presentation): D-03.S1 status panel containment under M8A-V3 umbrella`.
Commit body must include the V3 umbrella reference and Co-Authored-By
trailer.

## 7. V4.12 + V4.13 Preservation Rules

D-03 polish must preserve the following surfaces verbatim. The list is
deliberately concrete so any slice can be audited against it.

### 7.1 V4.12 acceptance surfaces preserved

| Surface | Selector or attribute | Owning F-ID |
|---|---|---|
| Communication Rate chart | `[data-communication-rate-section='bootstrap']` + `[data-communication-rate-chart='class-trend']` | F-09 |
| Communication Rate table toggle | `[data-communication-rate-table-toggle='true']` | F-09 |
| Communication Rate dataset values | `dataset.communicationRatePointCount`, `dataset.communicationRateCurrentClass`, `dataset.communicationRateSource` | F-09 |
| Handover Policy selector | `[data-operator-control='handover-policy']` | F-10 |
| Handover Policy live region | `[data-operator-policy-status='true']` | F-10 |
| Operator HUD root dataset (policy id/label/summary) | `[data-operator-hud='bootstrap']` dataset | F-10 |
| Handover Decision panel root | `[data-handover-decision-panel='bootstrap']` | F-10 / F-11 |
| Handover Rule Config editor | `[data-handover-rule-config-editor='true']` (the `<details>` element) | F-11 |
| Rule form + status + actions | `[data-handover-rule-form='true']`, `[data-handover-rule-status='true']`, `[data-handover-rule-action='apply\|reset\|cancel']` | F-11 |
| Report Export root | `[data-report-export-action-group='true']` | F-16 |
| Report Export primary button | `[data-report-export-primary='true']` | F-16 |
| Report Export disclosure toggle | `[data-report-export-disclosure='true']` | F-16 |
| Report Export options panel | `[data-report-export-options-panel='true']` | F-16 |
| Report Export family/format inputs | `[data-report-export-family]`, `[data-report-export-format]` | F-16 |
| Report Export live regions | `[data-report-export-success-live='true']`, `[data-report-export-failure-live='true']` | F-16 |

### 7.2 V4.13 multi-orbit substrate preserved

| Surface | Path |
|---|---|
| Bulk-TLE adapter | `src/features/satellites/bulk-tle-adapter.ts` |
| Point-primitive overlay adapter | `src/runtime/leo-scale-point-primitive-overlay-adapter.ts` |
| Multi-orbit overlay controller mode | `src/runtime/satellite-overlay-controller.ts` reports `overlayRenderMode = "multi-orbit-scale-points"` |
| Public TLE fixtures + provenance | `public/fixtures/satellites/leo-scale/`, `public/fixtures/satellites/multi-orbit/meo/`, `public/fixtures/satellites/multi-orbit/geo/` |
| Retained Phase 7.1 evidence | `output/validation/phase7.1/2026-05-13T01-38-25.092Z-multi-orbit-scale-1000/` |

D-03 slices are not allowed to touch these paths.

### 7.3 Truth-boundary copy preserved

The following phrases must continue to render exactly somewhere within the
default Operator HUD reachable state (visible or inspectable) on the default
route:

- "Modeled, not measured." (Communication Rate footnote)
- "bounded proxy" / "bounded-proxy" (Communication Rate source label,
  Handover Decision provenance, Report Export family description)
- "Repo-owned" or "repo-owned" (multiple panels)
- "Modeled rain attenuation" or equivalent rain-attenuation framing
  (Physical Inputs footnote)
- "Validation Boundary" heading on the Validation State panel

A slice may consolidate the copy into a single primary-surface chip
(planned in slice 4), but cannot remove the underlying assertion strings
that any consuming smoke or acceptance reviewer can read.

## 8. Forbidden Claims

D-03 polish must not introduce any of the following copy or runtime
assertion strings. Forbidden-claim scan must grep every new file in each
slice:

- `measured throughput`, `measured latency`, `measured jitter`,
  `measured truth`
- `live iperf`, `live ping`, `iperf result`, `ping-verified`,
  `iperf-backed`, `ping-backed`
- `active satellite`, `active gateway`, `active path`,
  `pair-specific path`, `pair-specific GEO teleport`
- `radio-layer handover`, `native RF handover`
- `ESTNeT throughput`, `INET speed`, `NAT validated`,
  `tunnel verified end-to-end`, `DUT closed`
- `>=500 LEO closure`, `multi-orbit closure complete`,
  `multi-orbit radio-layer handover`
- `complete customer acceptance`, `Phase 8 unlocked`,
  `M8A-V4 endpoint-pair gate resolved`
- `customer orbit model is integrated`
- `D-03 closed`, `D-03 已完成`, `richer composition closed`,
  `presentation convergence closed`
- `V-02 closed`, `V-03 closed`, `V-04 closed`, `V-05 closed`,
  `V-06 closed`
- `iperf throughput`, `ping latency`

Forbidden-claim scan command (run from repo root before each slice
commit):

```bash
git diff --staged --name-only -z | xargs -0 grep -EHIin \
  'measured throughput|measured latency|measured jitter|measured truth|live iperf|live ping|iperf result|ping-verified|iperf-backed|ping-backed|active satellite|active gateway|active path|pair-specific path|pair-specific GEO teleport|radio-layer handover|native RF handover|ESTNeT throughput|INET speed|NAT validated|tunnel verified end-to-end|DUT closed|>=500 LEO closure|multi-orbit closure complete|multi-orbit radio-layer handover|complete customer acceptance|Phase 8 unlocked|M8A-V4 endpoint-pair gate resolved|customer orbit model is integrated|D-03 closed|richer composition closed|presentation convergence closed|V-0[2-6] closed|iperf throughput|ping latency' || true
```

Scan must return empty for each commit. The script above is a probe, not
a CI gate — the slice author runs it manually before commit.

### 8.1 Scan Scoping

The §8 forbidden-claim list is a substring-grep target. It is the right
tool for catching **new** forbidden copy authored into a slice's diff,
but it is the wrong tool for blanket DOM scans because the codebase
already ships many pre-existing truth-boundary **disclaimers** that
contain these substrings inside **negations**. Examples present in
`main` as of 2026-05-13:

- `src/features/handover-decision/handover-decision.ts:8-9` ships
  `"Deterministic bootstrap candidate metrics used for repo-owned
  handover evaluation; not measured latency, jitter, or throughput
  truth."` — a negation that disclaims measured latency.
- `src/features/report-export/report-export.ts:167` ships
  `"Bounded-proxy decision over deterministic candidate metrics; not
  measured latency, jitter, or throughput truth."`.
- `src/runtime/m8a-v4-itri-demo-renderers.ts:165` ships a
  V4.11/V4.6D disclaimer ending in `"not an active satellite/gateway/
  path claim, and not measured network truth."`.
- `src/runtime/first-intake-operator-explainer-controller.ts:206` ships
  `"This active first-intake case stays on …, is not native RF
  handover, and remains bounded-proxy, not measurement truth."`.
- `src/runtime/m8a-v411-inspector-concurrency.ts:31` ships
  `"No measured latency, jitter, throughput, or continuity values are
  shown."`.
- `src/runtime/m8a-v4-ground-station-projection.ts:558, 1149-1152,
  1257-1259, 1313-1316, 1423-1425, 1454` ships several
  `"not active satellite"`, `"not native RF handover"`, and
  `"measured latency/jitter/throughput truth"` disclaimers inside the
  V4.6B / V4.11 projection envelope strings.

These pre-existing disclaimers are **correct** truth-boundary copy.
They negate the forbidden claim rather than make it. They are out of
scope for D-03 polish.

The two scan modes used by D-03 slices are therefore disambiguated:

1. **Staged-files probe** (the §8 shell command above) — run from the
   repo root before commit. Scans only files in
   `git diff --staged --name-only`. Pre-existing disclaimers are not
   staged so they are not scanned; only new copy authored into the
   slice's diff is checked. This is the authoritative pre-commit gate.
2. **In-smoke DOM scan** — runs inside a slice's runtime smoke against
   live DOM after the slice's change has been applied. Because the
   live DOM contains every pre-existing disclaimer rendered by the
   panel / HUD / globe-viewer root, this scan **must be scoped to the
   subtree the slice introduces or modifies**, not to a panel root or
   HUD root or globe root. If the slice's smoke scopes too broadly, it
   will incorrectly flag pre-existing negations.

Per-slice DOM scan scope is fixed as follows:

| Slice | DOM scan target |
|---|---|
| D-03.S2 | `<details data-handover-rule-config-editor='true'>` element's outerHTML (the only element the slice modifies — the slice removes the `open` attribute and S2 adds nothing else to the rendered DOM). |
| D-03.S3 | Union of the three new `data-operator-control-group='{scenario|replay|policy}'` container outerHTML strings plus the three new `[data-operator-control-group-heading='true']` element outerHTML strings. |
| D-03.S4 | The new `[data-cross-panel-truth-chip='true']` element's outerHTML. |
| Future slices | The element(s) introduced or modified by the slice; pre-existing V4.12 / V4.11 / V3 / V2 elements remain out of scope for slice DOM scans. |

The staged-files probe still runs over every staged file as the
authoritative pre-commit check.

## 9. Slice-1 Out-Of-Scope Pointers

These remain unaddressed by slice 1 and are deferred to slices 2–5:

- F-11 rule editor opens by default (G3) — slice 2
- operator control row grouping (G4) — slice 3
- cross-panel truth chip + primary-surface rank designation (G2 + G5) —
  slice 4
- D-03 acceptance-row update — slice 5

Slice 1 must not preempt any of the above by adding a placeholder
ranking attribute that later slices would have to reshape.

## 10. Acceptance Update Procedure (Reserved For Slice 5)

After slice 1, the D-03 row in
`/home/u24/papers/itri/itri-acceptance-report-2026-04-20/01-itri-requirement-inventory-and-status.md`
**must not** change. Slice 1 is composition polish only and does not by
itself close D-03.

When slice 5 runs and all umbrella Hard Gates are satisfied, the D-03 row
narrative will move from `部分完成` to a bounded close-out wording that
explicitly preserves:

- the M8A-V2/V3 truth boundary
- the V4.12 + V4.13 bounded surfaces
- the umbrella authority that presentation convergence is a recovery line
  on top of completed engineering, not a substitute for external truth

Slice 5 will also update `m8a-v3-presentation-convergence-umbrella-plan.md`
status note and `m8a-v4.12-followup-index.md` §7 D-03 pointer.

## 11. Skill Use Plan (Slice 1)

Required during slice-1 implementation:

- Read the existing `verify-m8a-v4.12-f16-statistics-report-export-runtime.mjs`
  before writing the new D-03.S1 smoke, since F-16 already exercises a
  hidden-by-default disclosure pattern that the new secondary-group toggle
  should mirror.
- Read `src/styles.css` lines 176–472 to understand the existing
  `hud-panel--status` and `.operator-status-hud` token system before
  proposing height containment.
- Read the M8A-V3.5 acceptance smoke
  `verify-m8a-v3.5-source-lineaged-orbit-context-actors-runtime.mjs` if
  ambiguity arises about which V3 acceptance smokes still gate the
  default route (default route is the operator HUD, not the addressed
  M8A-V3.1 path).

## 12. Slice-Level Quality Gates (Apply To Every Slice)

Every slice in the D-03 chain must run all of:

1. `npm run build` — green
2. All V4.12 acceptance smokes — green
3. V4.13 multi-orbit Phase 7.1 harness — green
4. Slice-specific smoke — green
5. Forbidden-claim scan — empty
6. Before / after capture under `output/m8a-v3-d03/<slice-id>/`

No slice is allowed to skip any of the six gates. If a slice cannot pass
all six, the slice author opens a follow-on plan rather than weakening the
gate.

## 13. Slice-1 Execution Authorization And Close-Out

This conversation is authorized to land **slice 1 only**. After slice 1's
commit:

- update the D-03 plan §5 slice table with the slice-1 close-out commit
  SHA (the commit SHA will be filled in by the executing conversation
  after `git log -1 --format=%H` confirms the new HEAD)
- record the slice-1 after-image evidence path under §3 baseline evidence
- stop. Slice 2 onward must be opened in fresh conversations with their
  own plan-level pre-flight.

### Slice 1 Close-Out Record

Landed implementation:

- HUD orchestrator: `src/features/operator/bootstrap-operator-hud.ts` splits
  the telemetry grid into primary (Time, Communication Time + F-09,
  Handover Decision + F-11) and secondary (Physical Inputs, Scene Starter,
  Validation State) containers, places the primary lane ahead of Report
  Export in reading order, mounts the secondary disclosure toggle with
  `aria-expanded`, `aria-controls`, default-collapsed state, and
  primary-rank propagation through `data-status-panel-rank` attributes.
- CSS: `src/styles.css` caps `.hud-panel--status` at `min(40vh, 22rem)`
  collapsed and `min(60vh, 32rem)` when
  `data-status-panel-secondary-expanded="true"` is propagated to the host
  panel by the orchestrator, and grants the operator HUD root the same
  ceiling pair via attribute selectors so internal overflow scrolls
  naturally without needing a `:has()` style hook.
- Smoke: `tests/smoke/verify-m8a-v3-d03-s1-status-panel-containment-runtime.mjs`
  asserts containment, slot ranks, default-collapsed disclosure,
  expand/collapse round-trip, and preservation of every F-09 / F-10 / F-11
  / F-16 selector inside the V4.12 preservation table.
- Capture: `tests/visual/capture-m8a-v3-d03-baseline.mjs` accepts
  `--profile=<label>` to write before/after evidence under
  `output/m8a-v3-d03/<label>/`.
- npm script: `test:m8a-v3-d03:s1` calls the new smoke after a build.

Quality gates run pre-commit:

- `npm run build` — green
- `node tests/smoke/verify-m8a-v4.12-f09-communication-rate-runtime.mjs` — green
- `node tests/smoke/verify-m8a-v4.12-f10-handover-policy-selector-runtime.mjs` — green
- `node tests/smoke/verify-m8a-v4.12-f11-handover-rule-config-runtime.mjs` — green
- `node tests/smoke/verify-m8a-v4.12-f16-statistics-report-export-runtime.mjs` — green
- `node tests/validation/run-phase7.1-viewer-scope-validation.mjs --validation-profile-id multi-orbit-scale-1000 --target-leo-count 500 --requested-overlay-mode multi-orbit-scale-points --enforce-pass` — green
- `node tests/smoke/verify-m8a-v3-d03-s1-status-panel-containment-runtime.mjs` — green
- Forbidden-claim scan over `src/features/operator/bootstrap-operator-hud.ts`,
  `src/styles.css`, `tests/visual/capture-m8a-v3-d03-baseline.mjs`, and
  the runtime-state JSON — empty
- `node tests/visual/capture-m8a-v3-d03-baseline.mjs --profile=d03-s1` —
  after-images written under `output/m8a-v3-d03/d03-s1/`

What did **not** change:

- F-09 Communication Rate section, F-10 Handover Policy selector + live
  region, F-11 Handover Rule Config editor + form + status + actions,
  F-16 Report Export internals, V4.13 multi-orbit overlay path,
  first-intake addressed-route surfaces, R1V cleanup path,
  scene-preset / replay-clock logic, camera, or measurement-truth copy.

D-03 acceptance row remains `部分完成`. Slice 1 does not close D-03.

## 14. Slice 2 (D-03.S2) — F-11 Rule Config Default-Closed Disclosure

Slice 2 targets gap G3 (`Identified Presentation Gaps` §4): the F-11 rule
editor currently ships `<details ... open>`, adding ~16–22 rem of vertical
content to the Handover Decision column on first paint. Slice 1 capped the
status panel envelope; slice 2 collapses the largest single intra-slot
contributor inside that envelope.

This subsection is the **scope lock** for slice 2. It mirrors §6 (slice 1
scope lock) and exists so a fresh child conversation can execute slice 2
without re-deriving acceptance criteria.

### 14.1 Acceptance criteria

1. The F-11 rule editor `<details>` element at
   `src/features/handover-decision/bootstrap-handover-decision-panel.ts` no
   longer carries the `open` attribute on initial mount. Every other
   attribute (`class`, `data-handover-rule-config-editor="true"`) and every
   child node of the `<details>` (summary, form, status, action buttons) is
   preserved verbatim.
2. The Handover Decision panel still mounts the full F-11 form, status
   surface, and apply / reset / cancel actions on every supported scene
   preset. Collapsing only removes the editor's expanded surface from the
   initial paint, not its presence in the DOM.
3. Disclosure round-trip works: clicking or keyboard-activating the
   `<summary>` opens the editor (`details.open === true`); activating it
   again closes it (`details.open === false`). Round-trip preserves the
   applied rule-config state (no re-render flush; the `bootstrap-balanced-v1`
   default applied config still threads through panel, telemetry, and report
   fields).
4. The existing F-11 acceptance smoke
   `tests/smoke/verify-m8a-v4.12-f11-handover-rule-config-runtime.mjs` is
   amended to match the new default:
   - Flip the initial-state assertion at line 317 from
     `state.editor.open === true` to `state.editor.open === false`.
   - Rename the initial screenshot path at line 357 (`...-initial-open.png`)
     to `...-initial-closed.png` so the captured evidence semantically
     matches the new default. Grep the smoke for any other `initial-open`
     literal before commit; rename consistently.
   - Insert an explicit summary-activation step before the existing
     form-interaction flow so the editor is opened in-script before the
     existing apply / reset / cancel assertions run. After the existing flow
     completes, click the summary again and re-assert `editor.open === false`
     so the round-trip is observable inside the F-11 evidence chain.
   - Preserve every other selector, every other assertion, and every other
     screenshot in the smoke verbatim. No assertion may be removed; only the
     initial-open assertion is allowed to flip.
5. A new slice-2 smoke
   `tests/smoke/verify-m8a-v3-d03-s2-handover-rule-config-default-closed-runtime.mjs`
   asserts:
   - On the default route (`/?scenePreset=global`) the F-11 rule editor is
     present in the DOM but `details.open === false` and renders no form
     fields visible.
   - The summary text "Handover Rule Config" remains visible and
     keyboard-focusable.
   - Activating the summary opens the editor; activating it again closes it.
   - When opened, every V4.12 F-11 selector still resolves:
     `[data-handover-rule-form='true']`, `[data-handover-rule-status='true']`,
     `[data-handover-rule-action='apply']`,
     `[data-handover-rule-action='reset']`,
     `[data-handover-rule-action='cancel']`.
   - D-03.S1 status-panel containment attributes still resolve:
     `data-status-panel-containment="v3-d03-s1"`,
     `data-status-panel-rank="primary"` covering Communication Time and
     Handover Decision, `data-status-panel-rank="secondary"` covering
     Physical Inputs / Scene Starter / Validation State.
   - Forbidden-claim scan scoped per §8.1 Scan Scoping to the
     `<details data-handover-rule-config-editor='true'>` element's
     outerHTML (the only element the slice modifies). The scan must
     NOT cover the surrounding panel innerHTML, because the panel root
     contains the pre-existing V4.12 truth-boundary disclaimer copy
     enumerated in §8.1 (e.g. `HANDOVER_DECISION_PROXY_PROVENANCE_DETAIL`
     at `handover-decision.ts:8-9`, rendered into
     `elements.provenance.title` at
     `bootstrap-handover-decision-panel.ts:477`). The scan must return
     no §8 hit on the editor element's outerHTML.
6. The slice-1 status-panel smoke
   `tests/smoke/verify-m8a-v3-d03-s1-status-panel-containment-runtime.mjs`
   still passes. With the F-11 editor closed by default, the Handover
   Decision slot's intrinsic height drops, but the slice-1 ceiling of
   `min(40vh, 22rem)` collapsed and `min(60vh, 32rem)` expanded must remain
   the binding bound.
7. Capture script `tests/visual/capture-m8a-v3-d03-baseline.mjs` accepts
   `--profile=d03-s2` and writes after-images under
   `output/m8a-v3-d03/d03-s2/` for the three default routes named in §3
   baseline-evidence table (global, regional, addressed first-intake).
8. Forbidden-claim scan over every file the slice touches returns empty
   (see §8 probe).

### 14.2 Implementation outline

Files allowed to change (slice-2 ceiling: 1 panel source file + 1 smoke
amendment + 1 new smoke + 1 capture-script delta + 1 package.json delta +
1 narrow CSS rule in `src/styles.css`):

1. `src/features/handover-decision/bootstrap-handover-decision-panel.ts`
   - Remove the `open` attribute on the
     `<details data-handover-rule-config-editor="true">` element. No other
     change to this file is allowed in slice 2.
2. `tests/smoke/verify-m8a-v4.12-f11-handover-rule-config-runtime.mjs`
   - Flip the initial-state assertion and add the open round-trip block as
     described in §14.1 acceptance #4.
   - Rename the initial screenshot path consistently.
   - Do not remove any other assertion, selector, or screenshot capture.
3. `tests/smoke/verify-m8a-v3-d03-s2-handover-rule-config-default-closed-runtime.mjs`
   - New smoke modelled after `verify-m8a-v3-d03-s1-status-panel-containment-runtime.mjs`
     (D-03 family) and the amended F-11 smoke (open round-trip pattern).
4. `tests/visual/capture-m8a-v3-d03-baseline.mjs`
   - Extend `--profile` to accept `d03-s2` and write after-images under
     `output/m8a-v3-d03/d03-s2/`. Do not modify routes or viewport defaults.
5. `package.json`
   - Add `test:m8a-v3-d03:s2` script that calls `npm run build` then runs
     the new slice-2 smoke. Mirror the `test:m8a-v3-d03:s1` shape.
6. `src/styles.css`
   - Append a **single additive** CSS rule adjacent to the existing
     `.handover-rule-config` block group (current location near lines
     1415–1530). The rule must be exactly:

     ```css
     .handover-rule-config:not([open]) .handover-rule-config__form {
       display: none;
     }
     ```

   - Rationale: the existing `.handover-rule-config { display: grid; }`
     declaration (line 1415) overrides the native `<details>` closed-state
     hiding mechanism for descendants, so the form remains visibly
     rendered even when `details.open === false`. The additive
     `:not([open])` rule restores closed-state hiding without touching any
     existing declaration.
   - Allowed edits in this file are restricted to **appending** the rule
     above. The executor must not modify any existing selector, property,
     or declaration in `src/styles.css`. The executor must not add any
     other new rule. If the rule cannot be added because the file shape
     conflicts (e.g. linter rejects the placement), STOP and report back.

The slice must not introduce:

- a "remember last open state" mechanism, persistent disclosure cookie, or
  any persistent-state primitive for the F-11 editor (would re-open scope)
- a different layout primitive (must remain `<details>` for accessibility
  parity with the slice-1 secondary-group disclosure pattern)
- any new attribute on the rule editor outside the existing set
- any CSS change in `src/styles.css` beyond the single additive
  `:not([open]) > .handover-rule-config__form { display: none; }` rule
  named in §14.2 item 6; no existing selector / property / declaration
  may be modified, and no other new rule may be added
- any change to the F-09 communication-rate section, the F-10 handover
  policy selector or live region, the F-16 report-export action group, or
  any other panel root

### 14.3 Forbidden during slice 2

Slice 2 must not:

- modify any other F-11 surface (form fields, weight inputs, tie-break
  order selector, dwell-tick selector, hysteresis units, apply / reset /
  cancel handlers, rule-config dataset values)
- modify the F-10 handover policy selector or its live region
- modify the F-09 Communication Rate section or its chart / table toggle
- modify the F-16 Report Export action group, options panel, or live
  regions
- modify the D-03.S1 primary / secondary container split, the disclosure
  toggle, or the `data-status-panel-containment` attribute
- modify camera, overlay, scene preset, replay-clock, first-intake
  addressed-route, or R1V cleanup paths
- modify the V4.13 multi-orbit overlay path or its retained evidence
- modify any forbidden-claim copy or truth-boundary footnote
  ("Modeled, not measured.", "bounded proxy", "Repo-owned", etc.)
- update the D-03 acceptance-report row (reserved for slice 5)
- update `m8a-v3-presentation-convergence-umbrella-plan.md` status note
- update `m8a-v4.12-followup-index.md` §7 D-03 pointer

### 14.4 Quality gates for slice 2 commit

Run in order before committing slice 2. All steps must be green:

1. `npm run build`
2. `node tests/smoke/verify-m8a-v4.12-f09-communication-rate-runtime.mjs`
3. `node tests/smoke/verify-m8a-v4.12-f10-handover-policy-selector-runtime.mjs`
4. `node tests/smoke/verify-m8a-v4.12-f11-handover-rule-config-runtime.mjs`
   (amended; default-closed initial state + open round-trip both observable)
5. `node tests/smoke/verify-m8a-v4.12-f16-statistics-report-export-runtime.mjs`
6. `node tests/validation/run-phase7.1-viewer-scope-validation.mjs --validation-profile-id multi-orbit-scale-1000 --target-leo-count 500 --requested-overlay-mode multi-orbit-scale-points --enforce-pass`
7. `node tests/smoke/verify-m8a-v3-d03-s1-status-panel-containment-runtime.mjs`
8. `node tests/smoke/verify-m8a-v3-d03-s2-handover-rule-config-default-closed-runtime.mjs`
9. Forbidden-claim scan (§8 probe) over every staged file — empty
10. `node tests/visual/capture-m8a-v3-d03-baseline.mjs --profile=d03-s2` —
    after-images written under `output/m8a-v3-d03/d03-s2/`

Commit message prefix:
`feat(presentation): D-03.S2 F-11 rule config default-closed disclosure under M8A-V3 umbrella`.
Commit body must reference this §14 scope lock, the M8A-V3 umbrella, and
include the `Co-Authored-By: Claude Opus 4.7 (1M context)
<noreply@anthropic.com>` trailer.

### 14.5 Slice 2 Execution Authorization

A fresh child conversation is authorized to land slice 2 strictly within
the §14.2 file ceiling. The child must:

- start by re-reading §14 in full, then §6 (slice 1) as a reference shape
- run the §14.4 quality gates in the listed order
- on green, commit a single feature commit using the prescribed prefix
- return to the total-control parent: commit SHA, retained evidence paths
  under `output/m8a-v3-d03/d03-s2/`, smoke run logs (one line each), and a
  one-paragraph regression review explicitly addressing whether the slice-1
  containment ceiling is still binding with the editor default-closed

The child must not:

- update the D-03 acceptance row in
  `/home/u24/papers/itri/itri-acceptance-report-2026-04-20/01-itri-requirement-inventory-and-status.md`
  (reserved for slice 5)
- amend already-pushed commits
- push to remote or open a PR
- begin slice 3, 4, or 5

After slice 2 close-out, the total-control parent updates this §14 with the
slice-2 close-out commit SHA (mirror §13's slice-1 close-out record), the
auto-memory `scenario-globe-viewer-d03-presentation-polish.md` slice table,
and `MEMORY.md` index line. Only then is slice 3 unblocked.

### 14.7 Slice 2 Close-Out Record

Landed implementation: commit `6f6770b feat(presentation): D-03.S2 F-11
rule config default-closed disclosure under M8A-V3 umbrella`.

Diff stat: 6 files (matches §14.2 amended ceiling exactly), 522
insertions, 6 deletions.

What landed:

- F-11 panel source:
  `src/features/handover-decision/bootstrap-handover-decision-panel.ts`
  removes the `open` attribute on the
  `<details data-handover-rule-config-editor='true'>` element.
  Single-line removal; every other attribute, every child node, every
  rendering path preserved verbatim.
- F-11 closed-state hiding CSS:
  `src/styles.css` appends the single additive rule
  `.handover-rule-config:not([open]) .handover-rule-config__form { display: none; }`
  authorised by §14.2 item 6 / §14.6 (2026-05-13 CSS amendment). No
  existing declaration modified. Rule deactivates the moment the user
  re-opens the editor via the `<summary>` so the round-trip works
  natively.
- F-11 acceptance smoke amendment:
  `tests/smoke/verify-m8a-v4.12-f11-handover-rule-config-runtime.mjs`
  flips the initial-state assertion from `editor.open === true` to
  `editor.open === false`, renames the `initial-open` screenshot to
  `initial-closed`, and inserts a `clickSummary()` activation step
  before the existing form-interaction flow plus a close-round-trip
  re-assertion. Every other selector / assertion / screenshot is
  preserved.
- New slice-2 smoke:
  `tests/smoke/verify-m8a-v3-d03-s2-handover-rule-config-default-closed-runtime.mjs`
  (462 lines) implements every §14.1 assertion: default-closed on the
  default route, summary visible + keyboard-focusable
  (`document.activeElement === summary` after `summary.focus()`),
  `clickSummary()` round-trip, V4.12 F-11 selectors resolve when
  opened, D-03.S1 containment attributes resolve, in-DOM
  forbidden-claim scan scoped to the editor element's outerHTML per
  §8.1 / §14.6 (2026-05-13 scan-scoping amendment).
- Capture-script profile:
  `tests/visual/capture-m8a-v3-d03-baseline.mjs` accepts
  `--profile=d03-s2` and writes after-images under
  `output/m8a-v3-d03/d03-s2/`.
- npm script: `test:m8a-v3-d03:s2` added to `package.json`.

Quality gates run pre-commit (all green):

- `npm run build`
- `node tests/smoke/verify-m8a-v4.12-f09-communication-rate-runtime.mjs`
- `node tests/smoke/verify-m8a-v4.12-f10-handover-policy-selector-runtime.mjs`
- `node tests/smoke/verify-m8a-v4.12-f11-handover-rule-config-runtime.mjs` (amended)
- `node tests/smoke/verify-m8a-v4.12-f16-statistics-report-export-runtime.mjs`
- `node tests/validation/run-phase7.1-viewer-scope-validation.mjs --validation-profile-id multi-orbit-scale-1000 --target-leo-count 500 --requested-overlay-mode multi-orbit-scale-points --enforce-pass`
  → retained at `output/validation/phase7.1/2026-05-13T06-39-43.592Z-multi-orbit-scale-1000`
- `node tests/smoke/verify-m8a-v3-d03-s1-status-panel-containment-runtime.mjs`
- `node tests/smoke/verify-m8a-v3-d03-s2-handover-rule-config-default-closed-runtime.mjs`
- §8 staged-files probe — empty
- `node tests/visual/capture-m8a-v3-d03-baseline.mjs --profile=d03-s2` —
  three after-images written

Evidence under `output/m8a-v3-d03/d03-s2/`:

- `d03-s2-f11-default-closed-1440x900.png`
- `d03-s2-f11-opened-1440x900.png`
- `d03-s2-runtime-state.json`
- `operator-hud-global-d03-s2-1440x900.png`
- `operator-hud-regional-d03-s2-1440x900.png`
- `first-intake-addressed-global-d03-s2-1440x900.png`

Regression review (per §14.5 return contract): the D-03.S1 status-panel
containment marker, primary / secondary ranks, and ≤ 360 px collapsed
height envelope all still hold after the F-11 editor goes
default-closed; the intrinsic Handover Decision slot height drops as
expected, which gives slack inside the S1 ceiling rather than
breaching it. All V4.12 F-11 selectors still resolve once the editor
is summary-activated. F-09 / F-10 / F-16 unchanged.

Independent diff review: `cavecrew-reviewer` audited the commit
against §14.1, §14.2, §14.3, §14.4, §14.7-implicit (close-out),
§8 + §8.1 (scan scoping), and the commit message rules; result
`✅ S2 diff matches locked §14 plan; no findings.`

What did **not** change:

- F-09 Communication Rate section, F-10 Handover Policy selector +
  live region, F-11 form / status / actions internals, F-16 Report
  Export action group / disclosure / options / live regions, V4.13
  multi-orbit overlay path, first-intake addressed-route surfaces,
  R1V cleanup path, scene-preset / replay-clock logic, camera,
  measurement-truth copy, the D-03 acceptance-report row, the
  umbrella plan status, or the v4.12-followup-index §7 D-03 pointer.

D-03 acceptance row remains `部分完成`. Slice 2 does not close D-03.

### 14.6 Amendment Trail

- 2026-05-13 initial scope lock written (commit `a35ec6c`).
- 2026-05-13 amendment: §14.2 ceiling widened to allow one additive CSS
  rule in `src/styles.css`. Trigger: first slice-2 child conversation hit
  a hard stop at gate 8 because removing only the `<details>` `open`
  attribute did not hide the rule editor's form. Root cause: existing
  `.handover-rule-config { display: grid; }` declaration (line 1415)
  overrides native `<details>` closed-state hiding for descendants. The
  child correctly refused to widen scope unilaterally and returned to the
  parent. The amendment narrowly permits a single additive
  `:not([open]) > .handover-rule-config__form { display: none; }` rule.
  No existing CSS declaration is altered. The amendment preserves the
  acceptance-criteria surface; gates 1–10 remain unchanged in §14.4.
- 2026-05-13 amendment: §14.1 #5 narrowed to scope the in-smoke DOM
  forbidden-claim scan to the
  `<details data-handover-rule-config-editor='true'>` element's
  outerHTML only, per new §8.1 Scan Scoping subsection. Trigger:
  second slice-2 child conversation passed gates 1–7 plus the
  pressSummaryEnter → clickSummary helper fix, then failed gate 8
  because the new S2 smoke's forbidden-claim scan over the panel
  innerHTML caught the substring `measured latency` inside the
  pre-existing V4.12 truth-boundary disclaimer at
  `handover-decision.ts:8-9`
  (`HANDOVER_DECISION_PROXY_PROVENANCE_DETAIL =
  "Deterministic bootstrap candidate metrics used for repo-owned
  handover evaluation; not measured latency, jitter, or throughput
  truth."`) rendered into the provenance field title at
  `bootstrap-handover-decision-panel.ts:477`. Root cause: §14.1 #5
  originally said the scan covers "the panel innerHTML", which is too
  broad — it sweeps in pre-existing truth-boundary disclaimers that
  legitimately contain forbidden substrings inside negations.
  Resolution: amend §14.1 #5 to scope the in-smoke DOM scan to the
  subtree the slice introduces or modifies. Add §8.1 Scan Scoping
  subsection that disambiguates the staged-files probe (catches new
  copy in diffs, the authoritative pre-commit gate) from the in-smoke
  DOM scan (must be scoped to slice-introduced elements). The child
  correctly refused to widen scope to modify pre-existing V4.12
  truth-boundary copy and returned to the parent. The amendment
  preserves the acceptance-criteria surface; gates 1–10 remain
  unchanged in §14.4. §15.6 and §16.6 also recorded for the same
  scoping rule.

## 15. Slice 3 (D-03.S3) — Operator Control Row Grouping

Slice 3 targets gap G4 (§4): the operator control row is a flat 5-column
grid that exposes Scenario heading, Scenario select, Replay Mode, Replay
Speed, and Handover Policy as equal-weight peers. The operator reads
five cells instead of three clusters. Slice 1 contained the panel
envelope; slice 2 collapsed the largest intra-slot contributor; slice 3
reorganises the top row so the operator can read it as three logical
groups: Scene, Replay, Policy.

This subsection is the **scope lock** for slice 3. It mirrors §14 (slice 2
scope lock) and exists so a fresh child conversation can execute slice 3
without re-deriving acceptance criteria.

### 15.1 Acceptance criteria

1. The operator control row inside `[data-operator-hud='bootstrap']`
   mounts three sibling group containers in this DOM order:
   `data-operator-control-group='scenario'`,
   `data-operator-control-group='replay'`,
   `data-operator-control-group='policy'`. The `__meta` block (eyebrow
   + `data-operator-field='scenario-label'`) and the scenario
   `<select>` belong inside the scenario group container. The Replay
   Mode chipset and Replay Speed chipset belong inside the replay
   group. The Handover Policy `<select>` and the
   `data-operator-policy-status='true'` live region belong inside the
   policy group.
2. Each group container carries a visible
   `data-operator-control-group-heading='true'` element with **exactly**
   these strings (no variations, no localisation, no abbreviation):
   - scenario group: `Scene controls`
   - replay group: `Replay controls`
   - policy group: `Policy controls`
   Each heading has a unique `id`, and the parent group container
   declares `aria-labelledby` (or equivalent `aria-label` set to the
   same string) wiring back to that heading. The headings deliberately
   end with the suffix `controls` so they cannot collide with the
   existing per-field `.operator-control-label` strings (`Scenario`,
   `Replay Mode`, `Replay Speed`, `Handover Policy`).
3. Visual grouping cue is present on each group container at desktop
   1440x900: at least one of border, background tint, divider, or
   `fieldset`-style border-plus-legend treatment such that the three
   clusters read as visually distinct from each other. The cue must
   not add more than 24 px of total combined vertical height to the
   control row above the slice-1 ceiling; the slice-1 collapsed ceiling
   of `min(40vh, 22rem)` on `hud-panel--status` must remain binding.
4. Every V4.12 selector that the F-10 smoke depends on resolves
   unchanged after grouping: `[data-operator-hud='bootstrap']`,
   `[data-operator-control='scenario']`,
   `[data-operator-control='handover-policy']`,
   `[data-operator-policy-status='true']`,
   `[data-operator-control='mode'][data-operator-mode='real-time']`,
   `[data-operator-control='mode'][data-operator-mode='prerecorded']`,
   `[data-operator-control='speed'][data-operator-speed=*]`,
   `[data-operator-field='scenario-label']`. No attribute is renamed,
   relocated, or removed. The slice introduces parent wrapper
   containers only; it does not rewrite or replace existing inner
   elements.
5. Every per-field `.operator-control-label` span (`Scenario`,
   `Replay Mode`, `Replay Speed`, `Handover Policy`) remains in the
   DOM at its current position inside its `.operator-control-group`
   wrapper. The new group-level heading (acceptance #2) is additive.
6. The operator HUD root `[data-operator-hud='bootstrap']` dataset
   continues to expose every V4.12 dataset key (`handoverPolicyId`,
   `handoverPolicyLabel`, `handoverPolicySummary`, `replayMode`,
   `replaySpeed`, `bootstrapScenarioId`, `scenePreset`,
   `operatorControlError`). No new dataset key is introduced by
   slice 3.
7. New slice-3 smoke
   `tests/smoke/verify-m8a-v3-d03-s3-operator-control-row-grouping-runtime.mjs`
   asserts:
   - All three `data-operator-control-group='{scenario|replay|policy}'`
     containers are present, visible at desktop-1440x900, and arranged
     left-to-right (each container's `getBoundingClientRect().left` is
     monotonically increasing).
   - Group membership: scenario group contains
     `[data-operator-field='scenario-label']` and
     `[data-operator-control='scenario']`; replay group contains
     `[data-operator-control='mode']` (both modes) and at least one
     `[data-operator-control='speed']`; policy group contains
     `[data-operator-control='handover-policy']` and
     `[data-operator-policy-status='true']`.
   - Group headings: each container resolves a
     `[data-operator-control-group-heading='true']` descendant whose
     trimmed `textContent` is exactly `Scene controls`,
     `Replay controls`, and `Policy controls` respectively.
   - V4.12 surface preservation: F-10's selector set (acceptance #4)
     all resolve and `policySelect.value` round-trips through a
     `change` event the same way the F-10 smoke exercises it.
   - D-03.S1 surface preservation:
     `[data-status-panel-containment='v3-d03-s1']`,
     `data-status-panel-rank='primary'`, and
     `data-status-panel-rank='secondary'` all still resolve.
   - D-03.S2 surface preservation: F-11 `<details>` resolves with
     `data-handover-rule-config-editor='true'` and
     `details.open === false` on initial mount (the slice-2 amendment
     must already be in tree before slice 3 lands).
   - Containment: `hud-panel--status`
     `getBoundingClientRect().height` remains within the slice-1
     collapsed ceiling (`<= Math.round(900 * 0.4) = 360 px`).
   - Forbidden-claim scan scoped per §8.1 Scan Scoping to the union
     of the three new `data-operator-control-group` container
     outerHTML strings plus the three new
     `[data-operator-control-group-heading='true']` element
     outerHTML strings. The scan must NOT cover the surrounding HUD
     root innerHTML, because that includes pre-existing V4.12 / V4.11
     truth-boundary disclaimer copy enumerated in §8.1. The scan must
     return no §8 hit on the scoped subtree.
8. Capture script `tests/visual/capture-m8a-v3-d03-baseline.mjs` is
   invoked with `--profile=d03-s3` and produces after-images under
   `output/m8a-v3-d03/d03-s3/` for the three default routes (global,
   regional, addressed first-intake). The existing capture-script
   fallback (`output/m8a-v3-d03/${label}` when the label is not in the
   explicit `captureProfileOutputRoots` map) already routes to this
   directory, so no edit to the capture script is required unless the
   executor also wants to add `d03-s3` to the explicit map for
   evidence symmetry with `d03-s2`.
9. Forbidden-claim scan (§8 probe) over every staged file returns
   empty.

### 15.2 Implementation outline

Files allowed to change (slice-3 ceiling: 1 HUD orchestrator + 1 narrow
CSS addition + 1 new smoke + 1 package.json delta + optional 1 narrow
capture-script registration delta).

1. `src/features/operator/bootstrap-operator-hud.ts`
   - Modify the innerHTML template inside `createElements`. The change
     is structural-only:
     - Replace the flat sequence inside
       `<div class="operator-status-hud__controls">` with three
       sibling group containers:
       `<div class="operator-status-hud__control-group" data-operator-control-group="scenario" aria-labelledby="...">`,
       likewise for `replay` and `policy`.
     - Move the existing `__meta` block, the scenario `<label>` /
       `<select>`, the two replay `.operator-control-group` blocks
       (Replay Mode + Replay Speed), the Handover Policy `<label>` /
       `<select>`, and the `data-operator-policy-status='true'` live
       region into the corresponding group container without renaming
       any inner attribute or class.
     - Add a single visible heading per group container with
       `data-operator-control-group-heading='true'` and a stable `id`
       referenced by the parent `aria-labelledby`. Heading text is
       locked in §15.1 #2.
   - Do not touch any element inside `__telemetry`,
     `__telemetry-primary`, `__telemetry-secondary`,
     `__secondary-toggle`, or `__report-export`.
   - Do not modify any `querySelector` lookup downstream of the
     template. The introduced wrappers are transparent to every
     existing lookup because all V4.12 lookups use attribute selectors
     that match inner elements regardless of parentage.
2. `src/styles.css`
   - Replace the `__controls` flat 5-column grid with a 3-column grid
     keyed off the three group containers, OR keep the 5-column grid
     and add a `.operator-status-hud__control-group` rule that paints
     the visual grouping cue (border / tint / padded box) and uses
     `display: contents` so the inner field layout is preserved.
     Either pattern is allowed; the executor must pick one and not
     interleave both.
   - Append one rule block defining
     `.operator-status-hud__control-group` and one rule block for
     `[data-operator-control-group-heading='true']` matching the
     existing `.operator-control-label` token family (font weight,
     case, letter-spacing) so the new heading reads as a sibling tier
     above the per-field labels rather than a competing label.
   - Do not modify any other selector in `src/styles.css`. Do not
     modify `.operator-control-group`, `.operator-control-label`,
     `.operator-control-select`, `.operator-control-chip`,
     `.operator-control-chipset`, or `.operator-control-live-region`.
   - Do not touch the `.hud-panel--status` height-ceiling block.
     Slice-1 binding ceilings remain.
3. `tests/smoke/verify-m8a-v3-d03-s3-operator-control-row-grouping-runtime.mjs`
   - New smoke modelled after
     `verify-m8a-v3-d03-s1-status-panel-containment-runtime.mjs` for
     the harness shape and after
     `verify-m8a-v4.12-f10-handover-policy-selector-runtime.mjs` for
     the policy-selector round-trip pattern.
4. `package.json`
   - Add `test:m8a-v3-d03:s3` script that calls `npm run build` then
     runs the new slice-3 smoke. Mirror the
     `test:m8a-v3-d03:s1` / `test:m8a-v3-d03:s2` shape.
5. `tests/visual/capture-m8a-v3-d03-baseline.mjs` (optional, no
   functional delta required)
   - The existing fallback already routes `--profile=d03-s3` to
     `output/m8a-v3-d03/d03-s3/`. Adding
     `["d03-s3", "output/m8a-v3-d03/d03-s3"]` to the explicit
     `captureProfileOutputRoots` map is permitted for evidence
     symmetry but not required. No other change to this file is
     allowed.

The slice must not introduce:

- a new dataset key on the operator HUD root or on the new group
  containers (the three `data-operator-control-group` attributes are
  the only new attributes permitted, plus the per-heading
  `data-operator-control-group-heading` and the heading `id`s used by
  `aria-labelledby`)
- any change to the F-09, F-10, F-11, F-16 panel internals
- any reorder of telemetry slots inside `__telemetry-primary` or
  `__telemetry-secondary`
- any change to the secondary-toggle button, its `aria-expanded`, its
  `aria-controls`, or the host-panel
  `data-status-panel-secondary-expanded` propagation
- any change to the `hud-panel--status` height-ceiling block
- any change to forbidden-claim copy or truth-boundary footnote text

### 15.3 Forbidden during slice 3

Slice 3 must not:

- modify the F-09 Communication Rate section, its chart, its table
  toggle, or its dataset values
- modify the F-10 Handover Policy `<select>` element itself, its
  `<option>` markup, its `aria-label`, its `data-operator-control`
  value, its live region, or any operator-HUD dataset key F-10 reads
- modify the F-11 Handover Rule Config `<details>` element, its
  summary, its form fields, its status surface, its apply / reset /
  cancel actions, its `data-handover-rule-config-editor` attribute, or
  the slice-2 default-closed behaviour (`<details>` without `open`)
  and the slice-2 additive CSS rule
- modify the F-16 Report Export action group, its disclosure toggle,
  its options panel, or its live regions
- modify D-03.S1 primary / secondary container split, the secondary
  disclosure toggle, the `data-status-panel-containment` attribute,
  the `data-status-panel-rank` attributes, or the `hud-panel--status`
  height-ceiling block
- modify camera, overlay, scene preset, replay-clock, first-intake
  addressed-route, or R1V cleanup paths
- modify the V4.13 multi-orbit overlay path or its retained Phase 7.1
  evidence
- introduce a second timer, second autoplay track, new replay control,
  or new policy control
- introduce measured-truth language, active-path language, or any
  forbidden-claim copy. The §8 forbidden-claim strings that must not
  appear are: `measured throughput`, `measured latency`,
  `measured jitter`, `measured truth`, `live iperf`, `live ping`,
  `iperf result`, `ping-verified`, `iperf-backed`, `ping-backed`,
  `active satellite`, `active gateway`, `active path`,
  `pair-specific path`, `pair-specific GEO teleport`,
  `radio-layer handover`, `native RF handover`, `ESTNeT throughput`,
  `INET speed`, `NAT validated`, `tunnel verified end-to-end`,
  `DUT closed`, `>=500 LEO closure`, `multi-orbit closure complete`,
  `multi-orbit radio-layer handover`, `complete customer acceptance`,
  `Phase 8 unlocked`, `M8A-V4 endpoint-pair gate resolved`,
  `customer orbit model is integrated`, `D-03 closed`, `D-03 已完成`,
  `richer composition closed`, `presentation convergence closed`,
  `V-02 closed`, `V-03 closed`, `V-04 closed`, `V-05 closed`,
  `V-06 closed`, `iperf throughput`, `ping latency`
- update the D-03 acceptance-report row (reserved for slice 5)
- update `m8a-v3-presentation-convergence-umbrella-plan.md` status
  note
- update `m8a-v4.12-followup-index.md` §7 D-03 pointer

### 15.4 Quality gates for slice 3 commit

Run in order before committing slice 3. All steps must be green:

1. `npm run build`
2. `node tests/smoke/verify-m8a-v4.12-f09-communication-rate-runtime.mjs`
3. `node tests/smoke/verify-m8a-v4.12-f10-handover-policy-selector-runtime.mjs`
4. `node tests/smoke/verify-m8a-v4.12-f11-handover-rule-config-runtime.mjs`
   (the slice-2 amendment must already be in tree; if slice 2 has not
   landed, slice 3 cannot land)
5. `node tests/smoke/verify-m8a-v4.12-f16-statistics-report-export-runtime.mjs`
6. `node tests/validation/run-phase7.1-viewer-scope-validation.mjs --validation-profile-id multi-orbit-scale-1000 --target-leo-count 500 --requested-overlay-mode multi-orbit-scale-points --enforce-pass`
7. `node tests/smoke/verify-m8a-v3-d03-s1-status-panel-containment-runtime.mjs`
8. `node tests/smoke/verify-m8a-v3-d03-s2-handover-rule-config-default-closed-runtime.mjs`
9. `node tests/smoke/verify-m8a-v3-d03-s3-operator-control-row-grouping-runtime.mjs`
10. Forbidden-claim scan (§8 probe) over every staged file — empty;
    then `node tests/visual/capture-m8a-v3-d03-baseline.mjs --profile=d03-s3` —
    after-images written under `output/m8a-v3-d03/d03-s3/`

Commit message prefix:
`feat(presentation): D-03.S3 operator control row grouping under M8A-V3 umbrella`.
Commit body must reference this §15 scope lock, the M8A-V3 umbrella, and
include the `Co-Authored-By: Claude Opus 4.7 (1M context)
<noreply@anthropic.com>` trailer.

### 15.5 Slice 3 Execution Authorization

A fresh child conversation is authorized to land slice 3 strictly within
the §15.2 file ceiling. The child must:

- start by re-reading §15 in full, then §14 (slice 2) and §6 (slice 1)
  as reference shapes
- confirm slice 2 has landed in `main` before starting (gate 4 and
  gate 8 both depend on the slice-2 amendment being in tree)
- run the §15.4 quality gates in the listed order
- on green, commit a single feature commit using the prescribed prefix
- return to the total-control parent: commit SHA, retained evidence
  paths under `output/m8a-v3-d03/d03-s3/`, smoke run logs (one line
  each), and a one-paragraph regression review explicitly addressing
  (a) whether the slice-1 containment ceiling is still binding with
  the new grouping cue, (b) whether the F-10 selector set still
  resolves verbatim, and (c) whether the slice-2 F-11 default-closed
  assertion still holds.

The child must not:

- update the D-03 acceptance row (reserved for slice 5)
- amend already-pushed commits
- push to remote or open a PR
- begin slice 4 or 5
- widen the §15.2 file ceiling unilaterally. If a hard stop is hit
  (e.g. a V4.12 selector breaks under grouping markup, or the slice-1
  height ceiling overruns because of the grouping cue), STOP and
  return to the parent for an amendment, following the §14.6
  precedent.

After slice 3 close-out, the total-control parent updates this §15
with the slice-3 close-out commit SHA, the auto-memory
`scenario-globe-viewer-d03-presentation-polish.md` slice table, and
`MEMORY.md` index line. Only then is slice 4 unblocked.

### 15.6 Amendment Trail

- 2026-05-13 initial scope lock written.
- 2026-05-13 amendment: §15.1 #7 last bullet narrowed to scope the
  in-smoke DOM forbidden-claim scan to the union of the three new
  `data-operator-control-group` container outerHTML strings plus the
  three new `[data-operator-control-group-heading='true']` element
  outerHTML strings, per new §8.1 Scan Scoping subsection. This
  amendment is pre-emptive: it inherits the same scoping fix
  authorised against §14 (slice 2) after the slice-2 second child
  conversation hit a hard stop on a panel-wide DOM forbidden-claim
  scan that swept pre-existing V4.12 truth-boundary disclaimers
  (substring `measured latency` inside a negation in
  `handover-decision.ts:8-9`). The slice-3 smoke must not scan the
  HUD root innerHTML because that includes the same kind of
  pre-existing negations enumerated in §8.1.

### 15.7 Slice 3 Close-Out Record

Landed implementation: commit `a51a840 feat(presentation): D-03.S3
operator control row grouping under M8A-V3 umbrella`.

Diff stat: 4 files, 774 insertions, 61 deletions. This matches the
§15.2 file ceiling: one HUD orchestrator update, one CSS update, one
new slice-3 smoke, and one `package.json` script delta. The optional
capture-script registration delta was not needed because the existing
`--profile` fallback already routes `d03-s3` output correctly.

What landed:

- Operator HUD control row:
  `src/features/operator/bootstrap-operator-hud.ts` wraps the existing
  scenario, replay, and policy controls in three sibling containers
  carrying `data-operator-control-group='scenario'`,
  `data-operator-control-group='replay'`, and
  `data-operator-control-group='policy'` in that DOM order. The
  existing inner controls, labels, selectors, buttons, and live region
  keep their V4.12 attributes.
- Group headings: each group has a visible
  `[data-operator-control-group-heading='true']` heading with the
  exact locked text `Scene controls`, `Replay controls`, and
  `Policy controls`; each parent group is wired by `aria-labelledby`
  to its heading id.
- CSS grouping cue: `src/styles.css` replaces the flat five-column
  `.operator-status-hud__controls` grid with a three-column grouping
  grid and adds the narrow `.operator-status-hud__control-group` and
  `[data-operator-control-group-heading='true']` rule blocks. The
  slice-1 `.hud-panel--status` height ceiling block is untouched.
- New slice-3 smoke:
  `tests/smoke/verify-m8a-v3-d03-s3-operator-control-row-grouping-runtime.mjs`
  asserts group presence/order/visibility, membership, exact heading
  text, V4.12 F-10 selector preservation and policy round-trip,
  D-03.S1 containment/rank preservation, D-03.S2 default-closed F-11
  preservation, status-panel height ≤ 360 px at 1440x900, no runtime
  console errors, and the §8.1-scoped forbidden-claim scan over the
  three group outerHTML strings plus the three heading outerHTML
  strings only.
- npm script: `test:m8a-v3-d03:s3` added to `package.json`.

Evidence reviewed by the total-control parent:

- Commit review: `git show --check a51a840` clean; commit message uses
  the locked §15.4 prefix and includes the required co-author trailer.
- Retained V4.13 validation artifact matching the S3 pre-commit
  sequence: `output/validation/phase7.1/2026-05-13T07-16-21.479Z-multi-orbit-scale-1000`.
- Retained V4.12 smoke artifacts adjacent to the S3 run:
  `output/m8a-v4.12-f10-policy-selector/f10-policy-selector-smoke.json`,
  `output/m8a-v4.12-f11-rule-config/f11-rule-config-smoke.json`, and
  `output/m8a-v4.12-f16-report-export/downloads/m8a-v4.12-f16-report-bootstrap-global-real-time-20260513T071524Z.{json,csv}`.
- Retained D-03 regression artifacts adjacent to the S3 run:
  `output/m8a-v3-d03/d03-s1/d03-s1-runtime-state.json`,
  `output/m8a-v3-d03/d03-s2/d03-s2-runtime-state.json`, and
  `output/m8a-v3-d03/d03-s3/d03-s3-runtime-state.json`.
- Retained S3 visual evidence under `output/m8a-v3-d03/d03-s3/`:
  `d03-s3-control-row-grouping-1440x900.png`,
  `operator-hud-global-d03-s3-1440x900.png`,
  `operator-hud-regional-d03-s3-1440x900.png`, and
  `first-intake-addressed-global-d03-s3-1440x900.png`.

Regression review (per §15.5 return contract):

- Slice-1 containment remains binding: the retained S3 runtime state
  records `statusPanelHeight: 352` at desktop-1440x900, below the
  slice-1 collapsed ceiling of 360 px.
- F-10 selector preservation holds in the retained runtime state:
  operator root, scenario select, policy select, policy status,
  real-time mode, prerecorded mode, speed controls, and scenario
  label all resolve; all three locked policy ids round-trip through
  the selector and align across HUD, panel, document, report, and
  snapshot surfaces.
- Slice-2 F-11 default-closed behavior still holds: the retained S3
  runtime state records `editorPresent: true` and `editorOpen: false`
  on initial mount.

Parent caveat: this control conversation did not rerun §15.4 gates and
did not receive a child transcript containing full console logs for
every command. The close-out record is based on the landed commit diff,
retained artifacts in `output/`, and the S3 runtime-state artifact.

What did **not** change:

- F-09 Communication Rate section, F-10 Handover Policy selector +
  live region, F-11 Rule Config details / form / status / actions,
  F-16 Report Export action group / disclosure / options / live
  regions, D-03.S1 primary / secondary telemetry split, D-03.S1
  secondary toggle, D-03.S2 `:not([open])` CSS rule, V4.13
  multi-orbit overlay path, first-intake addressed-route surfaces,
  R1V cleanup path, camera, overlay, replay-clock, scene-preset
  logic, measurement-truth copy, the D-03 acceptance-report row, the
  umbrella plan status, or the v4.12-followup-index §7 D-03 pointer.

D-03 acceptance row remains `部分完成`. Slice 3 does not close D-03.
Slice 4 later landed in `b02be72` and is recorded in §16.7.

## 16. Slice 4 (D-03.S4) — Primary Surface Rank + Cross-Panel Truth Chip

Slice 4 targets the joint resolution of gap G2 (full — equal-weight
telemetry slots with no visual rank) and gap G5 (truth-boundary copy
duplicated across panels). Slice 1 established the primary / secondary
container split and the `data-status-panel-rank` attribute scheme.
Slice 4 builds on top of that scheme by mounting a single cross-panel
truth chip ahead of the primary container, which both (a) serves as the
compact primary information surface called for by umbrella
§"Recovery Principle" and acceptance criterion #15, and
(b) consolidates the truth-contract framing that currently fragments
across F-09, F-11, F-16, Physical Inputs, and Validation State.

The slice does **not** re-rank the existing primary / secondary
containers, **does not** remove any per-panel provenance copy, and
**does not** modify any internal markup of the F-09, F-10, F-11, F-16,
Physical Inputs, Scene Starter, or Validation State surfaces.

This subsection is the **scope lock** for slice 4. It mirrors §14
(slice 2 scope lock) and exists so a fresh child conversation can
execute slice 4 without re-deriving acceptance criteria.

### 16.1 Acceptance criteria

1. The default Operator HUD renders a new compact element (the
   "cross-panel truth chip") inside the operator HUD root
   (`[data-operator-hud='bootstrap']`) and as a direct child of
   `.operator-status-hud__telemetry`, positioned in DOM order
   **before** the `[data-status-panel-rank='primary']` container. It
   is a sibling of the primary container, NOT a member of it. It is
   NOT inserted into `[data-status-panel-rank='secondary']`. It is
   NOT inserted into any F-09 / F-10 / F-11 / F-16 panel root. The
   slice-1 attribute `data-status-panel-rank='primary'` on the
   primary container is preserved verbatim and the primary
   container's child set
   (`data-operator-time-slot`, `data-operator-communication-slot`,
   `data-operator-decision-slot`) is unchanged.
2. The chip element carries the following attributes verbatim:
   - `data-cross-panel-truth-chip="true"`
   - `data-chip-rank="cross-panel-primary"`
   - `role="note"`
   - `aria-label="Cross-panel truth boundary"`
3. The chip's visible text content is exactly the following two
   sentences and nothing else:
   `Modeled, not measured. Communication Rate, Handover Decision, Physical Inputs, and Validation State each retain their own bounded-proxy / Repo-owned provenance.`
   The string is set via `textContent` (not `innerHTML`) at mount
   time. No interpolation. No localisation. No trailing whitespace.
4. The chip introduces no clickable surface, no disclosure toggle, no
   live region, no timer, no replay control, and no new dataset key
   on the operator HUD root other than the chip's own attributes. It
   must not capture focus and must not have `tabindex`. Keyboard tab
   order through the HUD is unchanged from slice-3 close-out.
5. Per-panel truth-boundary phrases listed in §7.3 remain reachable
   verbatim in the default-route DOM after slice 4 lands:
   - `Modeled, not measured.` — emitted both by the F-09 footnote
     (existing path) and additionally by the chip itself on the
     default route. The chip is the first place the operator reads
     this string and serves as the canonical cross-panel header. The
     F-09 per-panel emission is preserved unchanged.
   - `bounded proxy` / `bounded-proxy` — still rendered by the
     Communication Rate source-label span, the Handover Decision
     provenance span, the Physical Inputs provenance span, and the
     Report Export disclaimer / family-description path. The chip
     also emits the literal `bounded-proxy` substring.
   - `Repo-owned` / `repo-owned` — still rendered by Physical Inputs,
     Validation State, Handover Decision, and Report Export along
     their existing view-model paths. The chip also emits the literal
     `Repo-owned` substring.
   - rain-attenuation framing — still rendered as `Rain` (family
     label) plus `bounded-proxy` (per-family provenance) inside the
     Physical Inputs panel; §7.3 explicitly permits "equivalent
     rain-attenuation framing" so this satisfies the rule.
   - `Validation Boundary` — still rendered as the Validation State
     panel heading.
   Reachability of Communication Rate footnote, Handover Decision
   provenance, Report Export disclaimer copy, and the new chip itself
   must not require any user action beyond the default-route paint.
   Physical Inputs + Validation State live in the slice-1 secondary
   group and remain reachable after the user opens the slice-1
   secondary disclosure.
6. The chip text MUST NOT contain, in any case, any phrase listed in
   §8 "Forbidden Claims". A forbidden-claim scan of the new chip
   markup, of the modified `bootstrap-operator-hud.ts`, of the new
   compact-chip component file, of the new slice-4 smoke, and of
   every staged file returns empty.
7. A new slice-4 smoke
   `tests/smoke/verify-m8a-v3-d03-s4-cross-panel-truth-chip-runtime.mjs`
   asserts:
   - The chip element is present on the default route
     (`/?scenePreset=global`), is a descendant of
     `[data-operator-hud='bootstrap']`, is a descendant of
     `.operator-status-hud__telemetry`, and is a previous-sibling of
     `[data-status-panel-rank='primary']` (compare
     `Node.compareDocumentPosition`).
   - The chip carries `data-cross-panel-truth-chip='true'`,
     `data-chip-rank='cross-panel-primary'`, `role='note'`,
     `aria-label='Cross-panel truth boundary'`.
   - The chip's `textContent.trim()` exactly equals the §16.1 #3
     string.
   - The chip has no `tabindex` attribute and is not inside
     `[data-status-panel-rank='primary']` or
     `[data-status-panel-rank='secondary']`.
   - The slice-1 attributes still resolve:
     `data-status-panel-containment='v3-d03-s1'`,
     `[data-status-panel-rank='primary']` containing time /
     communication / decision slots,
     `[data-status-panel-rank='secondary']` containing physical /
     starter / validation slots, the slice-1 secondary toggle with
     default `aria-expanded='false'`.
   - With the secondary group expanded (single programmatic click on
     the slice-1 toggle), every §7.3 phrase is present somewhere in
     the operator HUD `textContent`: `Modeled, not measured.`,
     `bounded-proxy`, `Repo-owned` (or `repo-owned`), `Rain`,
     `Validation Boundary`. The assertion is over the expanded state
     because Physical Inputs + Validation State live behind it.
   - Forbidden-claim scan scoped per §8.1 Scan Scoping to the
     `[data-cross-panel-truth-chip='true']` element's outerHTML
     (the only element the slice introduces into the DOM). The scan
     must NOT cover the surrounding HUD root innerHTML, because that
     includes pre-existing V4.12 / V4.11 truth-boundary disclaimer
     copy enumerated in §8.1. The scan must return no §8 hit on the
     chip's outerHTML.
8. The slice-1 smoke
   `tests/smoke/verify-m8a-v3-d03-s1-status-panel-containment-runtime.mjs`
   and the slice-2 smoke
   `tests/smoke/verify-m8a-v3-d03-s2-handover-rule-config-default-closed-runtime.mjs`
   both still pass verbatim. Slice 4 must not regress the slice-1
   height ceiling (`min(40vh, 22rem)` collapsed,
   `min(60vh, 32rem)` expanded). The chip's own rendered height is
   bounded by its declared CSS (≤ 2.2 rem at desktop-1440x900) so
   that the slice-1 ceiling stays binding.
9. Every V4.12 acceptance smoke (F-09, F-10, F-11, F-16) and the
   V4.13 multi-orbit Phase 7.1 validation harness still pass. The
   chip must not alter any V4.12 selector listed in §7.1, must not
   propagate into the F-09 section markup, must not propagate into
   the F-10 selector / live region, must not propagate into the F-11
   `<details>`, and must not propagate into the F-16 action group.
10. Capture script `tests/visual/capture-m8a-v3-d03-baseline.mjs`
    accepts `--profile=d03-s4` and writes after-images under
    `output/m8a-v3-d03/d03-s4/` for the three default routes already
    in the §3 baseline-evidence table (global, regional, addressed
    first-intake).

### 16.2 Implementation outline

Files allowed to change (slice-4 ceiling: 1 HUD orchestrator file + 1
new compact-chip component file + 1 CSS update + 1 new slice-4 smoke +
1 capture-script delta + 1 package.json delta).

1. `src/features/operator/bootstrap-operator-hud.ts`
   - Inside `createElements`, insert the chip element as a `<div>`
     (NOT a `<button>`) directly under
     `.operator-status-hud__telemetry` and ahead of
     `.operator-status-hud__telemetry-primary` in the template-literal
     HTML. **All static attributes are set inline in the template
     HTML**: `class="operator-status-hud__truth-chip operator-control-chip operator-control-chip--cross-panel-truth"`,
     `data-cross-panel-truth-chip="true"`,
     `data-chip-rank="cross-panel-primary"`, `role="note"`,
     `aria-label="Cross-panel truth boundary"`. No `tabindex`. No
     `aria-pressed`.
   - Extend `BootstrapOperatorHudElements` with
     `crossPanelTruthChip: HTMLDivElement`. Add the chip to the
     `createElements` return object and to the existence check. Add
     nothing else to the interface.
   - Invoke `mountCrossPanelTruthChip(elements.crossPanelTruthChip)`
     once at panel construction. The mount function is the **only**
     surface that writes `textContent`. The chip does not subscribe to
     controller state.
   - Do not modify any other section of this file: scenario controls
     block, replay-mode block, replay-speed block, handover-policy
     block, primary-container block, slice-1 secondary toggle,
     slice-1 secondary container, report-export slot, `renderState`,
     `renderSecondaryExpansion`, busy-state handling, controller-error
     handling, or telemetry sync.
2. `src/features/operator/cross-panel-truth-chip.ts` (new file)
   - Single export: `mountCrossPanelTruthChip(container: HTMLDivElement): () => void`.
   - Sets `container.textContent` to the §16.1 #3 string verbatim. No
     `innerHTML`. No template interpolation. The constant lives in
     this file.
   - All `role`, `aria-label`, `class`, and `data-*` attributes are
     set by the template HTML in item 1. This file does NOT set them
     a second time (avoids double-write conflict).
   - Exports a `dispose` (`() => void`) for symmetry with sibling
     components; the chip has no subscription so `dispose` is a
     no-op.
   - No imports from any panel-internal feature module. The component
     must not import from `communication-rate/`, `physical-input/`,
     `validation-state/`, `report-export/`, or `handover-decision/`.
3. `src/styles.css`
   - Append (do NOT modify any existing declaration) a single new
     rule group adjacent to the existing
     `.operator-status-hud__telemetry` block. The group must contain
     exactly two new rules:
     - `.operator-status-hud__truth-chip` — text wrap, line-height,
       padding, font-size, opacity; inherits `.operator-control-chip`
       token colours.
     - `.operator-control-chip.operator-control-chip--cross-panel-truth`
       — defensive overrides so a static `<div>` chip does not
       inherit pressed-button visual treatment from the existing
       `.operator-control-chip[aria-pressed]` cascade. If the chip is
       never given `aria-pressed` (and slice 4 forbids setting it),
       this rule is defensive but harmless.
   - No existing selector / declaration / property in
     `src/styles.css` may be modified. No other new rule may be
     added. If the chip cannot be styled inside this constraint
     (e.g. cascade conflict with `.operator-control-chip:disabled`),
     STOP and report back rather than widening scope.
4. `tests/smoke/verify-m8a-v3-d03-s4-cross-panel-truth-chip-runtime.mjs`
   (new smoke)
   - Modelled after
     `verify-m8a-v3-d03-s1-status-panel-containment-runtime.mjs` and
     the slice-2 smoke.
   - Implements every assertion enumerated in §16.1 #7.
   - Captures before/after screenshots into
     `output/m8a-v3-d03/d03-s4/evidence/` for the global default
     route at desktop-1440x900, both with the secondary group
     collapsed (default) and expanded (after the single toggle
     click).
   - Reuses existing harness helpers; no new harness primitive may
     be introduced.
5. `tests/visual/capture-m8a-v3-d03-baseline.mjs`
   - Extend `--profile` to accept `d03-s4` and write after-images
     under `output/m8a-v3-d03/d03-s4/` for the three default routes,
     mirroring the existing `d03-s1` / `d03-s2` profile entries.
6. `package.json`
   - Add one new script entry:
     `"test:m8a-v3-d03:s4": "npm run build && node tests/smoke/verify-m8a-v3-d03-s4-cross-panel-truth-chip-runtime.mjs"`.
     Mirror the existing `test:m8a-v3-d03:s1` /
     `test:m8a-v3-d03:s2` shape verbatim.

**§7.3 preservation strategy (consolidation without removal).** Slice 4
consolidates by *adding* the chip; it does NOT remove or weaken any
per-panel provenance copy. The chip is additive. Every §7.3 phrase
continues to be emitted by its existing view-model path into its
existing per-panel span; the chip carries the canonical
`Modeled, not measured.` plus `bounded-proxy` plus `Repo-owned`
substrings on the default route as a belt-and-braces redundancy.
Slice 4 does NOT collapse the per-panel surfaces into `aria-hidden`
form, does NOT visually de-emphasise them beyond what slice 1 already
established for the secondary group, and does NOT touch their feature
modules.

The slice must not introduce:

- a removal, shortening, paraphrase, or `aria-hidden` wrap of any
  §7.3 phrase inside any panel feature module
- a programmatic mechanism by which the chip displaces, hides, or
  "owns" the per-panel provenance spans
- a `data-status-panel-rank` value other than the two slice-1 values
  (`primary`, `secondary`); the chip uses `data-chip-rank`, not
  `data-status-panel-rank`
- a clickable chip, focusable chip, or chip with a disclosure / live
  region
- a controller subscription, telemetry sync entry, or
  `OPERATOR_TELEMETRY_KEYS` extension for the chip
- any change to F-09, F-10, F-11, F-16, Physical Inputs, Scene
  Starter, Validation State, Report Export, the slice-1 secondary
  toggle, the slice-1 containment attribute, the slice-2
  default-closed F-11 disclosure, or the slice-3 operator control row
  grouping (when slice 3 lands)
- any change in `src/styles.css` beyond the additive rule group
  described in item 3

### 16.3 Forbidden during slice 4

Slice 4 must not:

- modify any panel-internal markup (Communication Time + F-09
  section, Handover Decision + F-11 editor + F-11 form + F-11 status
  + F-11 actions, Physical Inputs, Scene Starter, Validation State,
  Report Export action group + disclosure + options + live regions)
- modify any V4.12 acceptance selector listed in §7.1
- modify the F-10 handover policy selector or the F-10 live region
- modify the slice-1 primary / secondary container split, the slice-1
  secondary toggle, the slice-1 `data-status-panel-containment`
  value, or the slice-1 `data-status-panel-rank` attribute scheme
- modify the slice-2 F-11 default-closed `<details>` behaviour or the
  slice-2 additive
  `.handover-rule-config:not([open]) .handover-rule-config__form { display: none; }`
  rule
- modify the slice-3 operator control row grouping (when slice 3
  lands)
- modify any forbidden-claim copy or §7.3 truth-boundary phrase (any
  removal, shortening, paraphrase, casing change, punctuation change,
  or `aria-hidden` wrap of a §7.3 phrase inside its existing
  per-panel span is forbidden)
- introduce any of the §8 forbidden-claim phrases in chip text, CSS,
  smoke, capture script, runtime JSON, or commit body. The §8 list
  is: `measured throughput`, `measured latency`, `measured jitter`,
  `measured truth`, `live iperf`, `live ping`, `iperf result`,
  `ping-verified`, `iperf-backed`, `ping-backed`, `active satellite`,
  `active gateway`, `active path`, `pair-specific path`,
  `pair-specific GEO teleport`, `radio-layer handover`,
  `native RF handover`, `ESTNeT throughput`, `INET speed`,
  `NAT validated`, `tunnel verified end-to-end`, `DUT closed`,
  `>=500 LEO closure`, `multi-orbit closure complete`,
  `multi-orbit radio-layer handover`, `complete customer acceptance`,
  `Phase 8 unlocked`, `M8A-V4 endpoint-pair gate resolved`,
  `customer orbit model is integrated`, `D-03 closed`, `D-03 已完成`,
  `richer composition closed`, `presentation convergence closed`,
  `V-02 closed`, `V-03 closed`, `V-04 closed`, `V-05 closed`,
  `V-06 closed`, `iperf throughput`, `ping latency`
- modify camera, overlay, scene preset, replay-clock, first-intake
  addressed-route, R1V cleanup, or any runtime controller
- modify the V4.13 multi-orbit overlay path or its retained evidence
- update the D-03 acceptance-report row (reserved for slice 5)
- update `m8a-v3-presentation-convergence-umbrella-plan.md` status
  note
- update `m8a-v4.12-followup-index.md` §7 D-03 pointer
- introduce a second timer, a second autoplay track, a new replay
  control, a persistent disclosure cookie, a localisation layer, or
  any new measurement-truth / active-path / pair-specific language

### 16.4 Quality gates for slice 4 commit

Run in order before committing slice 4. All steps must be green:

1. `npm run build`
2. `node tests/smoke/verify-m8a-v4.12-f09-communication-rate-runtime.mjs`
3. `node tests/smoke/verify-m8a-v4.12-f10-handover-policy-selector-runtime.mjs`
4. `node tests/smoke/verify-m8a-v4.12-f11-handover-rule-config-runtime.mjs`
5. `node tests/smoke/verify-m8a-v4.12-f16-statistics-report-export-runtime.mjs`
6. `node tests/validation/run-phase7.1-viewer-scope-validation.mjs --validation-profile-id multi-orbit-scale-1000 --target-leo-count 500 --requested-overlay-mode multi-orbit-scale-points --enforce-pass`
7. `node tests/smoke/verify-m8a-v3-d03-s1-status-panel-containment-runtime.mjs`
8. `node tests/smoke/verify-m8a-v3-d03-s2-handover-rule-config-default-closed-runtime.mjs`
9. `node tests/smoke/verify-m8a-v3-d03-s4-cross-panel-truth-chip-runtime.mjs`
10. Forbidden-claim scan (§8 probe) over every staged file — empty;
    then `node tests/visual/capture-m8a-v3-d03-baseline.mjs --profile=d03-s4` —
    after-images written under `output/m8a-v3-d03/d03-s4/`

When slice 3 has landed before slice 4 runs, an additional gate is
inserted between the existing gates 8 and 9 to run the slice-3 smoke
`verify-m8a-v3-d03-s3-operator-control-row-grouping-runtime.mjs`. If
slice 3 has not landed, slice 4 may still execute; the chip anchor in
§16.1 #1 does not depend on slice-3 markup.

Commit message prefix:
`feat(presentation): D-03.S4 primary surface rank + cross-panel truth chip under M8A-V3 umbrella`.
Commit body must reference this §16 scope lock, the M8A-V3 umbrella,
the joint resolution of G2 + G5, and include the
`Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`
trailer.

### 16.5 Slice 4 Execution Authorization

A fresh child conversation is authorized to land slice 4 strictly
within the §16.2 file ceiling. The child must:

- start by re-reading §16 in full, then §14 (slice 2) and §6
  (slice 1) as reference shapes
- run the §16.4 quality gates in the listed order
- on green, commit a single feature commit using the prescribed
  prefix
- return to the total-control parent: commit SHA, retained evidence
  paths under `output/m8a-v3-d03/d03-s4/`, smoke run logs (one line
  each), and a one-paragraph regression review explicitly addressing
  (a) whether the slice-1 containment ceiling is still binding with
  the chip rendered, (b) whether every §7.3 phrase is still emitted
  by its existing per-panel span and reachable in the toggle-expanded
  DOM, and (c) whether the chip introduces any unintended cascade
  interaction with the slice-1 secondary toggle or the slice-2 F-11
  `:not([open])` rule

The child must not:

- update the D-03 acceptance row (reserved for slice 5)
- amend already-pushed commits
- push to remote or open a PR
- begin slice 5
- silently widen scope. If the chip cannot be styled, mounted, or
  asserted inside the §16.2 ceiling, STOP and return to the parent
  for an amendment (mirror slice 2's §14.6 amendment pattern).

After slice 4 close-out, the total-control parent updates this §16
with the slice-4 close-out commit SHA (mirror §13's slice-1 and §14's
slice-2 close-out records), the auto-memory
`scenario-globe-viewer-d03-presentation-polish.md` slice table, and
`MEMORY.md` index line. Only then is slice 5 unblocked.

### 16.6 Amendment Trail

- 2026-05-13 initial scope lock written. Chip text fixed to
  `Modeled, not measured. Communication Rate, Handover Decision, Physical Inputs, and Validation State each retain their own bounded-proxy / Repo-owned provenance.`
  (the draft's earlier `not measured truth` substring would have hit
  the §8 forbidden-claim scan because `measured truth` is in the
  list; the canonical F-09 phrase `Modeled, not measured.` avoids the
  collision and additionally surfaces §7.3 reachability for the
  canonical phrase on the default route without requiring secondary
  disclosure expansion).
- 2026-05-13 amendment: §16.1 #7 last bullet narrowed to scope the
  in-smoke DOM forbidden-claim scan to the
  `[data-cross-panel-truth-chip='true']` element's outerHTML only,
  per new §8.1 Scan Scoping subsection. This amendment is
  pre-emptive: it inherits the same scoping fix authorised against
  §14 (slice 2) after the slice-2 second child conversation hit a
  hard stop on a panel-wide DOM forbidden-claim scan that swept
  pre-existing V4.12 truth-boundary disclaimers (substring
  `measured latency` inside a negation in
  `handover-decision.ts:8-9`). The slice-4 smoke must not scan the
  HUD root innerHTML because that includes the same kind of
  pre-existing negations enumerated in §8.1; scanning the chip's
  outerHTML alone is the architecturally correct slice-level audit.

### 16.7 Slice 4 Close-Out Record

Landed implementation: commit `b02be726956aff2df7632bf20f59dbcfc8ee75e6
feat(presentation): D-03.S4 primary surface rank + cross-panel truth
chip under M8A-V3 umbrella`.

Diff stat: 6 files, 861 insertions, 1 deletion. This matches the
§16.2 file ceiling: one HUD orchestrator update, one new compact-chip
component, one CSS update, one new slice-4 smoke, one capture-script
profile registration, and one `package.json` script delta.

What landed:

- Operator HUD orchestrator:
  `src/features/operator/bootstrap-operator-hud.ts` imports
  `mountCrossPanelTruthChip`, inserts the static chip as a direct
  child of `.operator-status-hud__telemetry`, before
  `.operator-status-hud__telemetry-primary`, and wires it through
  `BootstrapOperatorHudElements` plus the unmount sequence. No
  controller subscription, telemetry key, or interactive handler was
  added for the chip.
- Cross-panel chip component:
  `src/features/operator/cross-panel-truth-chip.ts` exports
  `mountCrossPanelTruthChip(container: HTMLDivElement): () => void`
  and sets `textContent` to the §16.1 #3 string exactly:
  `Modeled, not measured. Communication Rate, Handover Decision, Physical Inputs, and Validation State each retain their own bounded-proxy / Repo-owned provenance.`
  The component does not set attributes and imports no panel-internal
  feature module.
- CSS:
  `src/styles.css` adds only the two S4 chip rules adjacent to
  `.operator-status-hud__telemetry`: `.operator-status-hud__truth-chip`
  and `.operator-control-chip.operator-control-chip--cross-panel-truth`.
  Existing declarations were not modified.
- New slice-4 smoke:
  `tests/smoke/verify-m8a-v3-d03-s4-cross-panel-truth-chip-runtime.mjs`
  asserts chip placement, exact attributes, exact text, static
  non-focusable behavior, S1 containment/rank preservation, S2
  default-closed preservation, S3 group preservation, expanded-state
  §7.3 reachability, status-panel height ceilings, chip height bound,
  no runtime console errors, and the §8.1-scoped forbidden-claim scan
  over the chip outerHTML only.
- Capture profile:
  `tests/visual/capture-m8a-v3-d03-baseline.mjs` registers `d03-s4`
  under `output/m8a-v3-d03/d03-s4/`.
- npm script: `test:m8a-v3-d03:s4` added to `package.json`.

Quality gates reported by the execution child (all green):

- `npm run build`
- `node tests/smoke/verify-m8a-v4.12-f09-communication-rate-runtime.mjs`
- `node tests/smoke/verify-m8a-v4.12-f10-handover-policy-selector-runtime.mjs`
- `node tests/smoke/verify-m8a-v4.12-f11-handover-rule-config-runtime.mjs`
- `node tests/smoke/verify-m8a-v4.12-f16-statistics-report-export-runtime.mjs`
- `node tests/validation/run-phase7.1-viewer-scope-validation.mjs --validation-profile-id multi-orbit-scale-1000 --target-leo-count 500 --requested-overlay-mode multi-orbit-scale-points --enforce-pass`
  → retained at `output/validation/phase7.1/2026-05-13T08-05-32.254Z-multi-orbit-scale-1000`
- `node tests/smoke/verify-m8a-v3-d03-s1-status-panel-containment-runtime.mjs`
- `node tests/smoke/verify-m8a-v3-d03-s2-handover-rule-config-default-closed-runtime.mjs`
- `node tests/smoke/verify-m8a-v3-d03-s3-operator-control-row-grouping-runtime.mjs`
- `node tests/smoke/verify-m8a-v3-d03-s4-cross-panel-truth-chip-runtime.mjs`
- §8 staged-files forbidden-claim probe — empty
- `node tests/visual/capture-m8a-v3-d03-baseline.mjs --profile=d03-s4`

Evidence under `output/m8a-v3-d03/d03-s4/`:

- `d03-s4-runtime-state.json`
- `evidence/d03-s4-truth-chip-default-collapsed-1440x900.png`
- `evidence/d03-s4-truth-chip-secondary-expanded-1440x900.png`
- `operator-hud-global-d03-s4-1440x900.png`
- `operator-hud-regional-d03-s4-1440x900.png`
- `first-intake-addressed-global-d03-s4-1440x900.png`

Total-control parent review:

- `git show --check b02be726956aff2df7632bf20f59dbcfc8ee75e6` clean.
- Commit message uses the locked §16.4 prefix, references §16 and the
  M8A-V3 umbrella, states the joint G2+G5 resolution, and includes the
  required co-author trailer.
- Changed-file set matches §16.2 exactly.
- Runtime state confirms the chip is a visible `DIV`, direct child of
  `.operator-status-hud__telemetry`, before the primary telemetry
  group, outside both rank containers, with exact attrs and exact
  text, no `tabindex`, no `aria-live`, no disclosure attrs, and no
  `aria-pressed`.

Regression review (per §16.5 return contract):

- Slice-1 containment remains binding with the chip rendered:
  retained runtime state records collapsed status-panel height 352 px
  against the 360 px ceiling, expanded height 512 px against the
  540 px ceiling, and chip height 27.89 px against the 2.2 rem bound
  (35.2 px at 16 px root font size).
- §7.3 phrases remain reachable after opening the S1 secondary group:
  `Modeled, not measured.`, `bounded-proxy` / `bounded proxy`,
  `Repo-owned` / `repo-owned`, `Rain`, and `Validation Boundary`
  all resolve in the retained runtime state. Existing per-panel
  provenance/title paths remain present.
- No unintended cascade interaction was observed against the S1
  secondary toggle, the S2
  `.handover-rule-config:not([open]) .handover-rule-config__form`
  rule, or the S3 Scene / Replay / Policy control grouping.

Parent caveat: this control conversation reviewed the landed diff,
commit metadata, retained artifacts, and child-reported gate list. It
did not rerun the §16.4 gates in the parent conversation.

What did **not** change:

- F-09 Communication Rate internals, F-10 Handover Policy selector /
  live region, F-11 Rule Config details / form / status / actions,
  F-16 Report Export action group / disclosure / options / live
  regions, Physical Inputs internals, Scene Starter internals,
  Validation State internals, D-03.S1 rank/toggle/containment
  scheme, D-03.S2 default-closed disclosure behavior, D-03.S3
  control grouping, V4.13 multi-orbit overlay path, first-intake
  addressed-route surfaces, R1V cleanup path, camera, overlay,
  replay-clock, scene-preset logic, the D-03 acceptance-report row,
  the umbrella plan status, or the v4.12-followup-index §7 D-03
  pointer.

D-03 acceptance row remains `部分完成`. Slice 4 does not update the
acceptance row. Slice 5 is now unblocked and remains the only slice
allowed to perform the final D-03 acceptance-route update.

## 17. Slice 5 (D-03.S5) Acceptance-Route Close-Out

Slice 5 is a docs-only acceptance bookkeeping pass. It records that the
D-03.S1-S4 presentation-composition work now satisfies the bounded D-03
route under the M8A-V3 umbrella hard gates, with no runtime, CSS, smoke,
package, or visual implementation changes.

Updated records:

- `/home/u24/papers/itri/itri-acceptance-report-2026-04-20/01-itri-requirement-inventory-and-status.md`
  moves the D-03 row from `部分完成` to bounded presentation completion
  wording only.
- `m8a-v3-presentation-convergence-umbrella-plan.md` records the D-03
  acceptance-route close-out while preserving the M8A-V2/V3 truth boundary.
- `m8a-v4.12-followup-index.md` §7 now points to the D-03 close-out as
  outside the V4.12 chain, not as a V4.12 closure.

Truth boundary preserved:

- V4.12 and V4.13 remain bounded repo-owned/public-TLE surfaces.
- The close-out does not claim external measured network truth, native/RF
  handover, customer orbit-model integration, NAT/tunnel/DUT validation, or
  full external authority acceptance.
- F-01, F-07/F-08/F-12, F-17, P-01..P-03, V-02..V-06, and M8A-V4 second
  endpoint lanes remain governed by their existing bounded or blocked
  authority records.
