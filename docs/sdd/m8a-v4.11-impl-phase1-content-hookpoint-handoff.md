# M8A V4.11 Implementation Phase 1 Content + Hookpoint Handoff

## §1 Changed files

- `src/runtime/m8a-v411-inspector-concurrency.ts`
- `src/runtime/m8a-v4-ground-station-handover-scene-controller.ts`
- `src/styles/m8a-v411-inspector-concurrency.css`
- `tests/smoke/verify-m8a-v4.11-correction-a-phase-c-runtime.mjs`
- `tests/smoke/verify-m8a-v4.11-correction-a-phase-e-runtime.mjs`
- `docs/sdd/m8a-v4.11-impl-phase1-content-hookpoint-handoff.md`

Generated Phase 1 evidence:

- `output/m8a-v4.11-impl-phase1/w1-metrics-tab-1440x900.png`
- `output/m8a-v4.11-impl-phase1/w3-metrics-tab-1440x900.png`
- `output/m8a-v4.11-impl-phase1/capture-manifest.json`

## §2 Disabled tile inventory implemented

The Metrics tab now renders 13 disabled tiles in the `Not connected in this scene` group. Each tile has visible gap copy, visible placeholder text, visible hookpoint/reachability text, and `aria-disabled="true"`.

| # | Disabled tile copy | Hookpoint / qualifier | Placeholder |
|---|---|---|---|
| 1 | Numeric communication time and availability detail | `Communication Time panel` / `Phase 6 acceptance route, separate` | `未連接` |
| 2 | Handover decision proxy inputs over latency/jitter/network-speed dimensions | `Handover Decision panel` / `Phase 6 acceptance route, separate` | `未連接` |
| 3 | Dedicated communication-rate visualization | `No dedicated communication-rate surface yet; F-09 remains 待完成` / `not reachable from this scene` | `未連接` |
| 4 | Rain / antenna / ITU / V 組 physical factor projection | `Physical Inputs panel` / `Phase 6 acceptance route, separate` | `未連接` |
| 5 | Bounded validation environment / DUT / transport state | `Validation State panel` / `Phase 6 acceptance route, separate` | `未連接` |
| 6 | ESTNeT / INET end-to-end network truth | `External validation gap: ESTNeT/INET, ping/iPerf, NAT/tunnel, traffic generator are not owned by this repo scene` / `not reachable from this scene` | `external validation` |
| 7 | WSL tunnel / bridging / NAT routing | `Validation State shows bounded modes; real tunnel/bridge/NAT remains external` / `Phase 6 acceptance route, separate` | `未連接` |
| 8 | Virtual / physical DUT and NE-ONE traffic generator | `Validation State names bounded DUT modes; real DUT/traffic generator chain remains external` / `Phase 6 acceptance route, separate` | `未連接` |
| 9 | >=500 LEO scale | `Phase 7.1 open gate; this scene remains 13-actor demo` / `not reachable from this scene` | `Phase 7.1 gate` |
| 10 | Operator-switchable handover strategy | `Fixed repo-owned bootstrap policy only; no runtime strategy selector here` / `not reachable from this scene` | `未連接` |
| 11 | Configurable handover rules / dynamic parameters beyond scenario/replay controls | `Bounded replay/scenario controls exist; no user rule editor in this scene` / `not reachable from this scene` | `未連接` |
| 12 | Report export action | `Export-ready report structures exist; no completed end-user export button here` / `not reachable from this scene` | `未連接` |
| 13 | Real-time vs prerecorded TLE full scenario-space switching | `Existing replay mode is bounded; full multi-source TLE scenario switching closes downstream` / `not reachable from this scene` | `未連接` |

Verified panel names from source grep:

```text
src/features/communication-time/bootstrap-communication-time-panel.ts:58:        <span class="communication-time-panel__eyebrow">Communication Time</span>
src/features/handover-decision/bootstrap-handover-decision-panel.ts:64:        <span class="handover-decision-panel__eyebrow">Handover Decision</span>
src/features/physical-input/bootstrap-physical-input-panel.ts:57:        <span class="physical-input-panel__eyebrow">Physical Inputs</span>
src/features/validation-state/bootstrap-validation-state-panel.ts:65:        <span class="validation-state-panel__eyebrow">Validation State</span>
```

## §3 Metrics tab Available group implementation

The old Metrics tab `Unavailable measured data` / `Unavailable physical factors` copy was replaced with a two-group structure:

- `Available in this scene`: 4 available tiles for modeled latency class, modeled continuity class, modeled handover state, and replay timing/countdown.
- `Not connected in this scene`: 13 disabled tiles listed above.

Available tile values use the existing data typography token, tabular figures, stable minimum width, and fixed tile dimensions so the replay countdown tick does not resize the Metrics grid.

## §4 A11y verification

Runtime capture verified the disabled tile contract:

- 13 tiles matched `[data-m8a-v411-disabled-metric-tile="true"]`.
- Every disabled tile has `aria-disabled="true"`.
- Every disabled tile is non-focusable (`tabIndex: -1` observed).
- Every disabled tile computed `cursor: not-allowed`.
- Every disabled tile had `focusableDescendantCount: 0`.
- Hookpoint and reachability explanations are visible text, not hover-only explanations.

The same capture verified available metric value typography:

- `font-family`: `"IBM Plex Mono", "Roboto Mono", ui-monospace, monospace`
- `font-variant-numeric`: `tabular-nums`
- observed value width: `157.5px` for all 4 available value fields in W1 and W3 captures.

## §5 Smoke Softening Disclosure

Spec v2 §4.3 and §13 supersede the earlier smoke wording that expected the Metrics tab to expose old generic `Unavailable measured data` copy. The updated smoke assertions now verify the required `Available in this scene` / `Not connected in this scene` structure, the exact reachable hookpoint names, the 13 disabled tiles, and the no-fake-measured-values invariant.

The affected smoke softening landed in:

- `tests/smoke/verify-m8a-v4.11-correction-a-phase-c-runtime.mjs`
- `tests/smoke/verify-m8a-v4.11-correction-a-phase-e-runtime.mjs`

`test:m8a-v4.11:conv4` did not require a wording assertion update in this phase; it passed unchanged while keeping the Slice 5 Sources demotion invariant green.

## §6 Source accuracy verification log

Panel name grep:

```text
$ rg -n "Communication Time|Handover Decision|Physical Inputs|Validation State" src/features/communication-time/bootstrap-communication-time-panel.ts src/features/handover-decision/bootstrap-handover-decision-panel.ts src/features/physical-input/bootstrap-physical-input-panel.ts src/features/validation-state/bootstrap-validation-state-panel.ts
src/features/validation-state/bootstrap-validation-state-panel.ts:65:        <span class="validation-state-panel__eyebrow">Validation State</span>
src/features/handover-decision/bootstrap-handover-decision-panel.ts:64:        <span class="handover-decision-panel__eyebrow">Handover Decision</span>
src/features/physical-input/bootstrap-physical-input-panel.ts:57:        <span class="physical-input-panel__eyebrow">Physical Inputs</span>
src/features/communication-time/bootstrap-communication-time-panel.ts:58:        <span class="communication-time-panel__eyebrow">Communication Time</span>
```

Route mount check:

```text
$ rg -n "Communication Time|Handover Decision|Physical Inputs|Validation State" src/runtime/bootstrap/composition.ts
<no matches; exit 1>
```

Bootstrap composition still creates the M8A V4 ground-station scene separately from the Phase 6 HUD mount path:

```text
src/runtime/bootstrap/composition.ts:519:    mountHud: adoptFirstIntakeAsActiveOwner
src/runtime/bootstrap/composition.ts:655:  const m8aV4GroundStationScene = isM8aV4RuntimeRequest
src/runtime/bootstrap/composition.ts:656:    ? createM8aV4GroundStationSceneController({
```

Smoke / validation log:

```text
npm run build
node tests/smoke/verify-m8a-v4.11-correction-a-phase-c-runtime.mjs
node tests/smoke/verify-m8a-v4.11-correction-a-phase-e-runtime.mjs
npm run test:m8a-v4.11:slice1
npm run test:m8a-v4.11:slice2
npm run test:m8a-v4.11:slice3
npm run test:m8a-v4.11:slice4
npm run test:m8a-v4.11:slice5
npm run test:m8a-v4.11:slice6
npm run test:m8a-v4.11:conv1
npm run test:m8a-v4.11:conv2
npm run test:m8a-v4.11:conv3
npm run test:m8a-v4.11:conv4
npm run test:m8a-v4.11:correction-a-phase-b
npm run test:m8a-v4.11:correction-a-phase-c
npm run test:m8a-v4.11:correction-a-phase-d
npm run test:m8a-v4.11:correction-a-phase-e
npm run test:m8a-v4.10:slice1
npm run test:m8a-v4.10:slice2
npm run test:m8a-v4.10:slice3
npm run test:m8a-v4.10:slice4
npm run test:m8a-v4.10:slice5
npm run test:m8a-v4.9
npm run test:m8a-v4.8
npm run test:m8a-v4.7.1
node /tmp/m8a_v411_phase1_metrics_capture.mjs
```

Result: all passed.

## §7 Phase 2-4 scope unchanged

Confirmed unchanged for this Phase 1 implementation:

- Boundary tab structure remains present; Phase 2 removal did not happen.
- No inspector boundary header strip was added.
- No validation status badge was added.
- Evidence tab Archive collapse logic was not changed.
- No new `--m8a-v411-state-*` token family was added.
- Orbit token usage was not migrated.
- Reviewer mode / replay state machine was not changed.
- Narrow/tablet CSS redesign was not changed; existing media queries remain pre-existing.
- Route, endpoint pair, precision boundary, actor set, V4.6D model, R2 provenance, and Slice 6 reviewer transcripts were not changed.
- `leo-beam-sim` source was not modified.
- No measured numeric latency, jitter, throughput, or packet-loss metrics were added.
