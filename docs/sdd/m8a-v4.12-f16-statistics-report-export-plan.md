# M8A V4.12 F-16 Statistics Report Export Plan

Date: 2026-05-06
Working phase name: **M8A V4.12 customer must-have followup**.

## 0. Status

Status: planning SDD, doc-only.

This file does not authorize implementation. It does not open runtime work by
itself. No smoke, no runtime change, no feature mounting, and no commit are part
of this planning task.

Recommended candidate: **F-16 statistics report export**.

## 1. customer Requirement Reference

customer must-have reference:

- `/home/u24/papers/itri/README.md:565` lists `Statistics report export` in §8.1.
- `/home/u24/papers/itri/itri-acceptance-report-2026-04-20/00-external-acceptance-summary.md:101-108`
  says `end-user report export flow` is still not separately phased.

Acceptance-report quote:

> `/home/u24/papers/itri/itri-acceptance-report-2026-04-20/01-itri-requirement-inventory-and-status.md:29`:
> `| F-16 | Statistics report export | Partial | Export-ready report structures exist for communication-time, handover, physical-input, and validation-state, but there is no completed end-user export workflow/button yet. | Not yet scheduled in current phase |`

Interpretation:

F-16 is not blocked on new measurement truth. It is blocked on an end-user export
workflow that exposes existing bounded report structures as a downloadable
artifact.

## 2. Current Scene Reality

Existing report structures:

- `src/features/communication-time/communication-time.ts:66-96` defines
  `CommunicationTimeReport`, including schema version, scenario, active range,
  current status, summary, and windows. `src/features/communication-time/communication-time.ts:319-359`
  materializes that report, and `src/features/communication-time/communication-time.ts:407-429`
  places it on state as `report`.
- `src/features/handover-decision/handover-decision.ts:1-9` defines the
  bounded-proxy provenance and explicitly says the decision metrics are not
  measured latency, jitter, or throughput truth. `src/features/handover-decision/handover-decision.ts:72-77`
  defines `HandoverDecisionReport`.
- `src/features/physical-input/physical-input.ts:105-138` defines
  `PhysicalInputReport`, including candidates, base metrics, projected metrics,
  provenance, projection target, and disclaimer. `src/features/physical-input/physical-input.ts:3-10`
  says the physical-input metrics are bounded proxies projected into
  `latencyMs / jitterMs / networkSpeedMbps`.
- `src/features/validation-state/validation-state.ts:34-45` defines
  `ValidationStateReport`, and `src/features/validation-state/validation-state.ts:161-179`
  materializes it. `src/features/validation-state/validation-state.ts:3-6`
  says external NAT/tunnel/bridge behavior remains outside this repo.

Existing visible panels and controls:

- `src/features/operator/bootstrap-operator-hud.ts:117-153` creates only the
  current top controls: scenario select, replay mode, and replay speed.
- `src/features/operator/bootstrap-operator-hud.ts:155-177` defines telemetry
  slots for timeline, communication, physical, decision, starter, and validation.
- `src/features/operator/bootstrap-operator-hud.ts:340-359` mounts
  Communication Time, Physical Inputs, Handover Decision, Scene Starter, and
  Validation State panels into those slots.
- `src/features/communication-time/bootstrap-communication-time-panel.ts:68-74`
  renders status, available, unavailable, remaining available, and provenance.
  There is no export affordance in this panel markup.
- `src/features/handover-decision/bootstrap-handover-decision-panel.ts:74-80`
  renders kind, serving, orbit, previous, reasons, and provenance. There is no
  policy selector or export affordance there.

Source-grep absence check:

```bash
rg -n "download|Blob|createObjectURL|CSV|csv|Export|export action|report export" \
  src/features/communication-time \
  src/features/handover-decision \
  src/features/physical-input \
  src/features/validation-state \
  src/features/operator \
  src/runtime/bootstrap/composition.ts
```

This returned no matches. That supports the acceptance-report statement that no
end-user export workflow/button exists in the current bounded seams.

Route mounting reality:

- `src/runtime/bootstrap/composition.ts:405-416` mounts the Bootstrap Operator
  HUD only when `mountHud` is true.
- `src/runtime/bootstrap/composition.ts:512-520` passes
  `mountHud: adoptFirstIntakeAsActiveOwner`.
- `src/runtime/bootstrap/composition.ts:655-661` creates the M8A V4 ground
  station scene separately when the V4 route is requested.
- `src/runtime/bootstrap/composition.ts:714-720` still exposes the existing
  communication-time, physical-input, handover-decision, scene-starter, and
  validation-state controllers on the capture seam.

Planning conclusion:

F-16 should target the existing bounded report/controller seam and a compact
operator-facing export workflow. It should not be implemented as V4.11 polish or
as a V4.11 scene rewrite.

## 3. Goal / Acceptance Criteria

Goal:

Close F-16 by adding a visible end-user report export workflow that downloads
the existing bounded statistics reports without changing their truth boundary.

F-16 closed means:

1. An end-user can trigger report export from the operator/report surface.
2. Export includes communication-time, handover-decision, physical-input, and
   validation-state report data when those states are present.
3. Exported data includes schema version, generated timestamp, active scenario,
   replay mode/time context, and provenance/disclaimer fields.
4. At least JSON export is available. CSV export should be included for reviewer
   convenience unless implementation discovers a concrete blocker.
5. The UI labels the artifact as bounded/proxy report export, not measured
   external network truth.
6. Browser validation proves the export action produces a downloadable artifact
   with expected fields and no forbidden claims.
7. No other F-ID is bundled into the close-out.

## 4. Scope / Non-Goals

In scope for a future implementation prompt:

- a small export control in the existing operator/report area;
- a report bundle contract over the four existing report structures;
- JSON serialization and CSV serialization;
- generated filename convention;
- user feedback for export start, success, and failure;
- accessibility for the export control;
- smoke/download verification and forbidden-claim scan.

Non-goals:

- no F-09 communication-rate visualization;
- no F-10 policy selector;
- no F-11 rule editor;
- no F-13 `>=500 LEO` validation;
- no V4.11 scene rewrite or new V4.11 must-have delivery;
- no backend, server storage, scheduled export, PDF generation, or email flow;
- no external `iperf` / `ping` measurement chain;
- no live NAT/tunnel/DUT/traffic-generator validation;
- no active satellite, active gateway, pair-specific path, or native RF handover
  claim.

## 5. Forbidden Claims

The export workflow must not claim:

- measured throughput, measured latency, or measured jitter;
- live `ping` / `iperf` truth;
- active serving satellite truth;
- active gateway assignment;
- pair-specific teleport path truth;
- native RF handover;
- external NAT/tunnel/bridge/DUT completion;
- `>=500 LEO` scale validation;
- full customer acceptance completion.

V4.11 boundary reference:

- `docs/sdd/m8a-v4.11-content-and-visual-followup-spec.md:126-134` preserves
  no active satellite/gateway/path, no measured latency/jitter/throughput, and
  no native RF handover.
- `docs/sdd/m8a-v4.11-content-and-visual-followup-spec.md:625-638` says V4.11
  does not add new customer must-haves, measured truth, or `>=500 LEO` delivery.
- `docs/sdd/m8a-v4.11-content-and-visual-followup-spec.md:249` states F-16 is
  still only export-ready structures with no end-user export action in V4.11.

## 6. Phase Plan

Phase count: **4 implementation phases**.

### Phase 1 - Export Contract And Inventory

Goal:

- define a repo-owned `M8aV412F16ReportBundle` contract that wraps the four
  current report structures without mutating their schemas.

Work:

- inventory report fields from communication-time, handover-decision,
  physical-input, and validation-state;
- define required bundle metadata: bundle schema version, generatedAt, scenario
  id/label, replay mode, current time, source panel list, and provenance summary;
- decide CSV row groups and JSON shape;
- define exact bounded-disclaimer copy.

Reconciliation:

- compare bundle fields against the acceptance-report F-16 row;
- run a source grep for forbidden words such as `measured throughput`, `live
  iperf`, `active gateway`, `native RF handover`, and `500 LEO`;
- confirm no F-09/F-10/F-11 fields are required to close this phase.

### Phase 2 - End-User Export Workflow

Goal:

- add a compact export control to the existing operator/report surface.

Work:

- place one visible export button or split action where the current operator
  user expects report actions;
- expose JSON and CSV choices without cluttering the existing status panels;
- handle disabled/unavailable states when a report source is absent;
- show success/error feedback without freezing the HUD.

Reconciliation:

- verify keyboard order, accessible names, focus state, and loading/disabled
  feedback;
- confirm the control does not alter scenario/replay/policy/rule state;
- confirm copy says bounded/proxy report export.

### Phase 3 - Serialization And Download Behavior

Goal:

- produce downloadable `.json` and `.csv` artifacts from the report bundle.

Work:

- serialize JSON with stable key order where practical;
- serialize CSV with one row group per report family or a documented normalized
  table shape;
- include schemaVersion/provenance/disclaimer fields;
- use a filename such as
  `m8a-v4.12-f16-report-<scenario-id>-<timestamp>.json`;
- keep all export work client-side unless a future prompt explicitly changes
  scope.

Reconciliation:

- open the downloaded artifacts in smoke or unit verification and assert key
  fields exist;
- verify CSV does not strip provenance/disclaimer context;
- verify generated files do not include new unsupported measured-truth claims.

### Phase 4 - Validation And Close-Out

Goal:

- prove F-16 is ready to mark closed for the bounded repo-owned seam.

Work:

- add focused tests or browser smoke for export availability, download, JSON
  fields, CSV fields, no console error, and forbidden-claim scan;
- capture one concise before/after or DOM evidence note if the implementation
  prompt requests it;
- update close-out docs only after implementation is actually authorized and
  delivered.

Reconciliation:

- rerun the acceptance-report mapping and confirm only F-16 is claimed;
- confirm F-09, F-10, F-11, and F-13 remain untouched unless separately opened;
- confirm V4.11 route and V4.11 acceptance text remain independent.

## 7. Skill Use Plan

Planning run completed:

```bash
python3 /home/u24/.codex/skills/ui-ux-pro-max/scripts/search.py \
  "report export workflow csv download" --domain ux
```

Result: no direct UX rows. Do not claim a skill database pattern that was not
returned.

Required follow-up skill use during implementation:

1. Phase 1: rerun the exact export query and record if the skill database has
   changed.
2. Phase 2: apply `ui-ux-pro-max` rules for loading feedback, disabled-state
   clarity, focus states, ARIA labels, and keyboard navigation.
3. Phase 2: apply `frontend-ui-engineering` guidance for focused components,
   existing design-system adherence, and accessible interactive elements.
4. Phase 3: apply `ui-ux-pro-max` chart/data guidance that data-heavy products
   should offer export options and accessible data alternatives.
5. Phase 4: run a UX validation pass for keyboard navigation, focus order,
   reduced-motion neutrality, and no inaccessible icon-only controls.

Supplemental searches already run in this planning task:

- `disabled state feedback loading button accessible` under `--domain ux`
  returned loading feedback guidance.
- `form labels helper text inline validation focus` under `--domain ux` returned
  form labels, inline validation, and focus-state guidance.
- `keyboard navigation aria labels focus states` under `--domain ux` returned
  ARIA, keyboard navigation, and focus-state guidance.
- `export option csv data report` under `--domain chart` returned chart/data
  results that emphasize accessible data alternatives, even though the exact CSV
  export match was indirect.

## 8. V4.11 Entanglement Check

Assessment: **independent**.

F-16 does not need to change the V4.11 ground-station review scene. V4.11
already documents F-16 as not delivered there, and V4.11 explicitly excludes new
must-haves, measured network truth, native RF handover, and `>=500 LEO` delivery.

Minimal allowed touch, only if a future implementation prompt explicitly asks:

- V4.11 may keep its disabled hookpoint language accurate.
- A future link from V4.11 to the export surface would be a navigation/hookpoint
  change, not an F-16 implementation requirement.

Default implementation route:

- target the existing bounded report/controller seam and operator/report surface;
- leave V4.11 composition and scene semantics unchanged.

## 9. Open Questions For Planning / Control

1. Should the user-facing export be a single combined bundle, per-panel exports,
   or both?
2. Is JSON-only enough for initial F-16 closure, or must CSV ship in the same
   implementation prompt?
3. Should CSV use separate row groups per report family, or a normalized
   long-table shape with `reportFamily`, `field`, `value`, and `provenance`
   columns?
4. Where should the export control live: operator controls, report panel footer,
   or a small report actions row?
5. What filename timestamp format should be canonical for reviewer artifacts?
6. Will customer reviewers accept bounded/proxy report export as F-16 closure while
   external `iperf/ping` truth remains outside this repo?

Implementation prompt readiness:

**YES**, after planning/control accepts this SDD and explicitly authorizes
implementation. This doc alone remains planning-only.
