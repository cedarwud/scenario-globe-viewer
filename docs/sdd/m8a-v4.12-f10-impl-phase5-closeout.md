# M8A V4.12 F-10 Implementation Phase 5 Close-Out

Date: 2026-05-12
Working phase name: **M8A V4.12 ITRI must-have followup**.

Status: F-10 implementation close-out for the bounded operator-switchable
handover policy selector. Scope is F-10 only.

## 1. Closed Capability

F-10 now exposes a repo-owned, operator-switchable handover policy selector in
the bootstrap Operator HUD. The selected policy is threaded through operator
state, bootstrap handover-decision source resolution, bounded ranking, panel
readout, document telemetry, and `HandoverDecisionReport`.

The truth boundary remains `bounded-proxy`. This work does not claim real radio
switching, runtime network control, measured traffic truth, external validation
closure, F-11 arbitrary rule editing, F-13 scale closure, or F-16 export
workflow changes.

## 2. Locked Variants

| Policy id | Operator label | Weights | Tie-break |
|---|---|---|---|
| `bootstrap-balanced-v1` | Balanced handover policy | latency `1`, jitter `1`, speed `1` | latency, jitter, speed, stable-serving |
| `bootstrap-latency-priority-v1` | Latency priority policy | latency `3`, jitter `1`, speed `1` | latency, jitter, stable-serving, speed |
| `bootstrap-throughput-priority-v1` | Throughput priority policy | latency `1`, jitter `1`, speed `3` | speed, latency, jitter, stable-serving |

Session behavior:

- default: `bootstrap-balanced-v1`;
- preserved across scenario, replay mode, replay speed, and replay-clock
  updates in the same page session;
- reset on full page reload;
- no `localStorage`, cookie, query-param, or external persistence.

## 3. Runtime Selectors And Report Fields

Operator HUD selectors:

- `[data-operator-control="handover-policy"]`
- `[data-operator-policy-status="true"]`
- `[data-operator-hud="bootstrap"][data-handover-policy-id]`

Handover Decision panel selectors:

- `[data-handover-field="policy"]`
- `[data-handover-decision-panel="bootstrap"][data-handover-policy-id]`
- `[data-handover-decision-panel="bootstrap"][data-handover-policy-label]`
- `[data-handover-decision-panel="bootstrap"][data-handover-policy-tie-break]`

Report fields:

- `HandoverDecisionReport.policyId`
- `HandoverDecisionReport.policyLabel`
- `HandoverDecisionReport.policySummary`
- `HandoverDecisionReport.policyTieBreak`
- `HandoverDecisionSnapshot.policyLabel`
- `HandoverDecisionSnapshot.policySummary`
- `HandoverDecisionSnapshot.policyTieBreak`

New reason code:

- `policy-weighted-override`, emitted only when a non-balanced policy selects a
  different best candidate than balanced policy ranking would select.

## 4. Evidence

Commands run:

```bash
npm run build
node scripts/verify-m8a-v4.12-f10-handover-policy-selector.mjs
node tests/smoke/verify-m8a-v4.12-f10-handover-policy-selector-runtime.mjs
npm run test:phase6.4
```

Focused contract result:

```text
balancedServing=candidate-latency
throughputServing=candidate-throughput
throughputReasons=network-speed-better,policy-weighted-override
```

Runtime smoke artifact:

```text
output/m8a-v4.12-f10-policy-selector/f10-policy-selector-smoke.json
```

Screenshot evidence:

```text
output/m8a-v4.12-f10-policy-selector/desktop-1440x900-bootstrap-balanced-v1.png
output/m8a-v4.12-f10-policy-selector/desktop-1440x900-bootstrap-latency-priority-v1.png
output/m8a-v4.12-f10-policy-selector/desktop-1440x900-bootstrap-throughput-priority-v1.png
```

The browser smoke confirms:

- selector mounts with visible label and `aria-label="Handover Policy"`;
- all three variants are selectable;
- the Handover Decision panel shows the active policy label;
- `HandoverDecisionReport.policyId` and companion policy fields are present;
- selected policy persists across prerecorded mode and site-scenario switch;
- polite live-region announcement emits `Policy changed to <label>.`;
- F-10 §5 forbidden-claim scan is green;
- no runtime/console errors were captured.

## 5. Scope Confirmation

Touched implementation surfaces are the F-10 handover-policy selector,
bounded decision evaluator, bootstrap source/controller threading, Operator HUD
control row, Handover Decision panel/report widening, and F-10 verification.

No F-09 communication-rate visualization, F-11 rule editor, F-13 LEO-scale
runtime, or F-16 export workflow implementation is included in this close-out.
