# M8A-V3 D-03 Presentation Polish Slice Plan

Date: 2026-05-13
Working phase name: **M8A-V3 D-03 presentation composition polish**.

## 0. Purpose

The V4.12 + V4.13 ITRI must-have chain landed five new bounded surfaces inside
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

- new ITRI must-have closure (F-01, F-02 measured, F-07/F-08/F-12 measured,
  F-17, V-02..V-06)
- new endpoint authority (M8A-V4 ground-station / second operator pair)
- new ITRI orbit-model integration
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
| D-03.S2 | F-11 Rule Config default-closed disclosure | G3 | 1 panel file + 1 smoke amendment + 1 new smoke + capture-script profile | low | scope locked in §14; pending execution |
| D-03.S3 | Operator control row grouping | G4 | 1 HUD file + 1 CSS update | low | pending |
| D-03.S4 | Primary surface rank + cross-panel truth chip | G2 (full) + G5 | 1 HUD file + 1 CSS update + 1 new compact-chip component | medium | pending |
| D-03.S5 | Acceptance-route final acceptance + D-03 row update | umbrella Hard Gates | docs + close-out | low | pending |

Slices must be executed in **separate conversations**. Each slice ends with a
quality gate run and commit. Slice 1 (D-03.S1) is the only authorized slice
for this conversation.

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
- `complete ITRI acceptance`, `Phase 8 unlocked`,
  `M8A-V4 endpoint-pair gate resolved`
- `ITRI orbit model is integrated`
- `D-03 closed`, `D-03 已完成`, `richer composition closed`,
  `presentation convergence closed`
- `V-02 closed`, `V-03 closed`, `V-04 closed`, `V-05 closed`,
  `V-06 closed`
- `iperf throughput`, `ping latency`

Forbidden-claim scan command (run from repo root before each slice
commit):

```bash
git diff --staged --name-only -z | xargs -0 grep -EHIin \
  'measured throughput|measured latency|measured jitter|measured truth|live iperf|live ping|iperf result|ping-verified|iperf-backed|ping-backed|active satellite|active gateway|active path|pair-specific path|pair-specific GEO teleport|radio-layer handover|native RF handover|ESTNeT throughput|INET speed|NAT validated|tunnel verified end-to-end|DUT closed|>=500 LEO closure|multi-orbit closure complete|multi-orbit radio-layer handover|complete ITRI acceptance|Phase 8 unlocked|M8A-V4 endpoint-pair gate resolved|ITRI orbit model is integrated|D-03 closed|richer composition closed|presentation convergence closed|V-0[2-6] closed|iperf throughput|ping latency' || true
```

Scan must return empty for each commit. The script above is a probe, not
a CI gate — the slice author runs it manually before commit.

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
   - Forbidden-claim scan (run inside the smoke against the panel innerHTML)
     returns no hit for any phrase listed in §8.
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
