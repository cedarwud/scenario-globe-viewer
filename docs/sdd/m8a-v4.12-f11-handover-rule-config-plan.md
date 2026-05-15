# M8A V4.12 F-11 Handover Rule Configuration Plan

Date: 2026-05-12
Working phase name: **M8A V4.12 customer must-have followup**.

## 0. Status

Status: planning SDD consumed by F-11 implementation close-out.

This file did not authorize implementation by itself. Runtime work was
authorized by the separate execution task, locked by
[m8a-v4.12-f11-impl-phase1-rule-config-spec.md](./m8a-v4.12-f11-impl-phase1-rule-config-spec.md),
and closed in
[m8a-v4.12-f11-impl-phase6-closeout.md](./m8a-v4.12-f11-impl-phase6-closeout.md).

Hard dependency:

- F-10 (`m8a-v4.12-f10-handover-policy-selector-plan.md`) must close first.
  F-11 builds on the `HandoverPolicyDescriptor` contract introduced there.

Parent audit:
[m8a-v4.12-itri-must-have-candidate-audit.md](./m8a-v4.12-itri-must-have-candidate-audit.md).

Sibling planning SDDs:

- [m8a-v4.12-f09-communication-rate-visualization-plan.md](./m8a-v4.12-f09-communication-rate-visualization-plan.md)
- [m8a-v4.12-f10-handover-policy-selector-plan.md](./m8a-v4.12-f10-handover-policy-selector-plan.md)
- [m8a-v4.12-f16-statistics-report-export-plan.md](./m8a-v4.12-f16-statistics-report-export-plan.md)

## 1. customer Requirement Reference

Acceptance-report quote:

`/home/u24/papers/itri/itri-acceptance-report-2026-04-20/01-itri-requirement-inventory-and-status.md:24`:

```text
| F-11 | 換手規則與相關參數可設定/模擬 | `部分完成` | Simulation-side decision logic exists, but end-user configuration of handover rules/parameters is not yet a completed runtime control surface. | `尚未排入目前 phase` |
```

customer README §3.1 dynamic-parameter UI:

`/home/u24/papers/itri/README.md:294-302`:

```text
明確需求包括：

- 互動式 3D 圖像化系統
- UI 互動介面
- 可動態調整參數介面
- 通訊狀態/通訊時間/通訊速率可視化
- 換手策略切換
```

Interpretation:

F-11 closes the user-configurable bounded handover rule surface. It does not
turn the simulator into a real network controller and does not claim live RF
behavior.

## 2. Current Scene Reality

After F-10 closes, the repo will have:

- `HandoverPolicyId` enum and `HandoverPolicyDescriptor` contract
- a fixed set of predefined policy variants
- operator selector for switching among predefined variants

What F-10 does **not** add:

- end-user editing of policy weight values
- end-user editing of tie-break order
- end-user editing of debounce / hysteresis / TTT-like timing parameters
- save / load / reset of configured rules
- per-scenario override

F-11 fills that gap.

## 3. Goal / Acceptance Criteria

Goal: close F-11 by adding an operator-facing rule configuration surface that
edits bounded simulation parameters and deterministically affects decision
state, without crossing the bounded-proxy truth boundary.

F-11 closed requires:

1. A `HandoverRuleConfig` contract owned by `handover-decision` that holds
   editable bounded parameters:
   - per-metric weights (`latencyMs`, `jitterMs`, `networkSpeedMbps`)
   - tie-break order
   - debounce / minimum dwell window (modeled bounded ticks)
   - hysteresis margin (modeled bounded units, not dB unless reviewer accepts)
2. An operator-facing rule editor surface mounted in the Phase 6 Operator
   HUD route, distinct from the F-10 selector.
3. Input validation: numeric ranges, min/max, decimal precision, error text.
4. Apply / Reset affordances; Apply triggers deterministic decision refresh.
5. Active rule config is included in `HandoverDecisionReport`.
6. Replay (real-time + prerecorded) preserves applied config.
7. Forbidden-claim scan green; bounded-proxy provenance preserved.
8. Smoke and screenshot evidence prove the editor mounts, validation works,
   applied config alters decision state, and forbidden claims are absent.

## 4. Scope / Non-Goals

In scope for future implementation:

- rule config contract + default constants;
- editor UI (form fields, validation, apply/reset, accessibility);
- integration with F-10 policy descriptor: editor edits the **active** policy
  descriptor's mutable rule fields, never the enum id;
- report widening to expose applied rule config;
- smoke + screenshot + forbidden-claim scan.

Non-goals:

- no F-09 / F-10 / F-13 / F-16 work bundled;
- no new measured-truth metric;
- no live RF / network controller claim;
- no scenario-scoped persistence to disk;
- no remote sync;
- no PDF / printable rule sheet;
- no V4.11 scene rewrite;
- no per-orbit-class rule override unless a future slice explicitly opens it;
- no automatic rule learning / optimization.

## 5. Forbidden Claims

- `production handover rule`
- `live network rule applied`
- `rule applied to real satellite`
- `rule verified by iperf/ping`
- `rule meets 3GPP TS spec`
- `rule enforces operator SLA`
- `rule validates DUT`
- `rule closes V-02..V-06`
- `rule closes `>=500 LEO``

Allowed copy examples:

- `Bounded handover rule config`
- `Modeled rule parameters`
- `Repo-owned proxy rule`
- `Modeled, not measured.`

## 6. Phase Plan

Phase count: **6 implementation phases**. F-11 is the largest of the V4.12
follow-ups; do not collapse phases.

### Phase 1 — Rule Schema + Default Inventory

- declare `HandoverRuleConfig`:
  - `weights: { latencyMs: number; jitterMs: number; networkSpeedMbps: number }`
  - `tieBreakOrder: ReadonlyArray<"latency" | "jitter" | "speed" | "stable-serving">`
  - `minDwellTicks: number`
  - `hysteresisMargin: number`
  - `appliedAt: string`
  - `provenanceKind: "bounded-proxy"`
- declare default constants per F-10 policy variant;
- define numeric validation ranges (e.g. weight 0–10, dwell 0–60 ticks);
- decide whether config is per-policy-variant or global:
  - **planning decision**: per-policy-variant. Editing while
    `bootstrap-latency-priority-v1` is active edits that variant's config; other
    variants keep their defaults.

### Phase 2 — Rule Evaluator Integration

- thread `HandoverRuleConfig` through the rank evaluator;
- update tie-break logic to read `tieBreakOrder`;
- update dwell / hysteresis behavior with modeled bounded units;
- preserve existing reason-code emission unless §11 opens a new one.

### Phase 3 — Editor UI

- mount a new collapsible `Handover Rule Config` section inside the existing
  Handover Decision panel (do not add an Operator HUD top-control row);
- form fields with labels, helper text, inline validation, numeric input;
- Apply button + Reset button + Cancel-edit affordance;
- accessibility: `<form>` with labelled fields, `aria-describedby` for helper
  text, visible focus, keyboard navigation, error live region;
- reduced-motion: disable any apply animation in `prefers-reduced-motion`;
- color-not-only validation states (icon + text + color).

### Phase 4 — Persistence Choice

- Phase 4 decision matrix:
  - **Session-only** (default): config lives in operator state, cleared on
    reload. Recommended starting point.
  - **localStorage opt-in**: future slice if reviewers want persistence.
- Phase 4 ships session-only; persistence is a deferred follow-up slice.

### Phase 5 — Report + Forbidden-Claim Scan

- widen `HandoverDecisionReport` with `appliedRuleConfig` field;
- F-16 export bundle picks up new field automatically;
- run forbidden-claim scan against DOM, panel copy, and JSON bytes;
- ensure scenario/replay/policy/rule combinatorics do not regress smoke.

### Phase 6 — Validation And Close-Out

- focused smoke: editor mounts, validation rejects out-of-range values, Apply
  alters `data-handover-rule-applied-at`, Reset restores defaults, JSON
  report includes applied config;
- screenshot evidence: editor open + applied + reset states;
- no console error;
- close-out note records defaults, validation ranges, smoke selectors.

## 7. Skill Use Plan

Required queries:

```bash
python3 /home/u24/.codex/skills/ui-ux-pro-max/scripts/search.py \
  "form labels helper text inline validation focus" --domain ux
python3 /home/u24/.codex/skills/ui-ux-pro-max/scripts/search.py \
  "numeric input range validation accessible" --domain ux
python3 /home/u24/.codex/skills/ui-ux-pro-max/scripts/search.py \
  "configuration panel apply reset confirmation" --domain ux
```

Apply form-label, inline-validation, focus, ARIA, and keyboard guidance
during Phase 3. Apply `frontend-ui-engineering` focused-component +
controlled-form pattern.

## 8. V4.11 Entanglement Check

Assessment: **independent**.

The rule editor mounts inside the Phase 6 Handover Decision panel, not in the
V4.11 ground-station scene. V4.11 disabled-tile copy may be updated post-F-11
in a separate hookpoint copy slice if planning/control wants.

## 9. Open Questions For Planning / Control

1. Is per-policy-variant editing acceptable, or should the editor be
   variant-agnostic (one global rule config)?
2. Should the editor expose hysteresis in modeled bounded units only, or also
   show a dB-style label (risky — could imply RF truth)?
3. Should Apply require a confirm modal (`prefers-reduced-motion` aware), or
   apply instantly?
4. Should the editor expose JSON import/export for the rule config in this
   slice, or defer to a future slice?
5. Should out-of-range numeric input snap-clamp to nearest valid value, or
   reject with error text?
6. Should default reset clear all variants, or only the currently-active
   variant?

## 10. Acceptance Gates

- Editor keyboard order + focus + ARIA correct.
- Inline validation rejects out-of-range values with visible error text.
- Apply alters decision state deterministically; Reset restores defaults.
- `HandoverDecisionReport.appliedRuleConfig` present in JSON export.
- Forbidden-claim scan green.
- Screenshot evidence: open / applied / reset / validation-error states.
- Bounded-proxy provenance unchanged.
- `prefers-reduced-motion` respected.

## 11. Open After Planning SDD

- exact field set beyond weights/tie-break/dwell/hysteresis (e.g. handover
  cooldown, candidate-count cap);
- whether to expose a `policy-weighted-override` reason code (deferred from
  F-10 §9 question 5);
- editor placement: inline collapsible section vs side drawer;
- whether tie-break order is editable via drag-reorder or radio group;
- whether the editor blocks during decision refresh;
- whether new reason codes are emitted when rule config differs from variant
  default.
