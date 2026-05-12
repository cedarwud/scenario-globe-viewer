# M8A V4.12 F-10 Handover Policy Selector Plan

Date: 2026-05-12
Working phase name: **M8A V4.12 ITRI must-have followup**.

## 0. Status

Status: planning SDD consumed by F-10 implementation close-out.

This file did not authorize implementation by itself. The runtime work was
authorized by the separate execution task and locked by
[m8a-v4.12-f10-impl-phase1-policy-spec.md](./m8a-v4.12-f10-impl-phase1-policy-spec.md).
Close-out evidence is recorded in
[m8a-v4.12-f10-impl-phase5-closeout.md](./m8a-v4.12-f10-impl-phase5-closeout.md).

Parent audit:
[m8a-v4.12-itri-must-have-candidate-audit.md](./m8a-v4.12-itri-must-have-candidate-audit.md).

Sibling planning SDDs:

- [m8a-v4.12-f09-communication-rate-visualization-plan.md](./m8a-v4.12-f09-communication-rate-visualization-plan.md)
- [m8a-v4.12-f16-statistics-report-export-plan.md](./m8a-v4.12-f16-statistics-report-export-plan.md)
- [m8a-v4.12-f11-handover-rule-config-plan.md](./m8a-v4.12-f11-handover-rule-config-plan.md)

Sequencing note: F-10 must close before F-11. F-11 rule editor depends on the
policy contract surface added here.

## 1. ITRI Requirement Reference

Acceptance-report quote:

`/home/u24/papers/itri/itri-acceptance-report-2026-04-20/01-itri-requirement-inventory-and-status.md:23`:

```text
| F-10 | 換手策略可切換 | `部分完成` | Repo already has a deterministic decision layer, but it still stays on a fixed repo-owned bootstrap policy id instead of an operator-switchable policy surface. | `尚未排入目前 phase` |
```

ITRI README §2.4 link-switching context:

`/home/u24/papers/itri/README.md:195-216`:

```text
### 2.4 Link Switching / Handover Logic

Kickoff deck 明確要求：

- 可於低軌、中軌、高軌衛星訊號之間切換
- 根據當前鏈路品質進行切換

被明確列出的鏈路品質參數包括：

- `latency`
- `jitter`
- `network speed`

另外，原始功能需求與 UI 規格也明確提到：

- 通訊換手規則模擬
- 換手策略切換
```

Interpretation:

F-10 closes only the repo-owned bounded-policy switchable surface. It does not
change underlying decision metrics from bounded-proxy to measured truth and
does not claim live RF or network control.

## 2. Current Scene Reality

Existing decision layer:

- `src/features/handover-decision/handover-decision.ts` defines bounded-proxy
  candidate metrics + deterministic ranking. Provenance constant:
  `HANDOVER_DECISION_PROXY_PROVENANCE = "bounded-proxy"`.
- `src/runtime/bootstrap-handover-decision-source.ts` materializes one fixed
  policy id (`bootstrap-balanced-v1` or equivalent constant) and feeds it into
  the controller.
- `src/features/handover-decision/bootstrap-handover-decision-panel.ts`
  renders kind, serving, orbit, previous, reasons, provenance. No selector
  affordance.

Source-grep evidence baseline:

```bash
rg -n "bootstrap-balanced-v1|policyId|HandoverPolicy|policySelector|setPolicy|switchPolicy" \
  src/features/handover-decision \
  src/runtime
```

Expected result: only the single fixed bootstrap policy id; no selector seam.

Existing operator HUD control row:

- `src/features/operator/bootstrap-operator-hud.ts` exposes scenario select,
  replay mode, replay speed. No policy selector control.

Planning conclusion: F-10 must (a) widen the decision contract with a policy
descriptor enum, (b) add a small set of bounded policy variants, (c) expose an
operator selector, and (d) thread the selected policy id through the bootstrap
source into ranking weights.

## 3. Goal / Acceptance Criteria

Goal: close F-10 by adding an operator-switchable handover policy surface that
alters bounded decision behavior, report state, and visible reason codes
without crossing the bounded-proxy truth boundary.

F-10 closed requires:

1. A repo-owned `HandoverPolicyId` enum with at least 3 bounded policy
   variants.
2. A selector control in the Operator HUD control row that lets the operator
   switch policy at runtime.
3. Selection deterministically changes ranking weights / tie-break logic /
   reason-code emission inside `handover-decision`.
4. `HandoverDecisionReport` exposes the active `policyId` and `policyLabel`.
5. The Operator HUD Handover Decision panel shows the active policy label.
6. Replay (real-time and prerecorded) preserves the active policy id.
7. Provenance copy still says `bounded-proxy`; no live RF / network control
   claim.
8. Smoke and screenshot evidence prove the selector mounts, switching alters
   decision state, and forbidden claims are absent.

## 4. Scope / Non-Goals

In scope for future implementation:

- policy descriptor contract widening inside `handover-decision`;
- minimal bounded policy variants (see §6 Phase 1 inventory);
- operator selector control + ARIA + keyboard;
- bootstrap source rewiring to consume selected policy id;
- report state widening to expose active policy;
- smoke + screenshot evidence + forbidden-claim scan;
- copy updates to Handover Decision panel.

Non-goals:

- no F-09 communication-rate visualization;
- no F-11 rule editor (policy variants are predefined enums in F-10);
- no F-16 export workflow changes beyond automatic inclusion of new
  `policyId` field;
- no F-13 `>=500 LEO` scale work;
- no live RF / network controller claim;
- no measured-truth decision metric;
- no V4.11 scene rewrite;
- no scenario-pair-specific policy override;
- no per-orbit-class policy override (defer to F-11).

## 5. Forbidden Claims

- `live network control`
- `live RF handover`
- `policy applied to real satellite`
- `policy verified by iperf/ping`
- `production handover controller`
- `policy ratified by ITRI`
- `policy meets 3GPP specification`
- `policy enforces operator SLA`
- `policy ensures `>=500 LEO` closure`
- `policy closes V-02..V-06 validation`

Allowed copy examples:

- `Bounded handover policy`
- `Service-layer decision policy`
- `Repo-owned proxy policy`
- `Modeled, not measured.`

## 6. Phase Plan

Phase count: **5 implementation phases**.

### Phase 1 — Policy Contract And Variant Inventory

Goal: lock the policy enum and per-variant weight schema.

Work:

- declare `HandoverPolicyId` enum in `src/features/handover-decision/`;
- define `HandoverPolicyDescriptor`:
  - `id: HandoverPolicyId`
  - `label: string` (operator-visible)
  - `summary: string` (1 short sentence, bounded-proxy)
  - `weights: { latencyMs: number; jitterMs: number; networkSpeedMbps: number }`
  - `tieBreak: ReadonlyArray<"latency" | "jitter" | "speed" | "stable-serving">`
- ship at least 3 default variants:
  - `bootstrap-balanced-v1` — current behavior preserved
  - `bootstrap-latency-priority-v1` — latency weight highest
  - `bootstrap-throughput-priority-v1` — networkSpeed weight highest
- decide rank-evaluator signature:
  `evaluate(candidates, policy): HandoverDecisionState`;
- audit existing rank logic in
  `src/features/handover-decision/handover-decision.ts:240-290` (highestNetworkSpeed
  region) to ensure refactor is contract-preserving.

Reconciliation:

- contract-only TS change; no runtime mounting yet;
- confirm existing report fields are widened, not replaced.

### Phase 2 — Bootstrap Source Rewiring

Goal: thread the selected policy id through bootstrap source into ranking.

Work:

- add policy id input to `bootstrap-handover-decision-source.ts` factory;
- default = `bootstrap-balanced-v1`;
- pass selected policy descriptor into the rank evaluator;
- keep `HANDOVER_DECISION_PROXY_PROVENANCE = "bounded-proxy"` unchanged.

Reconciliation:

- decision state continues to refresh when scenario or replay changes;
- switching policy id deterministically alters ranking output without
  triggering rebuild loops.

### Phase 3 — Operator Selector Control

Goal: mount the operator selector in the existing HUD control row.

Work:

- add a `<select>` (or accessible disclosure listbox) labeled
  `Handover Policy` after `Replay Speed`;
- options sourced from `HandoverPolicyDescriptor[]`;
- selection writes to repo-owned operator state and triggers source rebuild;
- visible focus indicator; keyboard reachable; `aria-label` and option text
  identical;
- selection persists across replay mode change within the session.

Reconciliation:

- selector does not alter scenario/replay/scene state;
- changing policy emits a single decision refresh, not a render storm.

### Phase 4 — Panel + Report Widening + Forbidden-Claim Scan

Goal: surface active policy and prove truth boundary.

Work:

- Handover Decision panel renders `Policy: <label>` row above `Provenance`;
- `HandoverDecisionReport` adds `policyId`, `policyLabel`, `policySummary`;
- F-16 export bundle automatically picks up the new fields (no F-16 change);
- run forbidden-claim scan against DOM and report bytes;
- ensure scenario/replay/policy combinatorics do not regress existing smoke.

Reconciliation:

- bounded-proxy provenance still emitted;
- no live RF claim copy added anywhere;
- selector reachable via keyboard and screen reader.

### Phase 5 — Validation And Close-Out

Goal: prove F-10 ready to mark closed.

Work:

- focused smoke: selector mounts, default = balanced, switching alters
  `data-handover-policy-id`, reports include policy fields;
- screenshot evidence: HUD with each of the 3 policies selected;
- no console error;
- close-out note records selected variants, weight tables, smoke selectors.

Reconciliation:

- confirm only F-10 is claimed;
- confirm F-09 / F-11 / F-13 / F-16 untouched.

## 7. Skill Use Plan

Required queries to run during planning/Phase 1:

```bash
python3 /home/u24/.codex/skills/ui-ux-pro-max/scripts/search.py \
  "select dropdown listbox accessible label" --domain ux
python3 /home/u24/.codex/skills/ui-ux-pro-max/scripts/search.py \
  "policy selector dashboard control" --domain ux
```

Apply ARIA, focus, keyboard navigation, and disabled-state guidance from
results during Phase 3. Apply `frontend-ui-engineering` focused-component +
simple state ownership during Phase 2-3.

## 8. V4.11 Entanglement Check

Assessment: **independent**.

- V4.11 ground-station scene does not mount the Operator HUD; the policy
  selector lives only in the Phase 6 acceptance route.
- V4.11 disabled-tile copy may be updated post-F-10 in a separate hookpoint
  copy slice if planning/control wants. Not required for F-10 closure.

## 9. Open Questions For Planning / Control

1. Should the 3 default variants be the canonical ITRI deliverable set, or
   should one variant name reference a specific ITRI test case?
2. Should policy id persist across page reload (localStorage), or reset to
   `bootstrap-balanced-v1` each session?
3. Should switching policy emit a polite live-region announcement
   (`Policy changed to <label>.`), or remain silent?
4. Should tie-break rule order be exposed in the panel, or only inside the
   exported report?
5. Should F-10 also widen `HandoverCandidateReason` with a new
   `policy-weighted-override` reason code, or keep existing reasons?

## 10. Acceptance Gates

- Selector keyboard order + focus + ARIA correct.
- Policy-switching deterministically alters at least one ranking outcome in
  smoke fixtures.
- `HandoverDecisionReport.policyId` present in JSON export.
- Forbidden-claim scan green.
- Screenshot evidence shows each variant active.
- Bounded-proxy provenance unchanged.

## 11. Open After Planning SDD

- exact tie-break rule ordering per variant;
- whether `stable-serving` tie-break needs a stickiness threshold;
- selector placement: inline next to Replay Speed, or stacked under it;
- whether the panel shows policy summary text or only label;
- whether to expose a `Reset to default` affordance.
